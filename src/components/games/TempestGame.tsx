import React, { useState, useEffect, useCallback } from 'react';

interface TempestGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2;

const TempestGame: React.FC<TempestGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState(0); // Position around the rim (0-15)
  const [bullets, setBullets] = useState<Array<{ lane: number; distance: number; id: number }>>([]);
  const [enemies, setEnemies] = useState<Array<{ lane: number; distance: number; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [bulletId, setBulletId] = useState(0);
  const [enemyId, setEnemyId] = useState(0);

  const LANES = 16;
  const MAX_DISTANCE = 100;

  const getLanePosition = (lane: number, distance: number) => {
    const angle = (lane / LANES) * Math.PI * 2;
    const radius = 50 + distance;
    return {
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius
    };
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => (prev - 1 + LANES) % LANES);
        break;
      case 'ArrowRight':
        setPlayerPos(prev => (prev + 1) % LANES);
        break;
      case ' ':
        setBullets(prev => [...prev, {
          lane: playerPos,
          distance: 0,
          id: bulletId
        }]);
        setBulletId(prev => prev + 1);
        break;
    }
  }, [gameState, playerPos, bulletId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Spawn enemies
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        setEnemies(prev => [...prev, {
          lane: Math.floor(Math.random() * LANES),
          distance: MAX_DISTANCE,
          id: enemyId
        }]);
        setEnemyId(prev => prev + 1);
      }
    }, 1500);

    return () => clearInterval(spawnInterval);
  }, [gameState, enemyId]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move bullets outward
      setBullets(prev => 
        prev.map(bullet => ({ ...bullet, distance: bullet.distance + 5 }))
            .filter(bullet => bullet.distance < MAX_DISTANCE + 20)
      );

      // Move enemies inward
      setEnemies(prev => 
        prev.map(enemy => ({ ...enemy, distance: enemy.distance - 1 }))
            .filter(enemy => enemy.distance > 0)
      );

      // Check collisions
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setEnemies(prevEnemies => 
          prevEnemies.filter(enemy => {
            const hitBullet = remainingBullets.find(bullet => 
              bullet.lane === enemy.lane && 
              Math.abs(bullet.distance - enemy.distance) < 10
            );
            
            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);
              
              const newScore = score + 150;
              setScore(newScore);
              onScoreChange(newScore);
              
              return false;
            }
            
            return true;
          })
        );
        
        return remainingBullets;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, score, onScoreChange]);

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Draw the tunnel lanes */}
      {Array.from({ length: LANES }).map((_, lane) => {
        const innerPos = getLanePosition(lane, 0);
        const outerPos = getLanePosition(lane, MAX_DISTANCE);
        
        return (
          <svg key={lane} className="absolute inset-0" width={GAME_WIDTH} height={GAME_HEIGHT}>
            <line
              x1={innerPos.x}
              y1={innerPos.y}
              x2={outerPos.x}
              y2={outerPos.y}
              stroke="#00ffff"
              strokeWidth="1"
              opacity="0.3"
            />
          </svg>
        );
      })}

      {/* Draw concentric circles */}
      {[25, 50, 75, 100].map(radius => (
        <svg key={radius} className="absolute inset-0" width={GAME_WIDTH} height={GAME_HEIGHT}>
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={50 + radius}
            fill="none"
            stroke="#00ffff"
            strokeWidth="1"
            opacity="0.2"
          />
        </svg>
      ))}

      {/* Player */}
      <div 
        className="absolute text-xl text-yellow-400"
        style={{ 
          left: getLanePosition(playerPos, 0).x - 10,
          top: getLanePosition(playerPos, 0).y - 10
        }}
      >
        🔺
      </div>

      {/* Bullets */}
      {bullets.map(bullet => {
        const pos = getLanePosition(bullet.lane, bullet.distance);
        return (
          <div
            key={bullet.id}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{ left: pos.x - 1, top: pos.y - 1 }}
          />
        );
      })}

      {/* Enemies */}
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
        style={{ left: CENTER_X - 2, top: CENTER_Y - 2 }}
      />
    </div>
  );
};

export default TempestGame;