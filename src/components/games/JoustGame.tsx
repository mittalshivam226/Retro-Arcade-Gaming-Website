import React, { useState, useEffect, useCallback } from 'react';

interface JoustGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const JoustGame: React.FC<JoustGameProps> = ({ onScoreChange, gameState }) => {
  const [player, setPlayer] = useState({ x: 100, y: 200, vy: 0, flapping: false });
  const [enemies, setEnemies] = useState<Array<{ x: number; y: number; vy: number; id: number }>>([]);
  const [platforms, setPlatforms] = useState<Array<{ x: number; y: number; width: number }>>([]);
  const [score, setScore] = useState(0);

  // Initialize platforms and enemies
  useEffect(() => {
    const initialPlatforms = [
      { x: 0, y: GAME_HEIGHT - 20, width: GAME_WIDTH },
      { x: 50, y: 200, width: 100 },
      { x: 250, y: 150, width: 100 },
      { x: 150, y: 100, width: 100 }
    ];
    
    const initialEnemies = [
      { x: 300, y: 180, vy: 0, id: 0 },
      { x: 200, y: 130, vy: 0, id: 1 }
    ];
    
    setPlatforms(initialPlatforms);
    setEnemies(initialEnemies);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayer(prev => ({ ...prev, x: Math.max(0, prev.x - 3) }));
        break;
      case 'ArrowRight':
        setPlayer(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 3) }));
        break;
      case ' ':
        setPlayer(prev => ({ ...prev, vy: -8, flapping: true }));
        setTimeout(() => setPlayer(prev => ({ ...prev, flapping: false })), 200);
        break;
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Update player physics
      setPlayer(prev => {
        let newY = prev.y + prev.vy;
        let newVy = prev.vy + 0.5; // gravity
        
        // Check platform collisions
        const onPlatform = platforms.find(platform => 
          prev.x >= platform.x - 20 && 
          prev.x <= platform.x + platform.width &&
          newY >= platform.y - 30 && 
          newY <= platform.y &&
          prev.vy > 0
        );
        
        if (onPlatform) {
          newY = onPlatform.y - 30;
          newVy = 0;
        }
        
        return { ...prev, y: newY, vy: newVy };
      });

      // Update enemies
      setEnemies(prev => 
        prev.map(enemy => {
          let newY = enemy.y + enemy.vy;
          let newVy = enemy.vy + 0.5;
          
          // Simple AI - flap occasionally
          if (Math.random() < 0.02) {
            newVy = -6;
          }
          
          // Platform collision for enemies
          const onPlatform = platforms.find(platform => 
            enemy.x >= platform.x - 20 && 
            enemy.x <= platform.x + platform.width &&
            newY >= platform.y - 30 && 
            newY <= platform.y &&
            enemy.vy > 0
          );
          
          if (onPlatform) {
            newY = onPlatform.y - 30;
            newVy = 0;
          }
          
          return { ...enemy, y: newY, vy: newVy };
        })
      );

      // Check collisions between player and enemies
      enemies.forEach(enemy => {
        if (Math.abs(player.x - enemy.x) < 30 && Math.abs(player.y - enemy.y) < 30) {
          if (player.y < enemy.y) {
            // Player is higher, wins
            setEnemies(prev => prev.filter(e => e.id !== enemy.id));
            const newScore = score + 500;
            setScore(newScore);
            onScoreChange(newScore);
          }
        }
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, player, enemies, platforms, score, onScoreChange]);

  return (
    <div className="relative bg-gradient-to-b from-orange-400 to-red-600" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Platforms */}
      {platforms.map((platform, index) => (
        <div
          key={index}
          className="absolute bg-gray-600"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.width,
            height: 10
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
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-red-800 animate-pulse"></div>
    </div>
  );
};

export default JoustGame;