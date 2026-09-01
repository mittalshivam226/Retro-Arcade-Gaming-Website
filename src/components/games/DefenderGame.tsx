import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DefenderGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

interface Enemy {
  x: number;
  y: number;
  type: 'lander' | 'bomber' | 'mutant';
  id: number;
  vy: number;
  abducting: boolean;
}

interface Bullet {
  x: number;
  y: number;
  id: number;
}

interface Humanoid {
  x: number;
  y: number;
  beingAbducted: boolean;
}

const DefenderGame: React.FC<DefenderGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 150 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [humanoids, setHumanoids] = useState<Humanoid[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [wave, setWave] = useState(1);

  const scoreRef = useRef(score);
  const playerRef = useRef(playerPos);
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const livesRef = useRef(lives);
  const waveRef = useRef(wave);

  scoreRef.current = score;
  playerRef.current = playerPos;
  livesRef.current = lives;
  waveRef.current = wave;

  const spawnWave = useCallback((waveNum: number) => {
    const count = 3 + waveNum * 2;
    const newEnemies: Enemy[] = [];
    for (let i = 0; i < count; i++) {
      const types: Enemy['type'][] = ['lander', 'bomber', waveNum > 2 ? 'mutant' : 'lander'];
      newEnemies.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * 100 + 30,
        type: types[Math.floor(Math.random() * types.length)],
        id: enemyIdRef.current++,
        vy: 0,
        abducting: false
      });
    }
    setEnemies(newEnemies);

    const newHumanoids: Humanoid[] = [];
    for (let i = 0; i < 6; i++) {
      newHumanoids.push({
        x: i * 60 + 20,
        y: GAME_HEIGHT - 30,
        beingAbducted: false
      });
    }
    setHumanoids(newHumanoids);
  }, []);

  // Initialize
  useEffect(() => {
    spawnWave(1);
  }, [spawnWave]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - 6) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 6) }));
        break;
      case 'ArrowUp':
        setPlayerPos(prev => ({ ...prev, y: Math.max(0, prev.y - 6) }));
        break;
      case 'ArrowDown':
        setPlayerPos(prev => ({ ...prev, y: Math.min(GAME_HEIGHT - 30, prev.y + 6) }));
        break;
      case ' ': {
        const id = bulletIdRef.current++;
        setBullets(prev => [...prev, {
          x: playerRef.current.x + 20,
          y: playerRef.current.y + 10,
          id
        }]);
        break;
      }
    }
  }, [gameState, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      const player = playerRef.current;

      // Move bullets rightward
      setBullets(prev =>
        prev.map(b => ({ ...b, x: b.x + 8 })).filter(b => b.x < GAME_WIDTH)
      );

      // Move enemies
      setEnemies(prev =>
        prev.map(enemy => {
          const sinY = Math.sin(Date.now() / 1000 + enemy.id) * 0.5;
          return {
            ...enemy,
            x: (enemy.x - (enemy.type === 'mutant' ? 1.5 : 1) + GAME_WIDTH) % GAME_WIDTH,
            y: Math.max(10, Math.min(GAME_HEIGHT - 60, enemy.y + sinY))
          };
        })
      );

      // Bullet-enemy collision
      setBullets(prevBullets => {
        const toRemove = new Set<number>();

        setEnemies(prevEnemies =>
          prevEnemies.filter(enemy => {
            const hit = prevBullets.find(
              b =>
                !toRemove.has(b.id) &&
                Math.abs(b.x - enemy.x) < 22 &&
                Math.abs(b.y - enemy.y) < 18
            );
            if (hit) {
              toRemove.add(hit.id);
              const pts = enemy.type === 'mutant' ? 300 : enemy.type === 'bomber' ? 200 : 150;
              const newScore = scoreRef.current + pts;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreChange(newScore);
              return false;
            }
            return true;
          })
        );

        return prevBullets.filter(b => !toRemove.has(b.id));
      });

      // Check if player collides with enemy
      setEnemies(prevEnemies => {
        const hit = prevEnemies.some(
          e => Math.abs(e.x - player.x) < 25 && Math.abs(e.y - player.y) < 25
        );
        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) setGameOver(true);
          else setPlayerPos({ x: 50, y: 150 });
        }
        return prevEnemies;
      });

      // Check if wave is cleared
      setEnemies(prevEnemies => {
        if (prevEnemies.length === 0) {
          const nextWave = waveRef.current + 1;
          waveRef.current = nextWave;
          setWave(nextWave);
          const bonus = nextWave * 500;
          const newScore = scoreRef.current + bonus;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);
          spawnWave(nextWave);
        }
        return prevEnemies;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange, spawnWave]);

  return (
    <div
      className="relative"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'linear-gradient(180deg, #0d0221 0%, #1a044f 100%)' }}
    >
      {/* Stars */}
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full"
          style={{ left: `${(i * 37 + 5) % 100}%`, top: `${(i * 23 + 7) % 70}%`, width: 1, height: 1 }}
        />
      ))}

      {/* Player ship */}
      <div
        className="absolute text-xl z-10"
        style={{ left: playerPos.x, top: playerPos.y }}
      >
        🛸
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute h-1 bg-yellow-400 rounded"
          style={{ left: bullet.x, top: bullet.y, width: 8 }}
        />
      ))}

      {/* Enemies */}
      {enemies.map(enemy => (
        <div
          key={enemy.id}
          className="absolute text-lg"
          style={{ left: enemy.x, top: enemy.y }}
        >
          {enemy.type === 'mutant' ? '👾' : enemy.type === 'bomber' ? '💣' : '🔴'}
        </div>
      ))}

      {/* Humanoids */}
      {humanoids.map((h, i) => (
        <div
          key={i}
          className="absolute text-sm"
          style={{ left: h.x, top: h.y }}
        >
          🧑
        </div>
      ))}

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-900 border-t border-green-600" />

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-xs">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))} | WAVE: {wave}
      </div>
      <div className="absolute bottom-2 left-2 text-white text-xs">
        Arrows: Move | SPACE: Shoot
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
          <div className="text-white text-lg">Score: {score} | Wave: {wave}</div>
        </div>
      )}
    </div>
  );
};

export default DefenderGame;