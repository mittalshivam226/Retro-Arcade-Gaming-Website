import React, { useState, useEffect, useRef, useCallback } from 'react';

interface AsteroidsGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;

interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

interface BulletState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  life: number;
}

interface AsteroidState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  size: number;
  id: number;
}

const AsteroidsGame: React.FC<AsteroidsGameProps> = ({ onScoreChange, gameState }) => {
  const [ship, setShip] = useState<ShipState>({ x: 200, y: 200, vx: 0, vy: 0, rotation: 0 });
  const [bullets, setBullets] = useState<BulletState[]>([]);
  const [asteroids, setAsteroids] = useState<AsteroidState[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Use refs so game loop always reads fresh values
  const shipRef = useRef(ship);
  const asteroidsRef = useRef(asteroids);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const thrustRef = useRef(false);
  const bulletIdRef = useRef(0);
  const asteroidIdRef = useRef(100);
  const invincibleRef = useRef(false); // Brief invincibility after hit

  shipRef.current = ship;
  asteroidsRef.current = asteroids;
  scoreRef.current = score;
  livesRef.current = lives;

  // Initialize asteroids
  useEffect(() => {
    const initial: AsteroidState[] = [];
    for (let i = 0; i < 5; i++) {
      // Spawn away from center
      const angle = (i / 5) * Math.PI * 2;
      initial.push({
        x: 200 + Math.cos(angle) * 150,
        y: 200 + Math.sin(angle) * 150,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        rotation: Math.random() * 360,
        size: 3,
        id: i
      });
    }
    setAsteroids(initial);
    asteroidIdRef.current = 10;
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setShip(prev => ({ ...prev, rotation: prev.rotation - 6 }));
        break;
      case 'ArrowRight':
        setShip(prev => ({ ...prev, rotation: prev.rotation + 6 }));
        break;
      case 'ArrowUp':
        thrustRef.current = true;
        break;
      case ' ': {
        event.preventDefault();
        const s = shipRef.current;
        const angle = (s.rotation - 90) * (Math.PI / 180);
        const id = bulletIdRef.current++;
        setBullets(prev => [...prev, {
          x: s.x, y: s.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          id,
          life: 55
        }]);
        break;
      }
    }
  }, [gameState, gameOver]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp') thrustRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Game loop — minimal deps, everything via refs
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      // Update ship
      setShip(prev => {
        let vx = prev.vx;
        let vy = prev.vy;

        if (thrustRef.current) {
          const angle = (prev.rotation - 90) * (Math.PI / 180);
          vx += Math.cos(angle) * 0.25;
          vy += Math.sin(angle) * 0.25;
          // Cap speed
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > 6) { vx = (vx / speed) * 6; vy = (vy / speed) * 6; }
        }

        // Friction
        vx *= 0.99;
        vy *= 0.99;

        return {
          ...prev,
          x: (prev.x + vx + GAME_WIDTH) % GAME_WIDTH,
          y: (prev.y + vy + GAME_HEIGHT) % GAME_HEIGHT,
          vx, vy
        };
      });

      // Update bullets
      setBullets(prev =>
        prev
          .map(b => ({
            ...b,
            x: (b.x + b.vx + GAME_WIDTH) % GAME_WIDTH,
            y: (b.y + b.vy + GAME_HEIGHT) % GAME_HEIGHT,
            life: b.life - 1
          }))
          .filter(b => b.life > 0)
      );

      // Update asteroids
      setAsteroids(prev =>
        prev.map(a => ({
          ...a,
          x: (a.x + a.vx + GAME_WIDTH) % GAME_WIDTH,
          y: (a.y + a.vy + GAME_HEIGHT) % GAME_HEIGHT,
          rotation: a.rotation + 1
        }))
      );

      // Bullet-asteroid collision
      setBullets(prevBullets => {
        const toRemoveBullets = new Set<number>();
        const toSplitAsteroids: AsteroidState[] = [];
        const toRemoveAsteroidIds = new Set<number>();

        setAsteroids(prevAsteroids => {
          for (const asteroid of prevAsteroids) {
            for (const bullet of prevBullets) {
              if (toRemoveBullets.has(bullet.id) || toRemoveAsteroidIds.has(asteroid.id)) continue;

              const dx = bullet.x - asteroid.x;
              const dy = bullet.y - asteroid.y;
              if (Math.sqrt(dx * dx + dy * dy) < asteroid.size * 10) {
                toRemoveBullets.add(bullet.id);
                toRemoveAsteroidIds.add(asteroid.id);

                // Score based on size
                const points = (4 - asteroid.size) * 20;
                const newScore = scoreRef.current + points;
                scoreRef.current = newScore;
                setScore(newScore);
                onScoreChange(newScore);

                // Split if large enough
                if (asteroid.size > 1) {
                  const id1 = asteroidIdRef.current++;
                  const id2 = asteroidIdRef.current++;
                  toSplitAsteroids.push(
                    { ...asteroid, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, size: asteroid.size - 1, id: id1 },
                    { ...asteroid, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, size: asteroid.size - 1, id: id2 }
                  );
                }
              }
            }
          }

          const remaining = prevAsteroids.filter(a => !toRemoveAsteroidIds.has(a.id));
          return [...remaining, ...toSplitAsteroids];
        });

        return prevBullets.filter(b => !toRemoveBullets.has(b.id));
      });

      // Ship-asteroid collision
      if (!invincibleRef.current) {
        const s = shipRef.current;
        const hit = asteroidsRef.current.some(a => {
          const dx = s.x - a.x;
          const dy = s.y - a.y;
          return Math.sqrt(dx * dx + dy * dy) < a.size * 10;
        });

        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) {
            setGameOver(true);
          } else {
            setShip({ x: 200, y: 200, vx: 0, vy: 0, rotation: 0 });
            invincibleRef.current = true;
            setTimeout(() => { invincibleRef.current = false; }, 2000);
          }
        }
      }
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]); // ✅ No ship/asteroids/score in deps

  const getAsteroidChar = (size: number) =>
    size === 3 ? '🪨' : size === 2 ? '⬟' : '∙';

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Stars */}
      <div className="absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-50"
            style={{ left: `${(i * 37 + 7) % 100}%`, top: `${(i * 73 + 13) % 100}%` }}
          />
        ))}
      </div>

      {/* Ship */}
      <div
        className="absolute text-xl"
        style={{
          left: ship.x - 10,
          top: ship.y - 10,
          transform: `rotate(${ship.rotation}deg)`,
          opacity: invincibleRef.current ? 0.5 : 1
        }}
      >
        {thrustRef.current ? '🚀' : '🔺'}
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-2 h-2 bg-white rounded-full"
          style={{ left: bullet.x - 1, top: bullet.y - 1 }}
        />
      ))}

      {/* Asteroids */}
      {asteroids.map(asteroid => (
        <div
          key={asteroid.id}
          className="absolute text-gray-300"
          style={{
            left: asteroid.x - asteroid.size * 8,
            top: asteroid.y - asteroid.size * 8,
            fontSize: `${asteroid.size * 16}px`,
            transform: `rotate(${asteroid.rotation}deg)`
          }}
        >
          {getAsteroidChar(asteroid.size)}
        </div>
      ))}

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-xs">
        LIVES: {'❤️'.repeat(Math.max(0, lives))} | SCORE: {score}
      </div>
      <div className="absolute bottom-2 left-2 text-white text-xs">
        ←→: Rotate | ↑: Thrust | SPACE: Shoot
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
          <div className="text-white text-lg">Final Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default AsteroidsGame;