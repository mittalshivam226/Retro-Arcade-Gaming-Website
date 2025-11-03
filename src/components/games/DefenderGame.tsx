import React, { useState, useEffect, useCallback } from 'react';

interface DefenderGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const DefenderGame: React.FC<DefenderGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 150 });
  const [bullets, setBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [enemies, setEnemies] = useState<Array<{ x: number; y: number; type: string; id: number }>>([]);
  const [humanoids, setHumanoids] = useState<Array<{ x: number; y: number; saved: boolean }>>([]);
  const [score, setScore] = useState(0);
  const [bulletId, setBulletId] = useState(0);

  // Initialize game objects
  useEffect(() => {
    const initialEnemies = [];
    const initialHumanoids = [];
    
    for (let i = 0; i < 5; i++) {
      initialEnemies.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * 100 + 50,
        type: 'lander',
        id: i
      });
    }
    
    for (let i = 0; i < 8; i++) {
      initialHumanoids.push({
        x: i * 50 + 25,
        y: GAME_HEIGHT - 30,
        saved: false
      });
    }
    
    setEnemies(initialEnemies);
    setHumanoids(initialHumanoids);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 5) }));
        break;
      case 'ArrowUp':
        setPlayerPos(prev => ({ ...prev, y: Math.max(0, prev.y - 5) }));
        break;
      case 'ArrowDown':
        setPlayerPos(prev => ({ ...prev, y: Math.min(GAME_HEIGHT - 30, prev.y + 5) }));
        break;
      case ' ':
        setBullets(prev => [...prev, { x: playerPos.x + 15, y: playerPos.y + 10, id: bulletId }]);
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
        prev.map(bullet => ({ ...bullet, x: bullet.x + 8 }))
            .filter(bullet => bullet.x < GAME_WIDTH)
      );

      // Move enemies
      setEnemies(prev => 
        prev.map(enemy => ({
          ...enemy,
          x: enemy.x - 1,
          y: enemy.y + Math.sin(Date.now() / 1000 + enemy.id) * 0.5
        })).filter(enemy => enemy.x > -50)
      );

      // Check collisions
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setEnemies(prevEnemies => 
          prevEnemies.filter(enemy => {
            const hitBullet = remainingBullets.find(bullet => 
              Math.abs(bullet.x - enemy.x) < 20 && 
              Math.abs(bullet.y - enemy.y) < 20
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
    <div className="relative bg-gradient-to-b from-purple-900 to-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Player ship */}
      <div 
        className="absolute text-xl"
        style={{ left: playerPos.x, top: playerPos.y }}
      >
        🛸
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-2 h-1 bg-yellow-400"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Enemies */}
      {enemies.map(enemy => (
        <div
          key={enemy.id}
          className="absolute text-lg"
          style={{ left: enemy.x, top: enemy.y }}
        >
          👾
        </div>
      ))}

      {/* Humanoids */}
      {humanoids.map((humanoid, index) => (
        <div
          key={index}
          className="absolute text-sm"
          style={{ left: humanoid.x, top: humanoid.y }}
        >
          🚶
        </div>
      ))}

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-800"></div>
    </div>
  );
};

export default DefenderGame;