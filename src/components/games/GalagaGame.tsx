import React, { useState, useEffect, useRef, useCallback } from 'react';

interface GalagaGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

// Static stars — computed once to avoid re-randomizing every render
const STARS = Array.from({ length: 80 }, (_, i) => ({
  left: `${(i * 37 + 5) % 100}%`,
  top: `${(i * 73 + 11) % 100}%`,
  size: i % 3 === 0 ? 2 : 1,
  delay: `${(i * 0.15) % 2}s`
}));

interface Enemy {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  type: 'galaga' | 'bee';
  alive: boolean;
  id: number;
  diving: boolean;
  diveAngle: number;
}

const GalagaGame: React.FC<GalagaGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState(GAME_WIDTH / 2);
  const [bullets, setBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const scoreRef = useRef(score);
  const playerPosRef = useRef(playerPos);
  const livesRef = useRef(lives);
  const bulletIdRef = useRef(0);
  const enemyBulletIdRef = useRef(1000);

  scoreRef.current = score;
  playerPosRef.current = playerPos;
  livesRef.current = lives;

  // Initialize enemies in formation
  useEffect(() => {
    const initialEnemies: Enemy[] = [];
    let id = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        const bx = col * 44 + 30;
        const by = row * 35 + 40;
        initialEnemies.push({
          x: bx, y: by,
          baseX: bx, baseY: by,
          type: row < 2 ? 'galaga' : 'bee',
          alive: true,
          id: id++,
          diving: false,
          diveAngle: 0
        });
      }
    }
    setEnemies(initialEnemies);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => Math.max(20, prev - 8));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => Math.min(GAME_WIDTH - 20, prev + 8));
        break;
      case ' ': {
        const id = bulletIdRef.current++;
        setBullets(prev => [...prev, { x: playerPosRef.current, y: GAME_HEIGHT - 70, id }]);
        break;
      }
    }
  }, [gameState, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Enemy shooting
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const shootInterval = setInterval(() => {
      setEnemies(prev => {
        const alive = prev.filter(e => e.alive);
        if (alive.length === 0) return prev;
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        const id = enemyBulletIdRef.current++;
        setEnemyBullets(eb => [...eb, { x: shooter.x + 10, y: shooter.y + 20, id }]);
        return prev;
      });
    }, 2000);

    return () => clearInterval(shootInterval);
  }, [gameState, gameOver]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    let frameCount = 0;

    const gameLoop = setInterval(() => {
      frameCount++;

      // Move player bullets upward
      setBullets(prev =>
        prev.map(b => ({ ...b, y: b.y - 8 })).filter(b => b.y > 0)
      );

      // Move enemy bullets downward
      setEnemyBullets(prev =>
        prev.map(b => ({ ...b, y: b.y + 4 })).filter(b => b.y < GAME_HEIGHT)
      );

      // Animate enemies — formation swaying + occasional dive
      setEnemies(prev => {
        const time = frameCount * 0.05;
        return prev.map(enemy => {
          if (!enemy.alive) return enemy;

          // Formation oscillation — bounded, no drift
          const newX = enemy.baseX + Math.sin(time + enemy.id * 0.5) * 25;
          const newY = enemy.baseY + Math.sin(time * 0.5 + enemy.id * 0.3) * 8;

          return { ...enemy, x: newX, y: newY };
        });
      });

      // Bullet-enemy collision
      setBullets(prevBullets => {
        const toRemove = new Set<number>();

        setEnemies(prevEnemies =>
          prevEnemies.map(enemy => {
            if (!enemy.alive) return enemy;
            const hit = prevBullets.find(
              b =>
                !toRemove.has(b.id) &&
                Math.abs(b.x - enemy.x - 10) < 20 &&
                Math.abs(b.y - enemy.y - 10) < 20
            );
            if (hit) {
              toRemove.add(hit.id);
              const points = enemy.type === 'galaga' ? 50 : 30;
              const newScore = scoreRef.current + points;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreChange(newScore);
              return { ...enemy, alive: false };
            }
            return enemy;
          })
        );

        return prevBullets.filter(b => !toRemove.has(b.id));
      });

      // Enemy bullet-player collision
      setEnemyBullets(prevBullets => {
        const hit = prevBullets.some(
          b => Math.abs(b.x - playerPosRef.current) < 20 && b.y >= GAME_HEIGHT - 90
        );
        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) setGameOver(true);
        }
        return prevBullets;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]);

  const getEnemySprite = (type: Enemy['type']) => type === 'galaga' ? '🛸' : '🐝';

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Static stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full opacity-60"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay
          }}
        />
      ))}

      {/* Player */}
      <div className="absolute text-2xl" style={{ left: playerPos - 15, bottom: 20 }}>
        🚀
      </div>

      {/* Player bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-1 h-4 bg-yellow-400"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Enemy bullets */}
      {enemyBullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-1 h-4 bg-red-500"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Enemies */}
      {enemies.map(enemy =>
        enemy.alive && (
          <div
            key={enemy.id}
            className="absolute text-xl"
            style={{ left: enemy.x, top: enemy.y }}
          >
            {getEnemySprite(enemy.type)}
          </div>
        )
      )}

      {/* UI */}
      <div className="absolute top-2 left-2 text-yellow-400 text-xs">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))}
      </div>
      <div className="absolute bottom-2 left-2 text-yellow-400 text-xs">
        ←→: Move | SPACE: Shoot
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

export default GalagaGame;