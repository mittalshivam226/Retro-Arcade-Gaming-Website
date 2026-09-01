import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GRID_SIZE = 20;
const GAME_SIZE = 400;
const CELLS = GAME_SIZE / GRID_SIZE; // 20 cells

const SnakeGame: React.FC<SnakeGameProps> = ({ onScoreChange, gameState }) => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  // Refs to avoid stale closures
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const directionRef = useRef(direction);
  const scoreRef = useRef(score);
  const nextDirRef = useRef(direction); // Buffer for next direction input

  snakeRef.current = snake;
  foodRef.current = food;
  directionRef.current = direction;
  scoreRef.current = score;

  const generateFood = useCallback((currentSnake: typeof snake) => {
    let newFood: { x: number; y: number };
    do {
      newFood = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS)
      };
    } while (currentSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    const newSnake = [{ x: 10, y: 10 }];
    const newFood = generateFood(newSnake);
    setSnake(newSnake);
    setFood(newFood);
    const initialDir = { x: 1, y: 0 };
    setDirection(initialDir);
    nextDirRef.current = initialDir;
    setScore(0);
    setGameOver(false);
    setLevel(1);
  }, [generateFood]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    if (gameOver) {
      if (event.key === ' ' || event.key === 'Enter') resetGame();
      return;
    }

    // Buffer next direction — prevent 180° reversal
    const cur = directionRef.current;
    switch (event.key) {
      case 'ArrowUp':
        if (cur.y === 0) nextDirRef.current = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
        if (cur.y === 0) nextDirRef.current = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
        if (cur.x === 0) nextDirRef.current = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
        if (cur.x === 0) nextDirRef.current = { x: 1, y: 0 };
        break;
    }
  }, [gameState, gameOver, resetGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop — no snake/food/direction in deps
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const speed = Math.max(80, 200 - (level - 1) * 20);

    const gameLoop = setInterval(() => {
      // Apply buffered direction
      const newDir = nextDirRef.current;
      setDirection(newDir);
      directionRef.current = newDir;

      setSnake(prevSnake => {
        const head = {
          x: prevSnake[0].x + newDir.x,
          y: prevSnake[0].y + newDir.y
        };

        // Wall collision
        if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS) {
          setGameOver(true);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check food
        const currentFood = foodRef.current;
        if (head.x === currentFood.x && head.y === currentFood.y) {
          const newScore = scoreRef.current + 10;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);
          const newLevel = Math.floor(newScore / 100) + 1;
          setLevel(newLevel);
          const newFood = generateFood(newSnake);
          setFood(newFood);
          foodRef.current = newFood;
          // Don't pop — snake grows
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, level, onScoreChange, generateFood]); // ✅ No snake/food in deps

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

        {/* UI overlay */}
        <div className="absolute top-1 left-2 text-green-400 text-xs">
          SCORE: {score} | LVL: {level} | Length: {snake.length}
        </div>
        <div className="absolute bottom-1 left-2 text-green-400 text-xs">
          Arrow Keys: Move
        </div>

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
            <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
            <div className="text-white text-lg mb-2">Score: {score}</div>
            <div className="text-green-400 text-sm animate-pulse">SPACE / ENTER to restart</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;