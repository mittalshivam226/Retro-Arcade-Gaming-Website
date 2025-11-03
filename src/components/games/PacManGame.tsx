import React, { useState, useEffect, useCallback } from 'react';

interface PacManGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 380;
const GAME_HEIGHT = 420;

const PacManGame: React.FC<PacManGameProps> = ({ onScoreChange, gameState }) => {
  const [pacmanPos, setPacmanPos] = useState({ x: 180, y: 300 });
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [dots, setDots] = useState<Array<{ x: number; y: number; eaten: boolean }>>([]);
  const [ghosts, setGhosts] = useState<Array<{ x: number; y: number; color: string; direction: { x: number; y: number } }>>([]);

  // Initialize game objects
  useEffect(() => {
    const initialDots = [];
    for (let x = 40; x < GAME_WIDTH - 40; x += 40) {
      for (let y = 40; y < GAME_HEIGHT - 40; y += 40) {
        initialDots.push({ x, y, eaten: false });
      }
    }
    setDots(initialDots);

    const initialGhosts = [
      { x: 180, y: 180, color: 'red', direction: { x: 2, y: 0 } },
      { x: 160, y: 180, color: 'pink', direction: { x: -2, y: 0 } },
      { x: 200, y: 180, color: 'cyan', direction: { x: 0, y: 2 } },
      { x: 180, y: 160, color: 'orange', direction: { x: 0, y: -2 } }
    ];
    setGhosts(initialGhosts);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowUp':
        setDirection({ x: 0, y: -4 });
        break;
      case 'ArrowDown':
        setDirection({ x: 0, y: 4 });
        break;
      case 'ArrowLeft':
        setDirection({ x: -4, y: 0 });
        break;
      case 'ArrowRight':
        setDirection({ x: 4, y: 0 });
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
      // Move Pac-Man
      setPacmanPos(prev => {
        let newX = prev.x + direction.x;
        let newY = prev.y + direction.y;
        
        // Boundary wrapping
        if (newX < 0) newX = GAME_WIDTH - 20;
        if (newX > GAME_WIDTH - 20) newX = 0;
        if (newY < 0) newY = GAME_HEIGHT - 20;
        if (newY > GAME_HEIGHT - 20) newY = 0;
        
        return { x: newX, y: newY };
      });

      // Check dot collection
      setDots(prevDots => 
        prevDots.map(dot => {
          if (!dot.eaten && Math.abs(dot.x - pacmanPos.x) < 15 && Math.abs(dot.y - pacmanPos.y) < 15) {
            const newScore = score + 10;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...dot, eaten: true };
          }
          return dot;
        })
      );

      // Move ghosts
      setGhosts(prevGhosts => 
        prevGhosts.map(ghost => {
          let newX = ghost.x + ghost.direction.x;
          let newY = ghost.y + ghost.direction.y;
          let newDirection = ghost.direction;

          // Change direction randomly or at boundaries
          if (newX < 20 || newX > GAME_WIDTH - 40 || newY < 20 || newY > GAME_HEIGHT - 40 || Math.random() < 0.1) {
            const directions = [
              { x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }
            ];
            newDirection = directions[Math.floor(Math.random() * directions.length)];
            newX = ghost.x + newDirection.x;
            newY = ghost.y + newDirection.y;
          }

          // Boundary wrapping
          if (newX < 0) newX = GAME_WIDTH - 20;
          if (newX > GAME_WIDTH - 20) newX = 0;
          if (newY < 0) newY = GAME_HEIGHT - 20;
          if (newY > GAME_HEIGHT - 20) newY = 0;

          return { ...ghost, x: newX, y: newY, direction: newDirection };
        })
      );
    }, 150);

    return () => clearInterval(gameLoop);
  }, [gameState, direction, pacmanPos, score, onScoreChange]);

  return (
    <div className="relative bg-black border-2 border-blue-600" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Maze walls */}
      <div className="absolute inset-4 border-2 border-blue-400"></div>
      
      {/* Dots */}
      {dots.map((dot, index) => 
        !dot.eaten && (
          <div
            key={index}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{ left: dot.x, top: dot.y }}
          />
        )
      )}

      {/* Pac-Man */}
      <div 
        className="absolute text-xl animate-pulse"
        style={{ left: pacmanPos.x, top: pacmanPos.y }}
      >
        🟡
      </div>

      {/* Ghosts */}
      {ghosts.map((ghost, index) => (
        <div
          key={index}
          className="absolute text-xl"
          style={{ 
            left: ghost.x, 
            top: ghost.y,
            color: ghost.color
          }}
        >
          👻
        </div>
      ))}
    </div>
  );
};

export default PacManGame;