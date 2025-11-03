import React, { useState, useEffect, useCallback } from 'react';

interface QBertGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GRID_SIZE = 7;
const CUBE_SIZE = 40;

const QBertGame: React.FC<QBertGameProps> = ({ onScoreChange, gameState }) => {
  const [qbertPos, setQbertPos] = useState({ x: 0, y: 0 });
  const [cubes, setCubes] = useState<boolean[][]>([]);
  const [score, setScore] = useState(0);

  // Initialize pyramid
  useEffect(() => {
    const initialCubes = Array(GRID_SIZE).fill(null).map((_, row) => 
      Array(GRID_SIZE - row).fill(false)
    );
    setCubes(initialCubes);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowUp':
        setQbertPos(prev => ({ 
          x: Math.max(0, prev.x - 1), 
          y: Math.max(0, prev.y - 1) 
        }));
        break;
      case 'ArrowDown':
        setQbertPos(prev => ({ 
          x: Math.min(GRID_SIZE - prev.y - 2, prev.x + 1), 
          y: Math.min(GRID_SIZE - 1, prev.y + 1) 
        }));
        break;
      case 'ArrowLeft':
        setQbertPos(prev => ({ 
          x: Math.max(0, prev.x - 1), 
          y: prev.y 
        }));
        break;
      case 'ArrowRight':
        setQbertPos(prev => ({ 
          x: Math.min(GRID_SIZE - prev.y - 2, prev.x + 1), 
          y: prev.y 
        }));
        break;
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game logic
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Change cube color when Q*bert lands on it
      setCubes(prev => {
        const newCubes = [...prev];
        if (newCubes[qbertPos.y] && !newCubes[qbertPos.y][qbertPos.x]) {
          newCubes[qbertPos.y] = [...newCubes[qbertPos.y]];
          newCubes[qbertPos.y][qbertPos.x] = true;
          
          const newScore = score + 25;
          setScore(newScore);
          onScoreChange(newScore);
        }
        return newCubes;
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [gameState, qbertPos, score, onScoreChange]);

  return (
    <div className="relative bg-black flex items-center justify-center" style={{ width: 400, height: 400 }}>
      {/* Pyramid */}
      {cubes.map((row, y) =>
        row.map((changed, x) => (
          <div
            key={`${x}-${y}`}
            className={`absolute border-2 ${changed ? 'bg-yellow-500 border-yellow-300' : 'bg-orange-500 border-orange-300'}`}
            style={{
              left: 200 + (x - y) * (CUBE_SIZE / 2),
              top: 50 + y * (CUBE_SIZE / 2),
              width: CUBE_SIZE,
              height: CUBE_SIZE,
              transform: 'rotateX(60deg) rotateY(-30deg)'
            }}
          />
        ))
      )}

      {/* Q*bert */}
      <div 
        className="absolute text-2xl z-10"
        style={{ 
          left: 200 + (qbertPos.x - qbertPos.y) * (CUBE_SIZE / 2) + 10,
          top: 50 + qbertPos.y * (CUBE_SIZE / 2) - 10
        }}
      >
        🔶
      </div>
    </div>
  );
};

export default QBertGame;