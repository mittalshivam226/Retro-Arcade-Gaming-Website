import React, { useState, useEffect, useRef, useCallback } from 'react';

interface JoustGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const GRAVITY = 0.4;
const MAX_FALL_SPEED = 8;

const PLATFORMS = [
  { x: 0, y: GAME_HEIGHT - 20, width: GAME_WIDTH },
  { x: 50, y: 200, width: 100 },
  { x: 250, y: 150, width: 100 },
  { x: 150, y: 100, width: 100 }
];

interface JoustEntity {
  x: number;
  y: number;
  vy: number;
  flapping: boolean;
}

interface JoustEnemy {
  x: number;
  y: number;
  vy: number;
  id: number;
  vx: number;
}

const JoustGame: React.FC<JoustGameProps> = ({ onScoreChange, gameState }) => {
  const [player, setPlayer] = useState<JoustEntity>({ x: 100, y: 200, vy: 0, flapping: false });
  const [enemies, setEnemies] = useState<JoustEnemy[]>([
    { x: 300, y: 180, vy: 0, id: 0, vx: 1 },
    { x: 200, y: 130, vy: 0, id: 1, vx: -1 }
  ]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Refs to avoid stale closures
  const playerRef = useRef(player);
  const enemiesRef = useRef(enemies);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);

  playerRef.current = player;
  enemiesRef.current = enemies;
  scoreRef.current = score;
  livesRef.current = lives;

  const checkPlatformCollision = (entity: { x: number; y: number; vy: number }) => {
    if (entity.vy <= 0) return null;
    for (const platform of PLATFORMS) {
      if (
        entity.x >= platform.x - 20 &&
        entity.x <= platform.x + platform.width &&
        entity.y >= platform.y - 30 &&
        entity.y <= platform.y
      ) {
        return platform;
      }
    }
    return null;
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayer(prev => ({ ...prev, x: Math.max(0, prev.x - 4) }));
        break;
      case 'ArrowRight':
        setPlayer(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 4) }));
        break;
      case ' ':
      case 'ArrowUp':
        // Flap — apply upward velocity
        setPlayer(prev => ({ ...prev, vy: -7, flapping: true }));
        setTimeout(() => setPlayer(prev => ({ ...prev, flapping: false })), 200);
        break;
    }
  }, [gameState, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop — use refs, minimal deps to avoid pile-up
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      if (gameOver) return;

      // Update player physics
      setPlayer(prev => {
        let newVy = Math.min(prev.vy + GRAVITY, MAX_FALL_SPEED);
        let newY = prev.y + newVy;
        let newX = prev.x;

        // Screen wrap
        if (newX < -20) newX = GAME_WIDTH;
        if (newX > GAME_WIDTH) newX = -20;

        // Platform collision
        const hit = checkPlatformCollision({ x: prev.x, y: newY, vy: newVy });
        if (hit) {
          newY = hit.y - 30;
          newVy = 0;
        }

        // Ceiling bounce
        if (newY < 0) {
          newY = 0;
          newVy = Math.abs(newVy) * 0.5;
        }

        return { ...prev, x: newX, y: newY, vy: newVy };
      });

      // Update enemies
      setEnemies(prev =>
        prev.map(enemy => {
          let newVy = Math.min(enemy.vy + GRAVITY, MAX_FALL_SPEED);
          let newY = enemy.y + newVy;
          let newVx = enemy.vx;
          const newX = enemy.x + newVx;

          // Flap randomly
          if (Math.random() < 0.03) newVy = -5;

          // Platform collision
          const hit = checkPlatformCollision({ x: enemy.x, y: newY, vy: newVy });
          if (hit) {
            newY = hit.y - 30;
            newVy = 0;
          }

          // Bounce off walls
          if (newX < 0 || newX > GAME_WIDTH - 20) newVx = -newVx;

          return { ...enemy, x: newX, y: newY, vy: newVy, vx: newVx };
        })
      );

      // Check player-enemy collisions (using refs for fresh state)
      const currentPlayer = playerRef.current;
      const currentEnemies = enemiesRef.current;

      const defeatedIds: number[] = [];
      let playerHit = false;

      for (const enemy of currentEnemies) {
        if (
          Math.abs(currentPlayer.x - enemy.x) < 30 &&
          Math.abs(currentPlayer.y - enemy.y) < 30
        ) {
          if (currentPlayer.y < enemy.y - 5) {
            // Player is higher — defeats enemy
            defeatedIds.push(enemy.id);
            const newScore = scoreRef.current + 500;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
          } else {
            // Enemy is higher or same level — player loses a life
            playerHit = true;
          }
        }
      }

      if (defeatedIds.length > 0) {
        setEnemies(prev => prev.filter(e => !defeatedIds.includes(e.id)));
      }

      if (playerHit) {
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);
        if (newLives <= 0) {
          setGameOver(true);
        } else {
          setPlayer({ x: 100, y: 200, vy: 0, flapping: false });
        }
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]); // ✅ No player/enemies in deps

  return (
    <div
      className="relative bg-gradient-to-b from-orange-400 to-red-600"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
    >
      {/* Platforms */}
      {PLATFORMS.map((platform, index) => (
        <div
          key={index}
          className="absolute bg-gray-600 border-t-2 border-gray-400"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.width,
            height: 8
          }}
        />
      ))}

      {/* Player */}
      <div
        className="absolute text-2xl"
        style={{ left: player.x, top: player.y }}
      >
        {player.flapping ? '🦅' : '🐦'}
      </div>

      {/* Enemies */}
      {enemies.map(enemy => (
        <div
          key={enemy.id}
          className="absolute text-2xl"
          style={{ left: enemy.x, top: enemy.y }}
        >
          🦇
        </div>
      ))}

      {/* Lava at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-red-800 animate-pulse" />

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
        SCORE: {score} | LIVES: {lives}
      </div>

      <div className="absolute bottom-6 left-2 text-white text-xs">
        ←→: Move | SPACE/↑: Flap
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

export default JoustGame;