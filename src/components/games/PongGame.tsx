import React, { useState, useEffect, useCallback } from 'react';

interface PongGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const PADDLE_HEIGHT = 60;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;

const PongGame: React.FC<PongGameProps> = ({ onScoreChange, gameState }) => {
  const [leftPaddle, setLeftPaddle] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [rightPaddle, setRightPaddle] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ball, setBall] = useState({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    dx: 3,
    dy: 3
  });
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

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
  }, [gameState, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      setBall(prevBall => {
        let newBall = { ...prevBall };

        // Move ball
        newBall.x += newBall.dx;
        newBall.y += newBall.dy;

        // Ball collision with top/bottom walls
        if (newBall.y <= 0 || newBall.y >= GAME_HEIGHT - BALL_SIZE) {
          newBall.dy = -newBall.dy;
        }

        // Ball collision with paddles
        if (newBall.x <= PADDLE_WIDTH &&
            newBall.y >= leftPaddle &&
            newBall.y <= leftPaddle + PADDLE_HEIGHT) {
          newBall.dx = -newBall.dx;
          // Increase speed slightly on paddle hit
          newBall.dx *= 1.1;
          newBall.dy *= 1.1;
        }

        if (newBall.x >= GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
            newBall.y >= rightPaddle &&
            newBall.y <= rightPaddle + PADDLE_HEIGHT) {
          newBall.dx = -newBall.dx;
          // Increase speed slightly on paddle hit
          newBall.dx *= 1.1;
          newBall.dy *= 1.1;
        }

        // Score and check for game over
        if (newBall.x < 0) {
          setScore(prev => {
            const newScore = { ...prev, right: prev.right + 1 };
            onScoreChange(newScore.left + newScore.right);

            // Check for game over (first to 5 points)
            if (newScore.right >= 5) {
              setGameOver(true);
              setWinner('Right Player');
            }

            return newScore;
          });
          newBall = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            dx: 3,
            dy: 3
          };
        }

        if (newBall.x > GAME_WIDTH) {
          setScore(prev => {
            const newScore = { ...prev, left: prev.left + 1 };
            onScoreChange(newScore.left + newScore.right);

            // Check for game over (first to 5 points)
            if (newScore.left >= 5) {
              setGameOver(true);
              setWinner('Left Player');
            }

            return newScore;
          });
          newBall = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            dx: -3,
            dy: 3
          };
        }

        return newBall;
      });

      // Simple AI for left paddle
      setLeftPaddle(prev => {
        const paddleCenter = prev + PADDLE_HEIGHT / 2;
        const ballCenter = ball.y + BALL_SIZE / 2;

        if (paddleCenter < ballCenter - 10) {
          return Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev + 3);
        } else if (paddleCenter > ballCenter + 10) {
          return Math.max(0, prev - 3);
        }
        return prev;
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameState, ball.y, leftPaddle, rightPaddle, onScoreChange, gameOver]);

  return (
    <div className="pong-game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Left Paddle */}
      <div
        className="paddle left-paddle"
        style={{
          left: 0,
          top: leftPaddle,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT
        }}
      />

      {/* Right Paddle */}
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
        <div>W/S: Left Paddle</div>
        <div>↑/↓: Right Paddle</div>
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center flex-col">
          <div className="text-green-500 text-2xl font-bold mb-4">GAME OVER</div>
          <div className="text-white text-lg mb-4">{winner} Wins!</div>
          <div className="text-white text-md">Final Score: {score.left} - {score.right}</div>
        </div>
      )}
    </div>
  );
};

export default PongGame;