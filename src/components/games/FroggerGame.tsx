import React, { useState, useEffect, useCallback } from 'react';

interface FroggerGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;
const CELL_SIZE = 25;

const FroggerGame: React.FC<FroggerGameProps> = ({ onScoreChange, gameState }) => {
  const [frogPos, setFrogPos] = useState({ x: 200, y: 450 });
  const [cars, setCars] = useState<Array<{ x: number; y: number; speed: number; direction: number }>>([]);
  const [logs, setLogs] = useState<Array<{ x: number; y: number; speed: number; width: number }>>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Initialize cars and logs
  useEffect(() => {
    const initialCars = [];
    const initialLogs = [];
    
    // Cars on road lanes
    for (let lane = 0; lane < 5; lane++) {
      for (let i = 0; i < 3; i++) {
        initialCars.push({
          x: i * 150,
          y: 350 - lane * 50,
          speed: 2 + Math.random() * 2,
          direction: lane % 2 === 0 ? 1 : -1
        });
      }
    }
    
    // Logs on water lanes
    for (let lane = 0; lane < 4; lane++) {
      for (let i = 0; i < 2; i++) {
        initialLogs.push({
          x: i * 200,
          y: 250 - lane * 50,
          speed: 1 + Math.random(),
          width: 80 + Math.random() * 40
        });
      }
    }
    
    setCars(initialCars);
    setLogs(initialLogs);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowUp':
        setFrogPos(prev => ({ ...prev, y: Math.max(0, prev.y - CELL_SIZE) }));
        if (frogPos.y <= 50) {
          const newScore = score + 100;
          setScore(newScore);
          onScoreChange(newScore);
          setFrogPos({ x: 200, y: 450 }); // Reset position
        }
        break;
      case 'ArrowDown':
        setFrogPos(prev => ({ ...prev, y: Math.min(450, prev.y + CELL_SIZE) }));
        break;
      case 'ArrowLeft':
        setFrogPos(prev => ({ ...prev, x: Math.max(0, prev.x - CELL_SIZE) }));
        break;
      case 'ArrowRight':
        setFrogPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 25, prev.x + CELL_SIZE) }));
        break;
    }
  }, [gameState, frogPos.y, score, onScoreChange, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move cars
      setCars(prev => 
        prev.map(car => ({
          ...car,
          x: car.direction > 0 
            ? (car.x + car.speed) % (GAME_WIDTH + 50)
            : car.x - car.speed < -50 ? GAME_WIDTH : car.x - car.speed
        }))
      );

      // Move logs
      setLogs(prev => 
        prev.map(log => ({
          ...log,
          x: (log.x + log.speed) % (GAME_WIDTH + log.width)
        }))
      );

      // Check car collisions
      const carHit = cars.some(car => 
        Math.abs(car.x - frogPos.x) < 30 && 
        Math.abs(car.y - frogPos.y) < 20 &&
        frogPos.y > 100 && frogPos.y < 400
      );

      // Check if frog is on water without log
      const onWater = frogPos.y > 50 && frogPos.y < 250;
      const onLog = logs.some(log => 
        frogPos.x >= log.x && 
        frogPos.x <= log.x + log.width && 
        Math.abs(log.y - frogPos.y) < 20
      );

      if (carHit || (onWater && !onLog)) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
          }
          return newLives;
        });
        setFrogPos({ x: 200, y: 450 });
      }

      // Move frog with log
      if (onWater && onLog) {
        const currentLog = logs.find(log => 
          frogPos.x >= log.x && 
          frogPos.x <= log.x + log.width && 
          Math.abs(log.y - frogPos.y) < 20
        );
        if (currentLog) {
          setFrogPos(prev => ({ ...prev, x: prev.x + currentLog.speed }));
        }
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, frogPos, cars, logs, lives]);

  return (
    <div className="relative" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Goal area */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-green-600"></div>
      
      {/* Water area */}
      <div className="absolute top-12 left-0 right-0 h-48 bg-blue-600"></div>
      
      {/* Safe area */}
      <div className="absolute top-60 left-0 right-0 h-12 bg-yellow-600"></div>
      
      {/* Road area */}
      <div className="absolute top-72 left-0 right-0 h-48 bg-gray-800"></div>
      
      {/* Start area */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-600"></div>

      {/* Cars */}
      {cars.map((car, index) => (
        <div
          key={index}
          className="absolute text-2xl"
          style={{ left: car.x, top: car.y }}
        >
          🚗
        </div>
      ))}

      {/* Logs */}
      {logs.map((log, index) => (
        <div
          key={index}
          className="absolute bg-amber-800 rounded"
          style={{ 
            left: log.x, 
            top: log.y, 
            width: log.width, 
            height: 20 
          }}
        />
      ))}

      {/* Frog */}
      <div 
        className="absolute text-2xl"
        style={{ left: frogPos.x, top: frogPos.y }}
      >
        🐸
      </div>

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-sm">
        Lives: {lives} | Score: {score}
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-4">GAME OVER</div>
          <div className="text-white text-lg mb-4">Final Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default FroggerGame;