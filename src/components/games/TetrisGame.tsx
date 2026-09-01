import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TetrisGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_PX = 18;

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

const PIECE_KEYS = Object.keys(TETROMINOS);

const randomPiece = (): Tetromino => TETROMINOS[PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]];

const rotateCW = (shape: number[][]): number[][] =>
  shape[0].map((_, colIdx) => shape.map(row => row[colIdx]).reverse());

const TetrisGame: React.FC<TetrisGameProps> = ({ onScoreChange, gameState }) => {
  const emptyBoard = (): string[][] =>
    Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(''));

  const [board, setBoard] = useState<string[][]>(emptyBoard);
  const [currentPiece, setCurrentPiece] = useState<CurrentPiece | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino>(randomPiece());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Refs for use inside game loop without stale closures
  const boardRef = useRef(board);
  const currentPieceRef = useRef(currentPiece);
  const nextPieceRef = useRef(nextPiece);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);

  boardRef.current = board;
  currentPieceRef.current = currentPiece;
  nextPieceRef.current = nextPiece;
  scoreRef.current = score;
  linesRef.current = lines;
  levelRef.current = level;

  const spawnPiece = useCallback((next: Tetromino): CurrentPiece => ({
    shape: next.shape,
    color: next.color,
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(next.shape[0].length / 2),
    y: 0
  }), []);

  // Initialize
  useEffect(() => {
    const first = randomPiece();
    const second = randomPiece();
    setCurrentPiece(spawnPiece(first));
    setNextPiece(second);
  }, [spawnPiece]);

  const canPlace = useCallback((piece: CurrentPiece, dx: number, dy: number, currentBoard: string[][]): boolean => {
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (!piece.shape[row][col]) continue;
        const nx = piece.x + col + dx;
        const ny = piece.y + row + dy;
        if (nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) return false;
        if (ny >= 0 && currentBoard[ny][nx]) return false;
      }
    }
    return true;
  }, []);

  const lockPiece = useCallback((piece: CurrentPiece, currentBoard: string[][]): string[][] => {
    const newBoard = currentBoard.map(row => [...row]);
    piece.shape.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        if (cell && piece.y + rowIdx >= 0) {
          newBoard[piece.y + rowIdx][piece.x + colIdx] = piece.color;
        }
      });
    });
    return newBoard;
  }, []);

  const clearLines = useCallback((board: string[][]): { newBoard: string[][]; cleared: number } => {
    const surviving = board.filter(row => row.some(cell => !cell));
    const cleared = BOARD_HEIGHT - surviving.length;
    const newRows = Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(''));
    return { newBoard: [...newRows, ...surviving], cleared };
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    const piece = currentPieceRef.current;
    if (!piece) return;
    const board = boardRef.current;

    switch (event.key) {
      case 'ArrowLeft':
        if (canPlace(piece, -1, 0, board)) {
          setCurrentPiece(prev => prev ? { ...prev, x: prev.x - 1 } : prev);
        }
        break;
      case 'ArrowRight':
        if (canPlace(piece, 1, 0, board)) {
          setCurrentPiece(prev => prev ? { ...prev, x: prev.x + 1 } : prev);
        }
        break;
      case 'ArrowDown':
        if (canPlace(piece, 0, 1, board)) {
          setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : prev);
        }
        break;
      case 'ArrowUp':
      case ' ': {
        event.preventDefault();
        const rotated = rotateCW(piece.shape);
        const rotPiece = { ...piece, shape: rotated };
        if (canPlace(rotPiece, 0, 0, board)) {
          setCurrentPiece(rotPiece);
        } else if (canPlace(rotPiece, 1, 0, board)) {
          setCurrentPiece({ ...rotPiece, x: rotPiece.x + 1 });
        } else if (canPlace(rotPiece, -1, 0, board)) {
          setCurrentPiece({ ...rotPiece, x: rotPiece.x - 1 });
        }
        break;
      }
    }
  }, [gameState, gameOver, canPlace]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop — gravity
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const speed = Math.max(100, 800 - (levelRef.current - 1) * 80);

    const gameLoop = setInterval(() => {
      const piece = currentPieceRef.current;
      if (!piece) return;
      const board = boardRef.current;

      if (canPlace(piece, 0, 1, board)) {
        setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : prev);
      } else {
        // Lock piece
        const locked = lockPiece(piece, board);
        const { newBoard, cleared } = clearLines(locked);

        setBoard(newBoard);
        boardRef.current = newBoard;

        // Update scoring using refs (no stale values)
        if (cleared > 0) {
          const linePts = [0, 100, 300, 500, 800][cleared] * levelRef.current;
          const newScore = scoreRef.current + linePts;
          const newLines = linesRef.current + cleared;
          const newLevel = Math.floor(newLines / 10) + 1;

          scoreRef.current = newScore;
          linesRef.current = newLines;
          levelRef.current = newLevel;

          setScore(newScore);
          setLines(newLines);
          setLevel(newLevel);
          onScoreChange(newScore);
        }

        // Check game over
        if (piece.y <= 0) {
          setGameOver(true);
          return;
        }

        // Spawn next piece
        const next = nextPieceRef.current;
        const newPiece = spawnPiece(next);
        const newNext = randomPiece();

        setCurrentPiece(newPiece);
        setNextPiece(newNext);
        currentPieceRef.current = newPiece;
        nextPieceRef.current = newNext;
      }
    }, speed);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, level, onScoreChange, canPlace, lockPiece, clearLines, spawnPiece]);

  // Build display board (board + current piece overlay)
  const displayBoard = board.map(row => [...row]);
  if (currentPiece) {
    currentPiece.shape.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        const y = currentPiece.y + rowIdx;
        const x = currentPiece.x + colIdx;
        if (cell && y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          displayBoard[y][x] = currentPiece.color;
        }
      });
    });
  }

  const colorMap: Record<string, string> = {
    cyan: '#00ffff', yellow: '#ffff00', purple: '#a855f7',
    green: '#22c55e', red: '#ef4444', blue: '#3b82f6', orange: '#f97316'
  };

  return (
    <div className="tetris-game">
      <div className="tetris-board">
        {displayBoard.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className="tetris-cell"
              style={{ backgroundColor: cell ? colorMap[cell] : undefined }}
            />
          ))
        )}
      </div>
      <div className="tetris-info">
        <div className="info-panel">
          <div>SCORE</div>
          <div className="text-yellow-400">{score}</div>
          <div className="mt-2">LEVEL</div>
          <div className="text-green-400">{level}</div>
          <div className="mt-2">LINES</div>
          <div className="text-blue-400">{lines}</div>
        </div>
        <div className="next-piece">
          <div className="text-xs mb-1">NEXT:</div>
          <div
            className="next-preview"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, ${CELL_PX}px)` }}
          >
            {nextPiece.shape.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="tetris-cell"
                  style={{ backgroundColor: cell ? colorMap[nextPiece.color] : undefined }}
                />
              ))
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          ←→: Move<br />
          ↓: Drop<br />
          ↑/SPACE: Rotate
        </div>
        {gameOver && (
          <div className="mt-4 text-red-500 text-xs font-bold animate-pulse">
            GAME OVER
          </div>
        )}
      </div>
    </div>
  );
};

export default TetrisGame;