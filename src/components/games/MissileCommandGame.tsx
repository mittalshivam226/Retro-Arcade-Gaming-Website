import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MissileCommandGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

interface Missile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  id: number;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  id: number;
  maxRadius: number;
}

const MissileCommandGame: React.FC<MissileCommandGameProps> = ({ onScoreChange, gameState }) => {
  const [cities, setCities] = useState(
    Array.from({ length: 6 }, (_, i) => ({ x: i * 60 + 30, destroyed: false }))
  );
  const [missiles, setMissiles] = useState<Missile[]>([]);
  const [playerMissiles, setPlayerMissiles] = useState<Missile[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [wave, setWave] = useState(1);

  const missileIdRef = useRef(0);
  const scoreRef = useRef(score);
  const citiesRef = useRef(cities);
  const waveRef = useRef(wave);

  scoreRef.current = score;
  citiesRef.current = cities;
  waveRef.current = wave;

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || gameOver) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const targetX = event.clientX - rect.left;
    const targetY = event.clientY - rect.top;

    const id = missileIdRef.current++;
    setPlayerMissiles(prev => [...prev, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 20,
      targetX,
      targetY,
      id
    }]);
  }, [gameState, gameOver]);

  // Spawn enemy missiles at increasing rate per wave
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const rate = Math.max(800, 3000 - waveRef.current * 400);
    const spawnInterval = setInterval(() => {
      const alive = citiesRef.current.filter(c => !c.destroyed);
      if (alive.length === 0) return;

      if (Math.random() < 0.6) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        const id = missileIdRef.current++;
        setMissiles(prev => [...prev, {
          x: Math.random() * GAME_WIDTH,
          y: 0,
          targetX: target.x,
          targetY: GAME_HEIGHT - 20,
          id
        }]);
      }
    }, rate);

    return () => clearInterval(spawnInterval);
  }, [gameState, gameOver, wave]);

  // Game loop — no missiles/explosions/score in deps (use functional updates)
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const moveToward = (missile: Missile, speed: number): Missile => {
      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < speed) return { ...missile, x: missile.targetX, y: missile.targetY };
      return {
        ...missile,
        x: missile.x + (dx / dist) * speed,
        y: missile.y + (dy / dist) * speed
      };
    };

    const reachedTarget = (m: Missile, tolerance = 6): boolean =>
      Math.abs(m.x - m.targetX) < tolerance && Math.abs(m.y - m.targetY) < tolerance;

    const gameLoop = setInterval(() => {
      // Move enemy missiles
      setMissiles(prev => {
        const arrived: Missile[] = [];
        const moving = prev
          .map(m => moveToward(m, 1.5))
          .filter(m => {
            if (reachedTarget(m)) { arrived.push(m); return false; }
            return true;
          });

        // Destroy cities hit by enemy missiles
        if (arrived.length > 0) {
          setCities(prevCities => {
            const updated = prevCities.map(city => {
              const hit = arrived.some(m => Math.abs(m.targetX - city.x) < 30);
              return hit ? { ...city, destroyed: true } : city;
            });
            const allDestroyed = updated.every(c => c.destroyed);
            if (allDestroyed) setGameOver(true);
            return updated;
          });

          // Explosion at city
          arrived.forEach(m => {
            const id = missileIdRef.current++;
            setExplosions(prev => [...prev, { x: m.targetX, y: m.targetY, radius: 5, id, maxRadius: 30 }]);
          });
        }

        return moving;
      });

      // Move player missiles
      setPlayerMissiles(prev => {
        const arrived: Missile[] = [];
        const moving = prev
          .map(m => moveToward(m, 5))
          .filter(m => {
            if (reachedTarget(m)) { arrived.push(m); return false; }
            return true;
          });

        // Create explosions for player missiles
        arrived.forEach(m => {
          const id = missileIdRef.current++;
          setExplosions(prev => [...prev, { x: m.targetX, y: m.targetY, radius: 5, id, maxRadius: 50 }]);
        });

        return moving;
      });

      // Expand explosions
      setExplosions(prev =>
        prev.map(e => ({ ...e, radius: e.radius + 3 }))
            .filter(e => e.radius < e.maxRadius)
      );

      // Check if player explosions destroy enemy missiles
      setExplosions(prevExplosions => {
        const playerExplosions = prevExplosions.filter(e => e.maxRadius > 30);

        setMissiles(prevMissiles =>
          prevMissiles.filter(missile => {
            const destroyed = playerExplosions.some(explosion => {
              const dx = explosion.x - missile.x;
              const dy = explosion.y - missile.y;
              return Math.sqrt(dx * dx + dy * dy) < explosion.radius;
            });

            if (destroyed) {
              const newScore = scoreRef.current + 25;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreChange(newScore);
            }

            return !destroyed;
          })
        );

        return prevExplosions;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]);

  // Wave progression — every 30 seconds
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const waveTimer = setInterval(() => {
      setWave(prev => {
        const next = prev + 1;
        const bonus = 500;
        const newScore = scoreRef.current + bonus;
        scoreRef.current = newScore;
        setScore(newScore);
        onScoreChange(newScore);
        return next;
      });
    }, 30000);

    return () => clearInterval(waveTimer);
  }, [gameState, gameOver, onScoreChange]);

  return (
    <div
      className="relative bg-black cursor-crosshair"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      onClick={handleClick}
    >
      {/* Star field */}
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="absolute w-px h-px bg-white"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 73) % 80}%` }}
        />
      ))}

      {/* Cities */}
      {cities.map((city, index) => (
        <div
          key={index}
          className="absolute text-xl"
          style={{ left: city.x - 12, bottom: 12 }}
        >
          {city.destroyed ? '💥' : '🏢'}
        </div>
      ))}

      {/* Enemy missiles */}
      {missiles.map(missile => (
        <div
          key={missile.id}
          className="absolute w-1 h-4 bg-red-500"
          style={{ left: missile.x - 0.5, top: missile.y }}
        />
      ))}

      {/* Player missiles */}
      {playerMissiles.map(missile => (
        <div
          key={missile.id}
          className="absolute w-1 h-3 bg-green-400"
          style={{ left: missile.x - 0.5, top: missile.y }}
        />
      ))}

      {/* Explosions */}
      {explosions.map(exp => (
        <div
          key={exp.id}
          className="absolute rounded-full border-2 border-yellow-400 bg-yellow-400 opacity-60"
          style={{
            left: exp.x - exp.radius,
            top: exp.y - exp.radius,
            width: exp.radius * 2,
            height: exp.radius * 2
          }}
        />
      ))}

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-900 border-t border-green-600" />

      {/* Launch base */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-gray-400 rounded" />

      {/* UI */}
      <div className="absolute top-2 left-2 text-green-400 text-xs">
        SCORE: {score} | WAVE: {wave}
      </div>
      <div className="absolute top-2 right-2 text-green-400 text-xs">
        CLICK to fire
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">ALL CITIES DESTROYED</div>
          <div className="text-white text-lg">Score: {score} | Wave: {wave}</div>
        </div>
      )}
    </div>
  );
};

export default MissileCommandGame;