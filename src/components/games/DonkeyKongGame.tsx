import React, { useState, useEffect, useCallback } from 'react';

interface DonkeyKongGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;
const PLAYER_SIZE = 20;
const BARREL_SIZE = 15;

const DonkeyKongGame: React.FC<DonkeyKongGameProps> = ({ onScoreChange, gameState }) => {
  const [marioPos, setMarioPos] = useState({ x: 50, y: GAME_HEIGHT - 50 });
  const [barrels, setBarrels] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [jumpVelocity, setJumpVelocity] = useState(0);
  const [barrelId, setBarrelId] = useState(0);

  const platforms = [
    { x: 0, y: GAME_HEIGHT - 30, width: GAME_WIDTH },
    { x: 50, y: GAME_HEIGHT - 130, width: GAME_WIDTH - 100 },
    { x: 0, y: GAME_HEIGHT - 230, width: GAME_WIDTH - 50 },
    { x: 100, y: GAME_HEIGHT - 330, width: GAME_WIDTH - 150 },
  ];

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setMarioPos(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
        break;
      case 'ArrowRight':
        setMarioPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - PLAYER_SIZE, prev.x + 5) }));
        break;
      case ' ':
        if (!isJumping) {
          setIsJumping(true);
          setJumpVelocity(-15);
        }
        break;
    }
  }, [gameState, isJumping]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Handle jumping
      if (isJumping) {
        setMarioPos(prev => ({ ...prev, y: prev.y + jumpVelocity }));
        setJumpVelocity(prev => prev + 1);
        
        // Check if Mario landed on a platform
        const currentPlatform = platforms.find(platform => 
          marioPos.x >= platform.x && 
          marioPos.x <= platform.x + platform.width &&
          marioPos.y >= platform.y - 30 &&
          marioPos.y <= platform.y
        );
        
        if (currentPlatform && jumpVelocity > 0) {
          setMarioPos(prev => ({ ...prev, y: currentPlatform.y - 30 }));
          setIsJumping(false);
          setJumpVelocity(0);
        }
      }

      // Spawn barrels
      if (Math.random() < 0.02) {
        setBarrels(prev => [...prev, { x: GAME_WIDTH - 50, y: 50, id: barrelId }]);
        setBarrelId(prev => prev + 1);
      }

      // Move barrels
      setBarrels(prev => 
        prev.map(barrel => ({ ...barrel, x: barrel.x - 2, y: barrel.y + 1 }))
            .filter(barrel => barrel.x > -BARREL_SIZE && barrel.y < GAME_HEIGHT)
      );

      // Check collisions
      barrels.forEach(barrel => {
        if (Math.abs(barrel.x - marioPos.x) < 20 && Math.abs(barrel.y - marioPos.y) < 20) {
          // Game over logic would go here
        }
      });

      // Score for surviving
      const newScore = score + 1;
      setScore(newScore);
      onScoreChange(newScore);
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, isJumping, jumpVelocity, marioPos, barrels, score, barrelId, onScoreChange]);

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Donkey Kong */}
      <div 
        className="absolute text-4xl"
        style={{ left: GAME_WIDTH - 80, top: 20 }}
      >
        🦍
      </div>

      {/* Platforms */}
      {platforms.map((platform, index) => (
        <div
          key={index}
          className="absolute bg-red-600"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.width,
            height: 10
          }}
        />
      ))}

      {/* Mario */}
      <div 
        className="absolute text-xl"
        style={{ left: marioPos.x, top: marioPos.y }}
      >
        🔴
      </div>

      {/* Barrels */}
      {barrels.map(barrel => (
        <div
          key={barrel.id}
          className="absolute text-lg"
          style={{ left: barrel.x, top: barrel.y }}
        >
          🛢️
        </div>
      ))}

      {/* Princess */}
      <div 
        className="absolute text-2xl"
        style={{ left: GAME_WIDTH - 50, top: GAME_HEIGHT - 380 }}
      >
        👸
      </div>
    </div>
  );
};

export default DonkeyKongGame;