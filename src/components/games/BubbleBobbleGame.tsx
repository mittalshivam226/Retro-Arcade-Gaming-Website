import React, { useState, useEffect, useRef, useCallback } from 'react';

interface BubbleBobbleGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const GRAVITY = 0.4;
const MAX_FALL = 8;

interface BubbleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  floating: boolean; // once bubble slows it floats
}

interface EnemyState {
  x: number;
  y: number;
  trapped: boolean;
  id: number;
  vx: number;
}

const PLATFORMS = [
  { x: 0,   y: 280, width: GAME_WIDTH },
  { x: 50,  y: 220, width: 100 },
  { x: 250, y: 180, width: 100 },
  { x: 100, y: 140, width: 150 },
  { x: 300, y: 100, width: 100 }
];

const BubbleBobbleGame: React.FC<BubbleBobbleGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 240 });
  const [playerVy, setPlayerVy] = useState(0);
  const [isOnGround, setIsOnGround] = useState(false);
  const [bubbles, setBubbles] = useState<BubbleState[]>([]);
  const [enemies, setEnemies] = useState<EnemyState[]>([
    { x: 300, y: 200, trapped: false, id: 0, vx: 1.2 },
    { x: 150, y: 120, trapped: false, id: 1, vx: -1 },
    { x: 320, y: 80,  trapped: false, id: 2, vx: 1.5 }
  ]);
  const [score, setScore] = useState(0);
  const [bubbleId, setBubbleId] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [facingRight, setFacingRight] = useState(true);

  const playerRef = useRef(playerPos);
  const playerVyRef = useRef(playerVy);
  const scoreRef = useRef(score);
  const bubbleIdRef = useRef(bubbleId);
  const livesRef = useRef(lives);
  const isOnGroundRef = useRef(isOnGround);
  const facingRef = useRef(facingRight);

  playerRef.current = playerPos;
  playerVyRef.current = playerVy;
  scoreRef.current = score;
  bubbleIdRef.current = bubbleId;
  livesRef.current = lives;
  isOnGroundRef.current = isOnGround;
  facingRef.current = facingRight;

  const checkPlatformLanding = (x: number, newY: number, vy: number) => {
    if (vy <= 0) return null;
    for (const p of PLATFORMS) {
      if (x >= p.x - 5 && x <= p.x + p.width + 5 && newY >= p.y - 22 && newY <= p.y) {
        return p.y - 22;
      }
    }
    return null;
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(5, prev.x - 3) }));
        setFacingRight(false);
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 3) }));
        setFacingRight(true);
        break;
      case 'ArrowUp':
      case ' ':
        if (isOnGroundRef.current) {
          setPlayerVy(-9);
          setIsOnGround(false);
        }
        break;
      case 'z':
      case 'Z': {
        // Shoot bubble
        const dir = facingRef.current ? 1 : -1;
        const id = bubbleIdRef.current;
        setBubbles(prev => [...prev, {
          x: playerRef.current.x + (dir > 0 ? 20 : -5),
          y: playerRef.current.y + 5,
          vx: dir * 4,
          vy: -1.5,
          id,
          floating: false
        }]);
        setBubbleId(prev => prev + 1);
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
      // Player physics — apply gravity
      setPlayerVy(prevVy => {
        const newVy = Math.min(prevVy + GRAVITY, MAX_FALL);

        setPlayerPos(prev => {
          let newY = prev.y + newVy;
          let finalVy = newVy;

          const landY = checkPlatformLanding(prev.x, newY, newVy);
          if (landY !== null) {
            newY = landY;
            finalVy = 0;
            setIsOnGround(true);
          } else if (newY < 0) {
            newY = 0;
            finalVy = 0;
          } else {
            setIsOnGround(false);
          }

          // Wrap horizontally
          let newX = prev.x;
          if (newX < 0) newX = GAME_WIDTH - 5;
          if (newX > GAME_WIDTH) newX = 5;

          playerVyRef.current = finalVy;
          return { ...prev, x: newX, y: newY };
        });

        return playerVyRef.current;
      });

      // Move bubbles
      setBubbles(prev =>
        prev.map(bubble => {
          let { x, y, vx, vy, floating } = bubble;
          x += vx;
          y += vy;

          // Slow down and start floating upward
          if (!floating) {
            vx *= 0.92;
            vy += 0.1;
            if (Math.abs(vx) < 0.5) {
              floating = true;
              vx = 0;
            }
          } else {
            // Float slowly upward and drift
            y -= 0.4;
            x += Math.sin(Date.now() / 800 + bubble.id) * 0.3;
          }

          // Bounce off walls
          if (x < 5 || x > GAME_WIDTH - 15) vx = -vx;

          return { ...bubble, x, y, vx, vy, floating };
        }).filter(b => b.y > -20)
      );

      // Move enemies (with platform bouncing)
      setEnemies(prev =>
        prev.map(enemy => {
          if (enemy.trapped) return enemy;
          let { x, vx } = enemy;
          x += vx;
          if (x < 5 || x > GAME_WIDTH - 25) vx = -vx;
          return { ...enemy, x, vx };
        })
      );

      // Bubble-enemy collision — trap enemy
      setBubbles(prevBubbles => {
        const toRemove = new Set<number>();

        setEnemies(prevEnemies =>
          prevEnemies.map(enemy => {
            if (enemy.trapped) return enemy;
            const hit = prevBubbles.find(
              b => !toRemove.has(b.id) && Math.abs(b.x - enemy.x) < 22 && Math.abs(b.y - enemy.y) < 22
            );
            if (hit) {
              toRemove.add(hit.id);
              return { ...enemy, trapped: true };
            }
            return enemy;
          })
        );

        return prevBubbles.filter(b => !toRemove.has(b.id));
      });

      // Player pops trapped enemies
      const player = playerRef.current;
      setEnemies(prev =>
        prev.filter(enemy => {
          if (enemy.trapped && Math.abs(enemy.x - player.x) < 28 && Math.abs(enemy.y - player.y) < 28) {
            const newScore = scoreRef.current + 1000;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
            return false;
          }
          return true;
        })
      );

      // Enemy-player collision (untrapped enemies)
      setEnemies(prevEnemies => {
        const hit = prevEnemies.some(
          e => !e.trapped && Math.abs(e.x - player.x) < 22 && Math.abs(e.y - player.y) < 22
        );
        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) setGameOver(true);
          else setPlayerPos({ x: 50, y: 240 });
        }
        return prevEnemies;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]);

  return (
    <div
      className="relative"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'linear-gradient(180deg, #1e3a5f 0%, #2d6a9f 100%)' }}
    >
      {/* Platforms */}
      {PLATFORMS.map((platform, index) => (
        <div
          key={index}
          className="absolute rounded"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.width,
            height: 8,
            background: 'linear-gradient(180deg, #f472b6 0%, #be185d 100%)'
          }}
        />
      ))}

      {/* Player */}
      <div
        className="absolute text-2xl z-10"
        style={{
          left: playerPos.x,
          top: playerPos.y,
          transform: facingRight ? undefined : 'scaleX(-1)'
        }}
      >
        🐉
      </div>

      {/* Bubbles */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className={`absolute text-xl ${bubble.floating ? 'animate-pulse' : ''}`}
          style={{ left: bubble.x, top: bubble.y }}
        >
          🫧
        </div>
      ))}

      {/* Enemies */}
      {enemies.map(enemy => (
        <div
          key={enemy.id}
          className={`absolute text-xl ${enemy.trapped ? 'animate-bounce opacity-80' : ''}`}
          style={{ left: enemy.x, top: enemy.y }}
        >
          {enemy.trapped ? '🫧' : '👹'}
        </div>
      ))}

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))}
      </div>
      <div className="absolute bottom-2 left-2 text-pink-300 text-xs">
        ←→: Move | ↑/SPACE: Jump | Z: Shoot Bubble
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
          <div className="text-white text-lg">Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default BubbleBobbleGame;