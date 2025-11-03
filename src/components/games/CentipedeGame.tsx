import React, { useState, useEffect, useCallback } from 'react';

interface CentipedeGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

const CentipedeGame: React.FC<CentipedeGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 200, y: 450 });
  const [bullets, setBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [centipede, setCentipede] = useState<Array<{ x: number; y: number; direction: number }>>([]);
  const [mushrooms, setMushrooms] = useState<Array<{ x: number; y: number; hits: number }>>([]);
  const [score, setScore] = useState(0);
  const [bulletId, setBulletId] = useState(0);

  // Initialize game objects
  useEffect(() => {
    // Create centipede
    const initialCentipede = [];
    for (let i = 0; i < 10; i++) {
      initialCentipede.push({
        x: i * 20,
        y: 50,
        direction: 1
      });
    }
    setCentipede(initialCentipede);

    // Create mushrooms
    const initialMushrooms = [];
    for (let i = 0; i < 30; i++) {
      initialMushrooms.push({
        x: Math.floor(Math.random() * (GAME_WIDTH - 20)),
        y: Math.floor(Math.random() * 300) + 100,
        hits: 0
      });
    }
    setMushrooms(initialMushrooms);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 20, prev.x + 5) }));
        break;
      case 'ArrowUp':
        setPlayerPos(prev => ({ ...prev, y: Math.max(300, prev.y - 5) }));
        break;
      case 'ArrowDown':
        setPlayerPos(prev => ({ ...prev, y: Math.min(GAME_HEIGHT - 20, prev.y + 5) }));
        break;
      case ' ':
        setBullets(prev => [...prev, { x: playerPos.x + 10, y: playerPos.y, id: bulletId }]);
        setBulletId(prev => prev + 1);
        break;
    }
  }, [gameState, playerPos, bulletId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move bullets
      setBullets(prev => 
        prev.map(bullet => ({ ...bullet, y: bullet.y - 8 }))
            .filter(bullet => bullet.y > 0)
      );

      // Move centipede
      setCentipede(prev => 
        prev.map((segment) => {
          const newX = segment.x + segment.direction * 2;
          let newY = segment.y;
          let newDirection = segment.direction;

          // Check boundaries and mushroom collisions
          if (newX <= 0 || newX >= GAME_WIDTH - 20) {
            newDirection = -newDirection;
            newY += 20;
          }

          // Check mushroom collision
          const hitMushroom = mushrooms.find(mushroom =>
            Math.abs(newX - mushroom.x) < 20 &&
            Math.abs(newY - mushroom.y) < 20
          );

          if (hitMushroom) {
            newDirection = -newDirection;
            newY += 20;
          }

          return {
            x: newX,
            y: newY,
            direction: newDirection
          };
        })
      );

      // Check bullet collisions with centipede
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setCentipede(prevCentipede => {
          const newCentipede = [...prevCentipede];
          
          prevCentipede.forEach((segment, index) => {
            const hitBullet = remainingBullets.find(bullet => 
              Math.abs(bullet.x - segment.x) < 15 && 
              Math.abs(bullet.y - segment.y) < 15
            );
            
            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);
              
              // Remove segment and add mushroom
              newCentipede.splice(index, 1);
              setMushrooms(prev => [...prev, { x: segment.x, y: segment.y, hits: 0 }]);
              
              const newScore = score + 10;
              setScore(newScore);
              onScoreChange(newScore);
            }
          });
          
          return newCentipede;
        });
        
        return remainingBullets;
      });

      // Check bullet collisions with mushrooms
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setMushrooms(prevMushrooms => 
          prevMushrooms.map(mushroom => {
            const hitBullet = remainingBullets.find(bullet => 
              Math.abs(bullet.x - mushroom.x) < 15 && 
              Math.abs(bullet.y - mushroom.y) < 15
            );
            
            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);
              
              const newScore = score + 1;
              setScore(newScore);
              onScoreChange(newScore);
              
              return { ...mushroom, hits: mushroom.hits + 1 };
            }
            
            return mushroom;
          }).filter(mushroom => mushroom.hits < 4)
        );
        
        return remainingBullets;
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [gameState, playerPos, mushrooms, score, onScoreChange]);

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Player */}
      <div 
        className="absolute text-xl"
        style={{ left: playerPos.x, top: playerPos.y }}
      >
        🔫
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-1 h-3 bg-yellow-400"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Centipede */}
      {centipede.map((segment, index) => (
        <div
          key={index}
          className="absolute text-lg"
          style={{ left: segment.x, top: segment.y }}
        >
          {index === 0 ? '🐛' : '🟢'}
        </div>
      ))}

      {/* Mushrooms */}
      {mushrooms.map((mushroom, index) => (
        <div
          key={index}
          className="absolute text-sm"
          style={{ left: mushroom.x, top: mushroom.y }}
        >
          🍄
        </div>
      ))}

      {/* Player area boundary */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" style={{ top: 300 }}></div>
    </div>
  );
};

export default CentipedeGame;