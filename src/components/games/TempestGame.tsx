import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TempestGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2;
const LANES = 16;
const MAX_DISTANCE = 150; // Rim radius
const RIM_DISTANCE = 0;   // Center distance (0 = center of tube)

const TempestGame: React.FC<TempestGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState(0); // Lane position (0-15)
  const [bullets, setBullets] = useState<Array<{ lane: number; distance: number; id: number }>>([]);
  const [enemies, setEnemies] = useState<Array<{ lane: number; distance: number; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [bulletId, setBulletId] = useState(0);
  const [enemyId, setEnemyId] = useState(0);

  const scoreRef = useRef(score);
  const playerPosRef = useRef(playerPos);
  const livesRef = useRef(lives);

  scoreRef.current = score;
  playerPosRef.current = playerPos;
  livesRef.current = lives;

  // Convert lane + distance to (x,y) screen coords
  // Player is at rim (MAX_DISTANCE), enemies spawn at rim and move INWARD toward center
  const getLanePosition = (lane: number, distance: number) => {
    const angle = (lane / LANES) * Math.PI * 2 - Math.PI / 2;
    const radius = distance; // distance is actual radius from center
    return {
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius
    };
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => (prev - 1 + LANES) % LANES);
        break;
      case 'ArrowRight':
        setPlayerPos(prev => (prev + 1) % LANES);
        break;
      case ' ':
        // Shoot INWARD — bullet starts at rim, goes toward center
        setBullets(prev => [...prev, {
          lane: playerPosRef.current,
          distance: MAX_DISTANCE, // start at rim
          id: bulletId
        }]);
        setBulletId(prev => prev + 1);
        break;
    }
  }, [gameState, gameOver, bulletId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Spawn enemies at the rim
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.4) {
        setEnemies(prev => [...prev, {
          lane: Math.floor(Math.random() * LANES),
          distance: MAX_DISTANCE, // spawn at rim
          id: enemyId
        }]);
        setEnemyId(prev => prev + 1);
      }
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [gameState, gameOver, enemyId]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      // Move bullets INWARD (toward center = decreasing distance)
      setBullets(prev =>
        prev
          .map(bullet => ({ ...bullet, distance: bullet.distance - 8 }))
          .filter(bullet => bullet.distance > RIM_DISTANCE)
      );

      // Move enemies INWARD (toward center = decreasing distance)
      setEnemies(prev => {
        const updated = prev.map(enemy => ({ ...enemy, distance: enemy.distance - 1 }));

        // Check if any enemy reached center (distance ≤ 20)
        const reachedCenter = updated.filter(e => e.distance <= 20);
        if (reachedCenter.length > 0) {
          const newLives = livesRef.current - reachedCenter.length;
          livesRef.current = Math.max(0, newLives);
          setLives(prev => {
            const n = Math.max(0, prev - reachedCenter.length);
            if (n <= 0) setGameOver(true);
            return n;
          });
          return updated.filter(e => e.distance > 20);
        }

        return updated;
      });

      // Collision detection — bullets hit enemies in same lane at similar distance
      setBullets(prevBullets => {
        const remaining = [...prevBullets];

        setEnemies(prevEnemies =>
          prevEnemies.filter(enemy => {
            const hitBullet = remaining.find(bullet =>
              bullet.lane === enemy.lane &&
              Math.abs(bullet.distance - enemy.distance) < 15
            );

            if (hitBullet) {
              const idx = remaining.indexOf(hitBullet);
              remaining.splice(idx, 1);

              const newScore = scoreRef.current + 150;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreChange(newScore);
              return false;
            }
            return true;
          })
        );

        return remaining;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]);

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Draw the tunnel lanes — lines from center to rim */}
      <svg className="absolute inset-0" width={GAME_WIDTH} height={GAME_HEIGHT}>
        {Array.from({ length: LANES }).map((_, lane) => {
          const outerPos = getLanePosition(lane, MAX_DISTANCE);
          return (
            <line
              key={lane}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={outerPos.x}
              y2={outerPos.y}
              stroke="#00ffff"
              strokeWidth="1"
              opacity="0.25"
            />
          );
        })}
        {/* Draw concentric rings */}
        {[40, 75, 110, MAX_DISTANCE].map(r => (
          <circle
            key={r}
            cx={CENTER_X}
            cy={CENTER_Y}
            r={r}
            fill="none"
            stroke="#00ffff"
            strokeWidth="1"
            opacity="0.15"
          />
        ))}
        {/* Rim polygon */}
        <polygon
          points={Array.from({ length: LANES })
            .map((_, i) => {
              const pos = getLanePosition(i, MAX_DISTANCE);
              return `${pos.x},${pos.y}`;
            })
            .join(' ')}
          fill="none"
          stroke="#00ffff"
          strokeWidth="2"
          opacity="0.5"
        />
      </svg>

      {/* Player — on the rim */}
      {(() => {
        const pos = getLanePosition(playerPos, MAX_DISTANCE);
        return (
          <div
            className="absolute text-xl text-yellow-400"
            style={{ left: pos.x - 10, top: pos.y - 10 }}
          >
            🔺
          </div>
        );
      })()}

      {/* Bullets — moving inward */}
      {bullets.map(bullet => {
        const pos = getLanePosition(bullet.lane, bullet.distance);
        return (
          <div
            key={bullet.id}
            className="absolute w-3 h-3 bg-yellow-400 rounded-full"
            style={{ left: pos.x - 1, top: pos.y - 1 }}
          />
        );
      })}

      {/* Enemies — moving inward from rim */}
      {enemies.map(enemy => {
        const pos = getLanePosition(enemy.lane, enemy.distance);
        return (
          <div
            key={enemy.id}
            className="absolute text-lg text-red-500"
            style={{ left: pos.x - 10, top: pos.y - 10 }}
          >
            ◆
          </div>
        );
      })}

      {/* Center */}
      <div
        className="absolute w-4 h-4 bg-cyan-400 rounded-full"
        style={{ left: CENTER_X - 8, top: CENTER_Y - 8 }}
      />

      {/* UI */}
      <div className="absolute top-2 left-2 text-cyan-400 text-xs">
        SCORE: {score} | LIVES: {lives}
      </div>
      <div className="absolute bottom-2 left-2 text-cyan-400 text-xs">
        ←→: Move Along Rim | SPACE: Fire Inward
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

export default TempestGame;