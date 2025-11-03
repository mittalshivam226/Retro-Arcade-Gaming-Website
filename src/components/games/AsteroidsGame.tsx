import React, { useState, useEffect, useCallback } from 'react';

interface AsteroidsGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;

interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

const AsteroidsGame: React.FC<AsteroidsGameProps> = ({ onScoreChange, gameState }) => {
  const [ship, setShip] = useState<GameObject>({ x: 200, y: 200, vx: 0, vy: 0, rotation: 0 });
  const [bullets, setBullets] = useState<Array<GameObject & { id: number; life: number }>>([]);
  const [asteroids, setAsteroids] = useState<Array<GameObject & { size: number; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [thrust, setThrust] = useState(false);
  const [bulletId, setBulletId] = useState(0);
  const [asteroidId, setAsteroidId] = useState(0);

  // Initialize asteroids
  useEffect(() => {
    const initialAsteroids = [];
    for (let i = 0; i < 5; i++) {
      initialAsteroids.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        rotation: Math.random() * 360,
        size: 3,
        id: asteroidId + i
      });
    }
    setAsteroids(initialAsteroids);
    setAsteroidId(prev => prev + 5);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setShip(prev => ({ ...prev, rotation: prev.rotation - 5 }));
        break;
      case 'ArrowRight':
        setShip(prev => ({ ...prev, rotation: prev.rotation + 5 }));
        break;
      case 'ArrowUp':
        setThrust(true);
        break;
      case ' ': {
        const angle = (ship.rotation - 90) * Math.PI / 180;
        setBullets(prev => [...prev, {
          x: ship.x,
          y: ship.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          rotation: 0,
          id: bulletId,
          life: 60
        }]);
        setBulletId(prev => prev + 1);
        break;
      }
    }
  }, [gameState, ship, bulletId, gameOver]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      setThrust(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Update ship
      setShip(prev => {
        let newVx = prev.vx;
        let newVy = prev.vy;
        
        if (thrust) {
          const angle = (prev.rotation - 90) * Math.PI / 180;
          newVx += Math.cos(angle) * 0.3;
          newVy += Math.sin(angle) * 0.3;
        }
        
        // Apply friction
        newVx *= 0.99;
        newVy *= 0.99;
        
        // Update position with wrapping
        const newX = (prev.x + newVx + GAME_WIDTH) % GAME_WIDTH;
        const newY = (prev.y + newVy + GAME_HEIGHT) % GAME_HEIGHT;
        
        return { ...prev, x: newX, y: newY, vx: newVx, vy: newVy };
      });

      // Update bullets
      setBullets(prev => 
        prev.map(bullet => ({
          ...bullet,
          x: (bullet.x + bullet.vx + GAME_WIDTH) % GAME_WIDTH,
          y: (bullet.y + bullet.vy + GAME_HEIGHT) % GAME_HEIGHT,
          life: bullet.life - 1
        })).filter(bullet => bullet.life > 0)
      );

      // Update asteroids
      setAsteroids(prev => 
        prev.map(asteroid => ({
          ...asteroid,
          x: (asteroid.x + asteroid.vx + GAME_WIDTH) % GAME_WIDTH,
          y: (asteroid.y + asteroid.vy + GAME_HEIGHT) % GAME_HEIGHT,
          rotation: asteroid.rotation + 2
        }))
      );

      // Check collisions
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];

        setAsteroids(prevAsteroids => {
          const newAsteroids = [...prevAsteroids];

          prevAsteroids.forEach((asteroid, asteroidIndex) => {
            const hitBullet = remainingBullets.find(bullet => {
              const dx = bullet.x - asteroid.x;
              const dy = bullet.y - asteroid.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance < asteroid.size * 10;
            });

            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);

              // Remove asteroid
              newAsteroids.splice(asteroidIndex, 1);

              // Create smaller asteroids if large enough
              if (asteroid.size > 1) {
                for (let i = 0; i < 2; i++) {
                  newAsteroids.push({
                    x: asteroid.x,
                    y: asteroid.y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    rotation: Math.random() * 360,
                    size: asteroid.size - 1,
                    id: asteroidId + i
                  });
                }
                setAsteroidId(prev => prev + 2);
              }

              const points = (4 - asteroid.size) * 20;
              const newScore = score + points;
              setScore(newScore);
              onScoreChange(newScore);
            }
          });

          return newAsteroids;
        });

        return remainingBullets;
      });

      // Check ship collision with asteroids
      const shipHit = asteroids.some(asteroid => {
        const dx = ship.x - asteroid.x;
        const dy = ship.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < asteroid.size * 10;
      });

      if (shipHit) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
          } else {
            // Reset ship position
            setShip({ x: 200, y: 200, vx: 0, vy: 0, rotation: 0 });
          }
          return newLives;
        });
      }
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameState, thrust, score, asteroidId, onScoreChange]);

  const getAsteroidSize = (size: number) => {
    return size * 15;
  };

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Ship */}
      <div 
        className="absolute text-xl"
        style={{ 
          left: ship.x - 10, 
          top: ship.y - 10,
          transform: `rotate(${ship.rotation}deg)`
        }}
      >
        {thrust ? '🚀' : '🔺'}
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-2 h-2 bg-white rounded-full"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Asteroids */}
      {asteroids.map(asteroid => (
        <div
          key={asteroid.id}
          className="absolute text-gray-400"
          style={{ 
            left: asteroid.x - getAsteroidSize(asteroid.size) / 2, 
            top: asteroid.y - getAsteroidSize(asteroid.size) / 2,
            fontSize: `${getAsteroidSize(asteroid.size)}px`,
            transform: `rotate(${asteroid.rotation}deg)`
          }}
        >
          ☄️
        </div>
      ))}

      {/* Stars background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-60"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 73) % 100}%`
            }}
          />
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-white text-xs">
        ←→: Rotate | ↑: Thrust | SPACE: Shoot
      </div>

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-sm">
        Lives: {lives} | Score: {score}
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-4">GAME OVER</div>
          <div className="text-white text-lg mb-4">Final Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default AsteroidsGame;