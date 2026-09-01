import React, { useState, useEffect, useRef, useCallback } from 'react';

interface RobotronGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

interface Robot {
  x: number;
  y: number;
  id: number;
  type: 'grunt' | 'electrode' | 'hulk';
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
}

interface Human {
  x: number;
  y: number;
  saved: boolean;
  id: number;
}

const RobotronGame: React.FC<RobotronGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 200, y: 150 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [humans, setHumans] = useState<Human[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [wave, setWave] = useState(1);

  const scoreRef = useRef(score);
  const playerRef = useRef(playerPos);
  const livesRef = useRef(lives);
  const waveRef = useRef(wave);
  const bulletIdRef = useRef(0);
  const robotIdRef = useRef(0);
  const humanIdRef = useRef(0);
  const shootDirRef = useRef({ vx: 5, vy: 0 }); // Last shoot direction

  scoreRef.current = score;
  playerRef.current = playerPos;
  livesRef.current = lives;
  waveRef.current = wave;

  const spawnWave = useCallback((waveNum: number) => {
    const count = 4 + waveNum * 2;
    const newRobots: Robot[] = [];
    for (let i = 0; i < count; i++) {
      const types: Robot['type'][] = ['grunt', waveNum > 1 ? 'electrode' : 'grunt', waveNum > 3 ? 'hulk' : 'grunt'];
      newRobots.push({
        x: Math.random() > 0.5 ? Math.random() * 60 + 10 : Math.random() * 60 + GAME_WIDTH - 70,
        y: Math.random() * (GAME_HEIGHT - 40) + 20,
        id: robotIdRef.current++,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
    setRobots(newRobots);

    const newHumans: Human[] = [];
    for (let i = 0; i < Math.min(5, 3 + waveNum); i++) {
      newHumans.push({
        x: Math.random() * (GAME_WIDTH - 40) + 20,
        y: Math.random() * (GAME_HEIGHT - 40) + 20,
        saved: false,
        id: humanIdRef.current++
      });
    }
    setHumans(newHumans);
  }, []);

  useEffect(() => {
    spawnWave(1);
  }, [spawnWave]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    const speed = 4;

    switch (event.key) {
      // WASD — move
      case 'w': case 'W': setPlayerPos(prev => ({ ...prev, y: Math.max(10, prev.y - speed) })); break;
      case 's': case 'S': setPlayerPos(prev => ({ ...prev, y: Math.min(GAME_HEIGHT - 20, prev.y + speed) })); break;
      case 'a': case 'A': setPlayerPos(prev => ({ ...prev, x: Math.max(10, prev.x - speed) })); break;
      case 'd': case 'D': setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 20, prev.x + speed) })); break;

      // Arrow keys — shoot in direction
      case 'ArrowUp':    shootDirRef.current = { vx: 0, vy: -6 }; break;
      case 'ArrowDown':  shootDirRef.current = { vx: 0, vy: 6 };  break;
      case 'ArrowLeft':  shootDirRef.current = { vx: -6, vy: 0 }; break;
      case 'ArrowRight': shootDirRef.current = { vx: 6, vy: 0 };  break;

      // Space — shoot in last direction
      case ' ': {
        const dir = shootDirRef.current;
        const id = bulletIdRef.current++;
        setBullets(prev => [...prev, {
          x: playerRef.current.x + 10,
          y: playerRef.current.y + 10,
          vx: dir.vx,
          vy: dir.vy,
          id
        }]);
        break;
      }
    }

    // Arrow keys also auto-shoot
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const dir = shootDirRef.current;
      const id = bulletIdRef.current++;
      setBullets(prev => [...prev, {
        x: playerRef.current.x + 10,
        y: playerRef.current.y + 10,
        vx: dir.vx,
        vy: dir.vy,
        id
      }]);
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

      // Move bullets
      setBullets(prev =>
        prev.map(b => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
            .filter(b => b.x > -5 && b.x < GAME_WIDTH + 5 && b.y > -5 && b.y < GAME_HEIGHT + 5)
      );

      // Move robots toward player
      setRobots(prev =>
        prev.map(robot => {
          if (robot.type === 'electrode') return robot; // Electrodes don't move
          const dx = player.x - robot.x;
          const dy = player.y - robot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = robot.type === 'hulk' ? 0.5 : 1;
          if (dist < 1) return robot;
          return {
            ...robot,
            x: robot.x + (dx / dist) * speed,
            y: robot.y + (dy / dist) * speed
          };
        })
      );

      // Bullet-robot collision
      setBullets(prevBullets => {
        const toRemove = new Set<number>();

        setRobots(prevRobots =>
          prevRobots.filter(robot => {
            if (robot.type === 'hulk') return true; // Hulks are immune to bullets
            const hit = prevBullets.find(
              b => !toRemove.has(b.id) && Math.abs(b.x - robot.x) < 16 && Math.abs(b.y - robot.y) < 16
            );
            if (hit) {
              toRemove.add(hit.id);
              const pts = robot.type === 'electrode' ? 250 : 75;
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

      // Player rescues humans
      setHumans(prev =>
        prev.map(human => {
          if (!human.saved && Math.abs(human.x - player.x) < 22 && Math.abs(human.y - player.y) < 22) {
            const newScore = scoreRef.current + 1000;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...human, saved: true };
          }
          return human;
        })
      );

      // Robot-player collision
      setRobots(prevRobots => {
        const hit = prevRobots.some(
          r => Math.abs(r.x - player.x) < 18 && Math.abs(r.y - player.y) < 18
        );
        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) setGameOver(true);
          else setPlayerPos({ x: 200, y: 150 });
        }
        return prevRobots;
      });

      // Wave cleared — spawn next
      setRobots(prevRobots => {
        if (prevRobots.length === 0) {
          const next = waveRef.current + 1;
          waveRef.current = next;
          setWave(next);
          const bonus = next * 1000;
          const newScore = scoreRef.current + bonus;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);
          spawnWave(next);
        }
        return prevRobots;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange, spawnWave]);

  return (
    <div className="relative bg-gray-900" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`v${i}`} className="absolute border-l border-cyan-500" style={{ left: i * 20, height: '100%' }} />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={`h${i}`} className="absolute border-t border-cyan-500" style={{ top: i * 20, width: '100%' }} />
        ))}
      </div>

      {/* Player */}
      <div
        className="absolute text-xl text-green-400 z-10"
        style={{ left: playerPos.x - 10, top: playerPos.y - 10 }}
      >
        🤖
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Robots */}
      {robots.map(robot => (
        <div
          key={robot.id}
          className="absolute text-lg"
          style={{ left: robot.x - 10, top: robot.y - 10 }}
        >
          {robot.type === 'hulk' ? '🦾' : robot.type === 'electrode' ? '⚡' : '🔴'}
        </div>
      ))}

      {/* Humans */}
      {humans.map(human => (
        <div
          key={human.id}
          className={`absolute text-sm ${human.saved ? 'text-green-400' : 'text-blue-400'}`}
          style={{ left: human.x - 8, top: human.y - 8 }}
        >
          {human.saved ? '✅' : '🧍'}
        </div>
      ))}

      {/* UI */}
      <div className="absolute top-2 left-2 text-cyan-400 text-xs">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))} | WAVE: {wave}
      </div>
      <div className="absolute bottom-2 left-2 text-cyan-400 text-xs">
        WASD: Move | Arrows: Shoot | SPACE: Shoot last dir
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

export default RobotronGame;