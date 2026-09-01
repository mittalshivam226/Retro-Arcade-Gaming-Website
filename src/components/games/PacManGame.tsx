import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PacManGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 380;
const GAME_HEIGHT = 420;

// Static stars
const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb851'];

const PacManGame: React.FC<PacManGameProps> = ({ onScoreChange, gameState }) => {
  const [pacmanPos, setPacmanPos] = useState({ x: 180, y: 300 });
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [dots, setDots] = useState<Array<{ x: number; y: number; eaten: boolean; isPower: boolean }>>([]);
  const [ghosts, setGhosts] = useState<Array<{ x: number; y: number; color: string; direction: { x: number; y: number }; frightened: boolean }>>([]);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Refs to avoid stale closures
  const scoreRef = useRef(score);
  const pacmanRef = useRef(pacmanPos);
  const directionRef = useRef(direction);
  const livesRef = useRef(lives);

  scoreRef.current = score;
  pacmanRef.current = pacmanPos;
  directionRef.current = direction;
  livesRef.current = lives;

  // Initialize dots and ghosts
  useEffect(() => {
    const initialDots: typeof dots = [];
    for (let x = 30; x < GAME_WIDTH - 20; x += 30) {
      for (let y = 30; y < GAME_HEIGHT - 20; y += 30) {
        const isPower = (x < 60 || x > GAME_WIDTH - 60) && (y < 60 || y > GAME_HEIGHT - 60);
        initialDots.push({ x, y, eaten: false, isPower });
      }
    }
    setDots(initialDots);

    setGhosts([
      { x: 180, y: 180, color: GHOST_COLORS[0], direction: { x: 2, y: 0 }, frightened: false },
      { x: 160, y: 180, color: GHOST_COLORS[1], direction: { x: -2, y: 0 }, frightened: false },
      { x: 200, y: 180, color: GHOST_COLORS[2], direction: { x: 0, y: 2 }, frightened: false },
      { x: 180, y: 160, color: GHOST_COLORS[3], direction: { x: 0, y: -2 }, frightened: false }
    ]);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;

    switch (event.key) {
      case 'ArrowUp':    setDirection({ x: 0, y: -3 }); break;
      case 'ArrowDown':  setDirection({ x: 0, y: 3 });  break;
      case 'ArrowLeft':  setDirection({ x: -3, y: 0 }); break;
      case 'ArrowRight': setDirection({ x: 3, y: 0 });  break;
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      const dir = directionRef.current;

      // Move Pac-Man
      setPacmanPos(prev => {
        let newX = prev.x + dir.x;
        let newY = prev.y + dir.y;
        // Boundary wrapping
        if (newX < 0) newX = GAME_WIDTH - 20;
        if (newX > GAME_WIDTH - 20) newX = 0;
        if (newY < 0) newY = GAME_HEIGHT - 20;
        if (newY > GAME_HEIGHT - 20) newY = 0;
        return { x: newX, y: newY };
      });

      // Check dot collection against current Pac-Man position
      const currentPac = pacmanRef.current;
      setDots(prevDots => {
        let ate = false;
        let atePower = false;
        const updated = prevDots.map(dot => {
          if (!dot.eaten && Math.abs(dot.x - currentPac.x) < 14 && Math.abs(dot.y - currentPac.y) < 14) {
            ate = true;
            if (dot.isPower) atePower = true;
            return { ...dot, eaten: true };
          }
          return dot;
        });

        if (ate) {
          const points = atePower ? 50 : 10;
          const newScore = scoreRef.current + points;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);

          if (atePower) {
            setGhosts(prev => prev.map(g => ({ ...g, frightened: true })));
            setTimeout(() => setGhosts(prev => prev.map(g => ({ ...g, frightened: false }))), 5000);
          }
        }
        return updated;
      });

      // Move ghosts
      setGhosts(prevGhosts =>
        prevGhosts.map(ghost => {
          let newX = ghost.x + ghost.direction.x;
          let newY = ghost.y + ghost.direction.y;
          let newDir = ghost.direction;

          if (newX < 10 || newX > GAME_WIDTH - 30 || newY < 10 || newY > GAME_HEIGHT - 30 || Math.random() < 0.05) {
            const dirs = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }];
            newDir = dirs[Math.floor(Math.random() * dirs.length)];
            newX = ghost.x + newDir.x;
            newY = ghost.y + newDir.y;
          }

          newX = Math.max(5, Math.min(GAME_WIDTH - 25, newX));
          newY = Math.max(5, Math.min(GAME_HEIGHT - 25, newY));

          return { ...ghost, x: newX, y: newY, direction: newDir };
        })
      );

      // Ghost-PacMan collision using refs
      const pac = pacmanRef.current;
      setGhosts(prevGhosts => {
        for (const ghost of prevGhosts) {
          if (Math.abs(ghost.x - pac.x) < 18 && Math.abs(ghost.y - pac.y) < 18) {
            if (ghost.frightened) {
              // Eat ghost
              const newScore = scoreRef.current + 200;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreChange(newScore);
              return prevGhosts.map(g =>
                g.color === ghost.color
                  ? { ...g, x: 180, y: 180, frightened: false }
                  : g
              );
            } else {
              // Lose a life
              const newLives = livesRef.current - 1;
              livesRef.current = newLives;
              setLives(newLives);
              if (newLives <= 0) setGameOver(true);
              setPacmanPos({ x: 180, y: 300 });
            }
          }
        }
        return prevGhosts;
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]);

  return (
    <div
      className="relative bg-black border-2 border-blue-600"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
    >
      {/* Maze outline */}
      <div className="absolute border-2 border-blue-400" style={{ inset: 8 }} />

      {/* Dots */}
      {dots.map((dot, index) =>
        !dot.eaten && (
          <div
            key={index}
            className={`absolute rounded-full ${dot.isPower ? 'bg-yellow-200 animate-pulse' : 'bg-yellow-400'}`}
            style={{
              left: dot.x,
              top: dot.y,
              width: dot.isPower ? 10 : 5,
              height: dot.isPower ? 10 : 5
            }}
          />
        )
      )}

      {/* Pac-Man */}
      <div
        className="absolute text-xl"
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
            filter: ghost.frightened ? 'hue-rotate(180deg) brightness(0.8)' : undefined
          }}
        >
          👻
        </div>
      ))}

      {/* UI */}
      <div className="absolute top-1 left-2 text-yellow-400 text-xs">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-1 left-2 text-blue-400 text-xs">
        Arrow Keys: Move
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-3">GAME OVER</div>
          <div className="text-white text-lg">Final Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default PacManGame;