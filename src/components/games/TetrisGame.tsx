import React, { useState, useEffect, useCallback } from 'react';

interface TetrisGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

interface Tetromino {
  shape: number[][];
  color: string;
}

interface CurrentPiece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const TETROMINOS: Record<string, Tetromino> = {
  I: { shape: [[1, 1, 1, 1]], color: 'cyan' },
  O: { shape: [[1, 1], [1, 1]], color: 'yellow' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' }
};

const TetrisGame: React.FC<TetrisGameProps> = ({ onScoreChange, gameState }) => {
  const [board, setBoard] = useState<string[][]>([]);
  const [currentPiece, setCurrentPiece] = useState<CurrentPiece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);

  // Initialize board
  useEffect(() => {
    const initialBoard = Array(BOARD_HEIGHT).fill(null).map(() => 
      Array(BOARD_WIDTH).fill('')
    );
    setBoard(initialBoard);
    spawnNewPiece();
    generateNextPiece();
  }, []);

  const spawnNewPiece = () => {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    const piece = TETROMINOS[randomPiece];

    const newPiece: CurrentPiece = {
      shape: piece.shape,
      color: piece.color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0
    };

    setCurrentPiece(nextPiece ? { ...nextPiece, x: newPiece.x, y: newPiece.y } : newPiece);
    generateNextPiece();
  };

  const generateNextPiece = () => {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    const piece = TETROMINOS[randomPiece];
    setNextPiece({ shape: piece.shape, color: piece.color });
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || !currentPiece) return;

    switch (event.key) {
      case 'ArrowLeft':
        setCurrentPiece(prev => {
          if (prev && canMovePiece(prev, -1, 0)) {
            return { ...prev, x: prev.x - 1 };
          }
          return prev;
        });
        break;
      case 'ArrowRight':
        setCurrentPiece(prev => {
          if (prev && canMovePiece(prev, 1, 0)) {
            return { ...prev, x: prev.x + 1 };
          }
          return prev;
        });
        break;
      case 'ArrowDown':
        setCurrentPiece(prev => {
          if (prev && canMovePiece(prev, 0, 1)) {
            return { ...prev, y: prev.y + 1 };
          }
          return prev;
        });
        break;
      case ' ':
        event.preventDefault();
        rotatePiece();
        break;
      case 'ArrowUp':
        // Alternative rotate
        setCurrentPiece(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            shape: prev.shape[0].map((_: number, index: number) =>
              prev.shape.map((row: number[]) => row[index]).reverse()
            )
          };
        });
        break;
    }
  }, [gameState, currentPiece]);

  const canMovePiece = (piece: CurrentPiece, deltaX: number, deltaY: number) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + deltaX;
          const newY = piece.y + y + deltaY;

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }

          if (newY >= 0 && board[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const rotatePiece = () => {
    setCurrentPiece(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        shape: prev.shape[0].map((_: number, index: number) =>
          prev.shape.map((row: number[]) => row[index]).reverse()
        )
      };
    });
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const clearLines = (board: string[][]) => {
    const linesToClear: number[] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y].every(cell => cell !== '')) {
        linesToClear.push(y);
      }
    }

    if (linesToClear.length > 0) {
      const newBoard = board.filter((_, index) => !linesToClear.includes(index));
      while (newBoard.length < BOARD_HEIGHT) {
        newBoard.unshift(Array(BOARD_WIDTH).fill(''));
      }

      const newLines = lines + linesToClear.length;
      const newLevel = Math.floor(newLines / 10) + 1;
      const lineScore = linesToClear.length * 100 * level;

      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);
      onScoreChange(score + lineScore);

      return newBoard;
    }
    return board;
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      if (currentPiece && canMovePiece(currentPiece, 0, 1)) {
        setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : prev);
      } else if (currentPiece) {
        // Lock piece in place
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(row => [...row]);
          currentPiece.shape.forEach((row: number[], y: number) => {
            row.forEach((cell: number, x: number) => {
              if (cell && currentPiece.y + y >= 0) {
                newBoard[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
              }
            });
          });

          // Clear completed lines
          return clearLines(newBoard);
        });

        // Check for game over
        if (currentPiece.y <= 0) {
          // Game over - pieces reached the top
          return;
        }

        spawnNewPiece();
      }
    }, Math.max(100, 1000 - (level - 1) * 100));

    return () => clearInterval(gameLoop);
  }, [gameState, level, currentPiece, lines, score, onScoreChange]);

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    // Add current piece to display board
    if (currentPiece) {
      currentPiece.shape.forEach((row: number[], y: number) => {
        row.forEach((cell: number, x: number) => {
          if (cell && currentPiece.y + y >= 0 && currentPiece.y + y < BOARD_HEIGHT &&
              currentPiece.x + x >= 0 && currentPiece.x + x < BOARD_WIDTH) {
            displayBoard[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
          }
        });
      });
    }

    return displayBoard.map((row, y) =>
      row.map((cell, x) => (
        <div
          key={`${x}-${y}`}
          className={`tetris-cell ${cell ? `tetris-${cell}` : ''}`}
        />
      ))
    );
  };

  return (
    <div className="tetris-game">
      <div className="tetris-board">
        {renderBoard()}
      </div>
      <div className="tetris-info">
        <div className="info-panel">
          <div>SCORE: {score}</div>
          <div>LEVEL: {level}</div>
          <div>LINES: {lines}</div>
        </div>
        <div className="next-piece">
          <div>NEXT:</div>
          <div className="next-preview">
            {nextPiece && nextPiece.shape.map((row: number[], y: number) =>
              row.map((cell: number, x: number) => (
                <div
                  key={`${x}-${y}`}
                  className={`tetris-cell ${cell ? `tetris-${nextPiece.color}` : ''}`}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;