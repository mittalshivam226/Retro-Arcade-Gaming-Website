import React, { useState, useEffect, useCallback } from 'react';

interface PitfallGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const PitfallGame: React.FC<PitfallGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 200 });
  const [isJumping, setIsJumping] = useState(false);
  const [jumpVelocity, setJumpVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Array<{ x: number; y: number; type: string }>>([]);
  const [treasures, setTreasures] = useState<Array<{ x: number; y: number; collected: boolean }>>([]);
  const [score, setScore] = useState(0);
  const [cameraX, setCameraX] = useState(0);

  // Initialize level
  useEffect(() => {
    const initialObstacles = [
      { x: 150, y: 220, type: 'pit' },
      { x: 300, y: 180, type: 'log' },
      { x: 450, y: 220, type: 'pit' },
      { x: 600, y: 160, type: 'vine' },
      { x: 750, y: 220, type: 'pit' }
    ];
    
    const initialTreasures = [
      { x: 200, y: 180, collected: false },
      { x: 400, y: 140, collected: false },
      { x: 650, y: 120, collected: false }
    ];
    
    setObstacles(initialObstacles);
    setTreasures(initialTreasures);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - 3) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: prev.x + 3 }));
        break;
      case ' ':
        if (!isJumping) {
          setIsJumping(true);
          setJumpVelocity(-12);
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
        setPlayerPos(prev => ({ ...prev, y: prev.y + jumpVelocity }));
        setJumpVelocity(prev => prev + 1);
        
        // Land on ground
        if (playerPos.y >= 200) {
          setPlayerPos(prev => ({ ...prev, y: 200 }));
          setIsJumping(false);
          setJumpVelocity(0);
        }
      }

      // Update camera to follow player
      setCameraX(playerPos.x - 200);

      // Check treasure collection
      setTreasures(prev => 
        prev.map(treasure => {
          if (!treasure.collected && 
              Math.abs(treasure.x - playerPos.x) < 20 && 
              Math.abs(treasure.y - playerPos.y) < 20) {
            const newScore = score + 2000;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...treasure, collected: true };
          }
          return treasure;
        })
      );

      // Check pit collisions
      const inPit = obstacles.some(obstacle => 
        obstacle.type === 'pit' &&
        playerPos.x >= obstacle.x && 
        playerPos.x <= obstacle.x + 50 &&
        playerPos.y >= obstacle.y
      );

      if (inPit && !isJumping) {
        // Reset player position (simplified game over)
        setPlayerPos({ x: 50, y: 200 });
        setCameraX(0);
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, isJumping, jumpVelocity, playerPos, obstacles, score, onScoreChange]);

  return (
    <div className="relative bg-gradient-to-b from-green-400 to-green-600 overflow-hidden" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Jungle background */}
      <div className="absolute inset-0 bg-green-800 opacity-30"></div>
      
      {/* Ground */}
      <div 
        className="absolute bottom-0 h-20 bg-amber-800"
        style={{ 
          left: -cameraX, 
          width: 1000 
        }}
      ></div>

      {/* Obstacles */}
      {obstacles.map((obstacle, index) => (
        <div
          key={index}
          className="absolute"
          style={{ left: obstacle.x - cameraX, top: obstacle.y }}
        >
          {obstacle.type === 'pit' && (
            <div className="w-12 h-20 bg-black"></div>
          )}
          {obstacle.type === 'log' && (
            <div className="text-2xl">🪵</div>
          )}
          {obstacle.type === 'vine' && (
            <div className="text-2xl">🌿</div>
          )}
        </div>
      ))}

      {/* Treasures */}
      {treasures.map((treasure, index) => 
        !treasure.collected && (
          <div
            key={index}
            className="absolute text-xl animate-bounce"
            style={{ left: treasure.x - cameraX, top: treasure.y }}
          >
            💎
          </div>
        )
      )}

      {/* Player */}
      <div 
        className="absolute text-2xl z-10"
        style={{ left: playerPos.x - cameraX, top: playerPos.y }}
      >
        🤠
      </div>

      {/* Trees */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl"
            style={{
              left: i * 100 - cameraX,
              top: 50,
            }}
          >
            🌴
          </div>
        ))}
      </div>
    </div>
  );
};

export default PitfallGame;