import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface DonkeyKongGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 450;
const GRAVITY = 0.5;
const MAX_FALL = 10;

interface Platform {
  x: number;
  y: number;
  width: number;
  tilt: number; // degrees of tilt for barrel to roll
}

interface Barrel {
  x: number;
  y: number;
  vy: number;
  vx: number;
  id: number;
  spinning: number;
}

const DonkeyKongGame: React.FC<DonkeyKongGameProps> = ({ onScoreChange, gameState }) => {
  // Platforms defined outside component via useMemo to avoid dep warning
  const platforms = useMemo<Platform[]>(() => [
    { x: 0,   y: 400, width: GAME_WIDTH, tilt: 0  }, // ground
    { x: 20,  y: 320, width: 330, tilt: 3         }, // floor 1
    { x: 40,  y: 240, width: 330, tilt: -3         }, // floor 2
    { x: 20,  y: 160, width: 330, tilt: 3          }, // floor 3
    { x: 40,  y: 80,  width: 250, tilt: 0          }  // top
  ], []);

  const [player, setPlayer] = useState({ x: 60, y: 360, vy: 0, isJumping: false });
  const [barrels, setBarrels] = useState<Barrel[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const playerRef = useRef(player);
  const barrelsRef = useRef(barrels);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const barrelIdRef = useRef(0);
  const invincibleRef = useRef(false);

  playerRef.current = player;
  barrelsRef.current = barrels;
  scoreRef.current = score;
  livesRef.current = lives;

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver || won) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayer(prev => ({ ...prev, x: Math.max(5, prev.x - 5) }));
        break;
      case 'ArrowRight':
        setPlayer(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 25, prev.x + 5) }));
        break;
      case ' ':
      case 'ArrowUp':
        setPlayer(prev => {
          if (!prev.isJumping) {
            return { ...prev, vy: -10, isJumping: true };
          }
          return prev;
        });
        break;
    }
  }, [gameState, gameOver, won]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Spawn barrels
  useEffect(() => {
    if (gameState !== 'playing' || gameOver || won) return;

    const spawnInterval = setInterval(() => {
      const id = barrelIdRef.current++;
      setBarrels(prev => [...prev, {
        x: 60,
        y: 60,
        vy: 0,
        vx: 1.5,
        id,
        spinning: 0
      }]);
    }, 2500);

    return () => clearInterval(spawnInterval);
  }, [gameState, gameOver, won]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver || won) return;

    const gameLoop = setInterval(() => {
      // Update player physics
      setPlayer(prev => {
        let vy = Math.min(prev.vy + GRAVITY, MAX_FALL);
        let newY = prev.y + vy;
        let isJumping = true;

        // Platform collision
        for (const platform of platforms) {
          const tiltOffset = ((prev.x - platform.x) / platform.width) * Math.tan(platform.tilt * Math.PI / 180) * platform.width;
          const platformY = platform.y + tiltOffset;

          if (
            prev.x >= platform.x - 5 &&
            prev.x <= platform.x + platform.width + 5 &&
            newY >= platformY - 25 &&
            newY <= platformY &&
            vy > 0
          ) {
            newY = platformY - 25;
            vy = 0;
            isJumping = false;
            break;
          }
        }

        // Out of bounds — fall off screen
        if (newY > GAME_HEIGHT) {
          newY = 360;
          vy = 0;
          isJumping = false;
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) setGameOver(true);
        }

        return { ...prev, y: newY, vy, isJumping };
      });

      // Update barrels
      setBarrels(prev => {
        const current = prev.map(barrel => {
          let { x, y, vy: bvy, vx, spinning } = barrel;
          bvy = Math.min(bvy + GRAVITY, MAX_FALL);
          y += bvy;
          x += vx;
          spinning += 10;

          // Platform collision for barrel
          for (const platform of platforms) {
            const tiltOffset = ((x - platform.x) / platform.width) * Math.tan(platform.tilt * Math.PI / 180) * platform.width;
            const platformY = platform.y + tiltOffset;

            if (
              x >= platform.x - 5 &&
              x <= platform.x + platform.width + 5 &&
              y >= platformY - 12 &&
              y <= platformY + 5 &&
              bvy > 0
            ) {
              y = platformY - 12;
              bvy = 0;
              // Tilt adjusts barrel roll direction
              vx = platform.tilt >= 0 ? 1.5 : -1.5;
              break;
            }
          }

          // Barrel falls off edge — goes down
          if (x < 0 || x > GAME_WIDTH) {
            bvy = 2;
            vx = -vx;
            x = Math.max(0, Math.min(GAME_WIDTH, x));
          }

          return { ...barrel, x, y, vy: bvy, vx, spinning };
        });

        // Remove barrels that go off bottom
        return current.filter(b => b.y < GAME_HEIGHT + 20);
      });

      // Player-barrel collision
      if (!invincibleRef.current) {
        const p = playerRef.current;
        const hit = barrelsRef.current.some(
          b => Math.abs(b.x - p.x) < 20 && Math.abs(b.y - p.y) < 20
        );

        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) {
            setGameOver(true);
          } else {
            setPlayer({ x: 60, y: 360, vy: 0, isJumping: false });
            invincibleRef.current = true;
            setTimeout(() => { invincibleRef.current = false; }, 2000);
          }
        }
      }

      // Score per tick
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      onScoreChange(newScore);

      // Win condition — reach Pauline at top
      const p = playerRef.current;
      if (p.y < 90 && p.x > 250) {
        setWon(true);
        const bonus = scoreRef.current + 5000;
        setScore(bonus);
        onScoreChange(bonus);
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, won, platforms, onScoreChange]);

  return (
    <div
      className="relative bg-black"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
    >
      {/* Platforms */}
      {platforms.map((platform, i) => (
        <div
          key={i}
          className="absolute bg-red-800 border-t-2 border-red-400"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.width,
            height: 10,
            transform: `rotate(${platform.tilt}deg)`,
            transformOrigin: 'left center'
          }}
        />
      ))}

      {/* Ladders */}
      {[100, 240, 310].map((x, i) => (
        <div
          key={i}
          className="absolute w-4 bg-yellow-700 opacity-80"
          style={{ left: x, top: i % 2 === 0 ? 170 : 90, height: 80 }}
        />
      ))}

      {/* Donkey Kong */}
      <div className="absolute text-4xl" style={{ left: 40, top: 30 }}>🦍</div>

      {/* Pauline (rescue target) */}
      <div className="absolute text-2xl animate-bounce" style={{ left: 310, top: 48 }}>👧</div>

      {/* Player */}
      <div
        className="absolute text-xl z-10"
        style={{
          left: player.x,
          top: player.y,
          opacity: invincibleRef.current ? 0.5 : 1
        }}
      >
        🧑
      </div>

      {/* Barrels */}
      {barrels.map(barrel => (
        <div
          key={barrel.id}
          className="absolute text-lg"
          style={{
            left: barrel.x - 10,
            top: barrel.y - 10,
            transform: `rotate(${barrel.spinning}deg)`
          }}
        >
          🛢️
        </div>
      ))}

      {/* UI */}
      <div className="absolute top-2 left-2 text-red-400 text-xs">
        LIVES: {'❤️'.repeat(Math.max(0, lives))} | SCORE: {score}
      </div>
      <div className="absolute bottom-2 left-2 text-red-400 text-xs">
        ←→: Move | ↑/SPACE: Jump | Rescue Pauline!
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
          <div className="text-white text-lg">Score: {score}</div>
        </div>
      )}

      {/* Win */}
      {won && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-yellow-400 text-2xl font-bold mb-3">YOU WIN! 🎉</div>
          <div className="text-white text-lg">Score: {score}</div>
        </div>
      )}
    </div>
  );
};

// Fix: export uses correct name to match filename
export default DonkeyKongGame;