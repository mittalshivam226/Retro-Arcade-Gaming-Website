import React, { useState, useEffect, useRef, useCallback } from 'react';

interface QBertGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const CUBE_SIZE = 38;
const ROWS = 7;

// Isometric projection helpers
const isoX = (col: number, row: number) => 200 + (col - row) * (CUBE_SIZE / 2);
const isoY = (row: number) => 60 + row * (CUBE_SIZE * 0.6);

const QBertGame: React.FC<QBertGameProps> = ({ onScoreChange, gameState }) => {
  // Pyramid shape: row i has (ROWS - i) cubes
  const [cubes, setCubes] = useState<boolean[][]>(() =>
    Array.from({ length: ROWS }, (_, row) => Array(ROWS - row).fill(false))
  );
  const [qbertPos, setQbertPos] = useState({ row: 0, col: 0 });
  const [enemies, setEnemies] = useState<Array<{ row: number; col: number; id: number; dir: number }>>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);

  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const qbertRef = useRef(qbertPos);
  const enemiesRef = useRef(enemies);
  const cubesRef = useRef(cubes);
  const enemyIdRef = useRef(0);

  scoreRef.current = score;
  livesRef.current = lives;
  qbertRef.current = qbertPos;
  enemiesRef.current = enemies;
  cubesRef.current = cubes;

  // Check if valid position on pyramid
  const isValidPos = useCallback((row: number, col: number) => {
    if (row < 0 || row >= ROWS) return false;
    if (col < 0 || col >= ROWS - row) return false;
    return true;
  }, []);

  // Land on a cube — flip it and score (once per cube)
  const landOnCube = useCallback((row: number, col: number, currentCubes: boolean[][]) => {
    if (!currentCubes[row] || currentCubes[row][col] === undefined) return currentCubes;
    if (currentCubes[row][col]) return currentCubes; // Already flipped

    const newCubes = currentCubes.map(r => [...r]);
    newCubes[row][col] = true;

    const newScore = scoreRef.current + 25;
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreChange(newScore);

    // Check level complete
    if (newCubes.every(r => r.every(c => c))) {
      setLevelComplete(true);
      const bonus = scoreRef.current + 1000;
      scoreRef.current = bonus;
      setScore(bonus);
      onScoreChange(bonus);
    }

    return newCubes;
  }, [onScoreChange]);

  // Land on starting position
  useEffect(() => {
    setCubes(prev => landOnCube(0, 0, prev));
  }, [landOnCube]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver || levelComplete) return;

    const { row, col } = qbertRef.current;
    let newRow = row;
    let newCol = col;

    switch (event.key) {
      case 'ArrowUp':    newRow = row - 1; newCol = col - 1; break; // Up-left
      case 'ArrowRight': newRow = row - 1; newCol = col;     break; // Up-right
      case 'ArrowLeft':  newRow = row + 1; newCol = col;     break; // Down-left
      case 'ArrowDown':  newRow = row + 1; newCol = col + 1; break; // Down-right
      default: return;
    }

    if (!isValidPos(newRow, newCol)) {
      // Fell off pyramid
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) setGameOver(true);
      else {
        setQbertPos({ row: 0, col: 0 });
        setCubes(prev => landOnCube(0, 0, prev));
      }
      return;
    }

    setQbertPos({ row: newRow, col: newCol });
    qbertRef.current = { row: newRow, col: newCol };
    setCubes(prev => landOnCube(newRow, newCol, prev));
  }, [gameState, gameOver, levelComplete, isValidPos, landOnCube]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Spawn enemies
  useEffect(() => {
    if (gameState !== 'playing' || gameOver || levelComplete) return;

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.4) {
        const id = enemyIdRef.current++;
        setEnemies(prev => [...prev, { row: 0, col: ROWS - 1, id, dir: 1 }]);
      }
    }, 3000);

    return () => clearInterval(spawnInterval);
  }, [gameState, gameOver, levelComplete]);

  // Enemy movement
  useEffect(() => {
    if (gameState !== 'playing' || gameOver || levelComplete) return;

    const enemyLoop = setInterval(() => {
      setEnemies(prev =>
        prev
          .map(enemy => {
            // Move down randomly
            const choice = Math.random() > 0.5;
            const newRow = enemy.row + 1;
            const newCol = choice ? enemy.col : enemy.col + 1;
            return { ...enemy, row: newRow, col: newCol };
          })
          .filter(e => isValidPos(e.row, e.col))
      );

      // Check enemy-qbert collision
      const qbert = qbertRef.current;
      setEnemies(prevEnemies => {
        const hit = prevEnemies.some(e => e.row === qbert.row && e.col === qbert.col);
        if (hit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) setGameOver(true);
          else {
            setQbertPos({ row: 0, col: 0 });
          }
          return prevEnemies.filter(e => !(e.row === qbert.row && e.col === qbert.col));
        }
        return prevEnemies;
      });
    }, 1000);

    return () => clearInterval(enemyLoop);
  }, [gameState, gameOver, levelComplete, isValidPos]);

  return (
    <div
      className="relative bg-black"
      style={{ width: 400, height: 420 }}
    >
      {/* Pyramid cubes */}
      {cubes.map((row, rowIdx) =>
        row.map((flipped, colIdx) => {
          const x = isoX(colIdx, rowIdx);
          const y = isoY(rowIdx);
          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className="absolute border border-orange-200 transition-colors duration-200"
              style={{
                left: x - CUBE_SIZE / 2,
                top: y,
                width: CUBE_SIZE,
                height: CUBE_SIZE * 0.6,
                background: flipped
                  ? 'linear-gradient(135deg, #eab308, #f97316)'
                  : 'linear-gradient(135deg, #c2410c, #ea580c)',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            />
          );
        })
      )}

      {/* Enemies */}
      {enemies.map(enemy => {
        if (!isValidPos(enemy.row, enemy.col)) return null;
        return (
          <div
            key={enemy.id}
            className="absolute text-lg z-20"
            style={{
              left: isoX(enemy.col, enemy.row) - 12,
              top: isoY(enemy.row) - 20
            }}
          >
            🟣
          </div>
        );
      })}

      {/* Q*Bert */}
      <div
        className="absolute text-2xl z-30"
        style={{
          left: isoX(qbertPos.col, qbertPos.row) - 14,
          top: isoY(qbertPos.row) - 24
        }}
      >
        🟠
      </div>

      {/* UI */}
      <div className="absolute top-2 left-2 text-orange-400 text-xs">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))}
      </div>
      <div className="absolute bottom-2 left-2 text-orange-300 text-xs">
        ↑: Up-Left | →: Up-Right | ↓: Down-Right | ←: Down-Left
      </div>

      {/* Level Complete */}
      {levelComplete && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-yellow-400 text-2xl font-bold mb-3">LEVEL COMPLETE! 🎉</div>
          <div className="text-white text-lg">Score: {score}</div>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
          <div className="text-white text-lg">Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default QBertGame;