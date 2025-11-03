import React, { useState, useEffect, useCallback } from 'react';

interface GalagaGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

const GalagaGame: React.FC<GalagaGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState(GAME_WIDTH / 2);
  const [bullets, setBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [enemies, setEnemies] = useState<Array<{ x: number; y: number; type: string; alive: boolean; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [bulletId, setBulletId] = useState(0);
  const [enemyId, setEnemyId] = useState(0);

  // Initialize enemies in formation
  useEffect(() => {
    const initialEnemies = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        initialEnemies.push({
          x: col * 45 + 50,
          y: row * 40 + 50,
          type: row < 2 ? 'galaga' : 'bee',
          alive: true,
          id: enemyId + row * 8 + col
        });
      }
    }
    setEnemies(initialEnemies);
    setEnemyId(prev => prev + 32);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => Math.max(20, prev - 8));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => Math.min(GAME_WIDTH - 20, prev + 8));
        break;
      case ' ':
        setBullets(prev => [...prev, { x: playerPos, y: GAME_HEIGHT - 60, id: bulletId }]);
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

      // Move enemies in formation pattern
      setEnemies(prev => 
        prev.map(enemy => {
          if (!enemy.alive) return enemy;
          
          // Simple formation movement
          const time = Date.now() / 1000;
          const offsetX = Math.sin(time + enemy.id * 0.1) * 20;
          const offsetY = Math.sin(time * 0.5) * 10;
          
          return {
            ...enemy,
            x: enemy.x + offsetX * 0.1,
            y: enemy.y + offsetY * 0.05 + 0.2
          };
        })
      );

      // Check collisions
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setEnemies(prevEnemies => 
          prevEnemies.map(enemy => {
            if (!enemy.alive) return enemy;
            
            const hitBullet = remainingBullets.find(bullet => 
              Math.abs(bullet.x - enemy.x) < 20 && 
              Math.abs(bullet.y - enemy.y) < 20
            );
            
            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);
              
              const points = enemy.type === 'galaga' ? 50 : 30;
              const newScore = score + points;
              setScore(newScore);
              onScoreChange(newScore);
              
              return { ...enemy, alive: false };
            }
            
            return enemy;
          })
        );
        
        return remainingBullets;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, score, onScoreChange]);

  const getEnemySprite = (enemy: { type: string }) => {
    return enemy.type === 'galaga' ? '🛸' : '🐝';
  };

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Player */}
      <div 
        className="absolute text-2xl"
        style={{ left: playerPos - 15, bottom: 20 }}
      >
        🚀
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-1 h-4 bg-yellow-400"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Enemies */}
      {enemies.map(enemy => 
        enemy.alive && (
          <div
            key={enemy.id}
            className="absolute text-xl transition-all duration-100"
            style={{ left: enemy.x, top: enemy.y }}
          >
            {getEnemySprite(enemy)}
          </div>
        )
      )}

      {/* Stars background */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Score display */}
      <div className="absolute top-4 left-4 text-yellow-400 text-sm">
        SCORE: {score}
      </div>
    </div>
  );
};

export default GalagaGame;