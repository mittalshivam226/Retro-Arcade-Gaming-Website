import React, { useState, useEffect, useCallback } from 'react';

interface MissileCommandGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const MissileCommandGame: React.FC<MissileCommandGameProps> = ({ onScoreChange, gameState }) => {
  const [cities, setCities] = useState<Array<{ x: number; destroyed: boolean }>>([]);
  const [missiles, setMissiles] = useState<Array<{ x: number; y: number; targetX: number; targetY: number; id: number }>>([]);
  const [explosions, setExplosions] = useState<Array<{ x: number; y: number; radius: number; id: number }>>([]);
  const [playerMissiles, setPlayerMissiles] = useState<Array<{ x: number; y: number; targetX: number; targetY: number; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [missileId, setMissileId] = useState(0);

  // Initialize cities
  useEffect(() => {
    const initialCities = [];
    for (let i = 0; i < 6; i++) {
      initialCities.push({
        x: i * 60 + 40,
        destroyed: false
      });
    }
    setCities(initialCities);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const targetX = event.clientX - rect.left;
    const targetY = event.clientY - rect.top;
    
    setPlayerMissiles(prev => [...prev, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 20,
      targetX,
      targetY,
      id: missileId
    }]);
    setMissileId(prev => prev + 1);
  }, [gameState, missileId]);

  // Spawn enemy missiles
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const targetCity = cities[Math.floor(Math.random() * cities.length)];
        if (!targetCity.destroyed) {
          setMissiles(prev => [...prev, {
            x: Math.random() * GAME_WIDTH,
            y: 0,
            targetX: targetCity.x,
            targetY: GAME_HEIGHT - 40,
            id: missileId
          }]);
          setMissileId(prev => prev + 1);
        }
      }
    }, 2000);

    return () => clearInterval(spawnInterval);
  }, [gameState, cities, missileId]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move missiles
      setMissiles(prev => 
        prev.map(missile => {
          const dx = missile.targetX - missile.x;
          const dy = missile.targetY - missile.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 5) {
            // Missile reached target, create explosion
            setExplosions(prev => [...prev, {
              x: missile.targetX,
              y: missile.targetY,
              radius: 0,
              id: missile.id
            }]);
            return null;
          }
          
          const speed = 2;
          return {
            ...missile,
            x: missile.x + (dx / distance) * speed,
            y: missile.y + (dy / distance) * speed
          };
        }).filter(Boolean) as typeof missiles
      );

      // Move player missiles
      setPlayerMissiles(prev => 
        prev.map(missile => {
          const dx = missile.targetX - missile.x;
          const dy = missile.targetY - missile.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 5) {
            // Create explosion
            setExplosions(prev => [...prev, {
              x: missile.targetX,
              y: missile.targetY,
              radius: 0,
              id: missile.id
            }]);
            return null;
          }
          
          const speed = 4;
          return {
            ...missile,
            x: missile.x + (dx / distance) * speed,
            y: missile.y + (dy / distance) * speed
          };
        }).filter(Boolean) as typeof playerMissiles
      );

      // Update explosions
      setExplosions(prev => 
        prev.map(explosion => ({
          ...explosion,
          radius: explosion.radius + 2
        })).filter(explosion => explosion.radius < 50)
      );

      // Check if enemy missiles hit cities
      missiles.forEach(missile => {
        if (missile.y >= GAME_HEIGHT - 40) {
          setCities(prev => 
            prev.map(city => 
              Math.abs(city.x - missile.x) < 30 
                ? { ...city, destroyed: true }
                : city
            )
          );
        }
      });

      // Check if explosions destroy missiles
      setMissiles(prev => 
        prev.filter(missile => {
          const destroyed = explosions.some(explosion => {
            const dx = explosion.x - missile.x;
            const dy = explosion.y - missile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < explosion.radius;
          });
          
          if (destroyed) {
            const newScore = score + 25;
            setScore(newScore);
            onScoreChange(newScore);
          }
          
          return !destroyed;
        })
      );
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, missiles, explosions, score, onScoreChange]);

  return (
    <div 
      className="relative bg-black cursor-crosshair" 
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      onClick={handleClick}
    >
      {/* Cities */}
      {cities.map((city, index) => (
        <div
          key={index}
          className={`absolute ${city.destroyed ? 'text-red-500' : 'text-blue-400'}`}
          style={{ left: city.x - 10, bottom: 20 }}
        >
          {city.destroyed ? '💥' : '🏢'}
        </div>
      ))}

      {/* Enemy missiles */}
      {missiles.map(missile => (
        <div
          key={missile.id}
          className="absolute w-1 h-4 bg-red-500"
          style={{ left: missile.x, top: missile.y }}
        />
      ))}

      {/* Player missiles */}
      {playerMissiles.map(missile => (
        <div
          key={missile.id}
          className="absolute w-1 h-4 bg-green-500"
          style={{ left: missile.x, top: missile.y }}
        />
      ))}

      {/* Explosions */}
      {explosions.map(explosion => (
        <div
          key={explosion.id}
          className="absolute border-2 border-yellow-400 rounded-full bg-yellow-400 opacity-50"
          style={{
            left: explosion.x - explosion.radius,
            top: explosion.y - explosion.radius,
            width: explosion.radius * 2,
            height: explosion.radius * 2
          }}
        />
      ))}

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-green-600"></div>

      {/* Crosshair */}
      <div className="absolute top-2 left-2 text-green-400 text-xs">
        CLICK TO FIRE MISSILES
      </div>
    </div>
  );
};

export default MissileCommandGame;