import React, { useState, useEffect, useCallback } from 'react';

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GRID_SIZE = 20;
const GAME_SIZE = 400;

const SnakeGame: React.FC<SnakeGameProps> = ({ onScoreChange, gameState }) => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const generateFood = () => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * (GAME_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (GAME_SIZE / GRID_SIZE))
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

    return newFood;
  };

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection({ x: 0, y: 0 });
    setScore(0);
    setGameOver(false);
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;
    
    switch (event.key) {
      case 'ArrowUp':
        if (direction.y === 0) setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
        if (direction.y === 0) setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
        if (direction.x === 0) setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
        if (direction.x === 0) setDirection({ x: 1, y: 0 });
        break;
    }
  }, [gameState, direction, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      if (direction.x === 0 && direction.y === 0) return;
      
      setSnake(prevSnake => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };
        
        head.x += direction.x;
        head.y += direction.y;

        // Boundary wrapping (like Pac-Man)
        if (head.x < 0) head.x = (GAME_SIZE / GRID_SIZE) - 1;
        if (head.x >= GAME_SIZE / GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = (GAME_SIZE / GRID_SIZE) - 1;
        if (head.y >= GAME_SIZE / GRID_SIZE) head.y = 0;

        // Check self collision
        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          return prevSnake;
        }

        newSnake.unshift(head);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setFood(generateFood());
          const newScore = score + 10;
          setScore(newScore);
          onScoreChange(newScore);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 150);

    return () => clearInterval(gameLoop);
  }, [gameState, direction, food, score, gameOver, snake, onScoreChange]);

  return (
    <div className="snake-game" style={{ width: GAME_SIZE, height: GAME_SIZE }}>
      <div className="game-grid">
        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className={`snake-segment ${index === 0 ? 'snake-head' : ''}`}
            style={{
              left: segment.x * GRID_SIZE,
              top: segment.y * GRID_SIZE,
              width: GRID_SIZE - 1,
              height: GRID_SIZE - 1
            }}
          />
        ))}

        {/* Food */}
        <div
          className="snake-food"
          style={{
            left: food.x * GRID_SIZE,
            top: food.y * GRID_SIZE,
            width: GRID_SIZE - 1,
            height: GRID_SIZE - 1
          }}
        />
        
        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center flex-col">
            <div className="text-red-500 text-2xl font-bold mb-4">GAME OVER</div>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;