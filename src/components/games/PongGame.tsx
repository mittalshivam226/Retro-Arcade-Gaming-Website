import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PongGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const PADDLE_HEIGHT = 60;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const MAX_BALL_SPEED = 10;

const PongGame: React.FC<PongGameProps> = ({ onScoreChange, gameState }) => {
  const [leftPaddle, setLeftPaddle] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [rightPaddle, setRightPaddle] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ball, setBall] = useState({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    dx: 3,
    dy: 2
  });
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Use refs to avoid stale closures in the game loop
  const leftPaddleRef = useRef(leftPaddle);
  const rightPaddleRef = useRef(rightPaddle);
  const ballRef = useRef(ball);
  const scoreRef = useRef(score);
  const gameOverRef = useRef(gameOver);

  leftPaddleRef.current = leftPaddle;
  rightPaddleRef.current = rightPaddle;
  ballRef.current = ball;
  scoreRef.current = score;
  gameOverRef.current = gameOver;

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOverRef.current) return;

    switch (event.key) {
      case 'ArrowUp':
        setRightPaddle(prev => Math.max(0, prev - 20));
        break;
      case 'ArrowDown':
        setRightPaddle(prev => Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev + 20));
        break;
      case 'w':
      case 'W':
        setLeftPaddle(prev => Math.max(0, prev - 20));
        break;
      case 's':
      case 'S':
        setLeftPaddle(prev => Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev + 20));
        break;
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop — no rapidly-changing state in deps, use refs instead
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      if (gameOverRef.current) return;

      setBall(prevBall => {
        const newBall = { ...prevBall };

        // Move ball
        newBall.x += newBall.dx;
        newBall.y += newBall.dy;

        // Ball collision with top/bottom walls
        if (newBall.y <= 0) {
          newBall.y = 0;
          newBall.dy = Math.abs(newBall.dy);
        }
        if (newBall.y >= GAME_HEIGHT - BALL_SIZE) {
          newBall.y = GAME_HEIGHT - BALL_SIZE;
          newBall.dy = -Math.abs(newBall.dy);
        }

        // Ball collision with left paddle (AI-controlled)
        if (
          newBall.x <= PADDLE_WIDTH + 2 &&
          newBall.x >= 0 &&
          newBall.y >= leftPaddleRef.current &&
          newBall.y <= leftPaddleRef.current + PADDLE_HEIGHT
        ) {
          newBall.x = PADDLE_WIDTH + 2;
          // Add angle based on where ball hits paddle
          const relativeHit = (newBall.y - leftPaddleRef.current) / PADDLE_HEIGHT;
          newBall.dy = (relativeHit - 0.5) * 8;
          newBall.dx = Math.abs(newBall.dx) * 1.05;
          // Cap speed
          newBall.dx = Math.min(newBall.dx, MAX_BALL_SPEED);
          newBall.dy = Math.max(-MAX_BALL_SPEED, Math.min(MAX_BALL_SPEED, newBall.dy));
        }

        // Ball collision with right paddle (player-controlled)
        if (
          newBall.x >= GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE - 2 &&
          newBall.x <= GAME_WIDTH &&
          newBall.y >= rightPaddleRef.current &&
          newBall.y <= rightPaddleRef.current + PADDLE_HEIGHT
        ) {
          newBall.x = GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE - 2;
          const relativeHit = (newBall.y - rightPaddleRef.current) / PADDLE_HEIGHT;
          newBall.dy = (relativeHit - 0.5) * 8;
          newBall.dx = -Math.abs(newBall.dx) * 1.05;
          // Cap speed
          newBall.dx = Math.max(-MAX_BALL_SPEED, newBall.dx);
          newBall.dy = Math.max(-MAX_BALL_SPEED, Math.min(MAX_BALL_SPEED, newBall.dy));
        }

        // Ball exits left — right scores
        if (newBall.x < 0) {
          const newScore = { ...scoreRef.current, right: scoreRef.current.right + 1 };
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore.left + newScore.right);
          if (newScore.right >= 5) {
            setGameOver(true);
            setWinner('RIGHT PLAYER');
          }
          return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: 3, dy: 2 };
        }

        // Ball exits right — left scores
        if (newBall.x > GAME_WIDTH) {
          const newScore = { ...scoreRef.current, left: scoreRef.current.left + 1 };
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore.left + newScore.right);
          if (newScore.left >= 5) {
            setGameOver(true);
            setWinner('LEFT PLAYER (AI)');
          }
          return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: -3, dy: 2 };
        }

        return newBall;
      });

      // AI for left paddle — reads from refs (no stale closure)
      setLeftPaddle(prev => {
        const paddleCenter = prev + PADDLE_HEIGHT / 2;
        const ballCenter = ballRef.current.y + BALL_SIZE / 2;
        const speed = 2.5;
        if (paddleCenter < ballCenter - 8) {
          return Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev + speed);
        } else if (paddleCenter > ballCenter + 8) {
          return Math.max(0, prev - speed);
        }
        return prev;
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameState, onScoreChange]); // ✅ No ball.y — no pile-up

  return (
    <div className="pong-game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Left Paddle (AI) */}
      <div
        className="paddle left-paddle"
        style={{
          left: 0,
          top: leftPaddle,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT
        }}
      />

      {/* Right Paddle (Player) */}
      <div
        className="paddle right-paddle"
        style={{
          right: 0,
          top: rightPaddle,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT
        }}
      />

      {/* Ball */}
      <div
        className="ball"
        style={{
          left: ball.x,
          top: ball.y,
          width: BALL_SIZE,
          height: BALL_SIZE
        }}
      />

      {/* Center line */}
      <div className="center-line" />

      {/* Score */}
      <div className="pong-score">
        <div className="score-left">{score.left}</div>
        <div className="score-right">{score.right}</div>
      </div>

      {/* Controls hint */}
      <div className="pong-controls">
        <div>W/S: Left (AI)</div>
        <div>↑/↓: Right Paddle</div>
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center flex-col">
          <div className="text-green-500 text-2xl font-bold mb-4">GAME OVER</div>
          <div className="text-yellow-400 text-xl mb-2">{winner} WINS!</div>
          <div className="text-white text-md">Final Score: {score.left} — {score.right}</div>
        </div>
      )}
    </div>
  );
};

export default PongGame;