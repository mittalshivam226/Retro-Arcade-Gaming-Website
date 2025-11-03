import React, { useState, useEffect, useCallback } from 'react';

interface SpaceInvadersGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

const SpaceInvadersGame: React.FC<SpaceInvadersGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState(GAME_WIDTH / 2);
  const [bullets, setBullets] = useState<Array<{ x: number; y: number }>>([]);
  const [invaderBullets, setInvaderBullets] = useState<Array<{ x: number; y: number }>>([]);
  const [invaders, setInvaders] = useState<Array<{ x: number; y: number; alive: boolean }>>([]);
  const [score, setScore] = useState(0);
  const [invaderDirection, setInvaderDirection] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  // Initialize invaders
  useEffect(() => {
    const initialInvaders = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        initialInvaders.push({
          x: col * 35 + 50,
          y: row * 30 + 50,
          alive: true
        });
      }
    }
    setInvaders(initialInvaders);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => Math.max(20, prev - 10));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => Math.min(GAME_WIDTH - 20, prev + 10));
        break;
      case ' ':
        setBullets(prev => [...prev, { x: playerPos, y: GAME_HEIGHT - 80 }]);
        break;
    }
  }, [gameState, playerPos, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      // Move bullets
      setBullets(prev =>
        prev.map(bullet => ({ ...bullet, y: bullet.y - 5 }))
            .filter(bullet => bullet.y > 0)
      );

      // Move invader bullets
      setInvaderBullets(prev =>
        prev.map(bullet => ({ ...bullet, y: bullet.y + 3 }))
            .filter(bullet => bullet.y < GAME_HEIGHT)
      );

      // Move invaders
      setInvaders(prev =>
        prev.map(invader => {
          let newX = invader.x + invaderDirection * 0.5;
          let newY = invader.y;

          // Check if any invader hits the edge
          if (newX <= 0 || newX >= GAME_WIDTH - 30) {
            setInvaderDirection(prev => -prev);
            newY += 20;
            newX = invader.x;
          }

          // Check if invaders reached the player
          if (newY >= GAME_HEIGHT - 100) {
            setGameOver(true);
          }

          return {
            ...invader,
            x: newX,
            y: newY
          };
        })
      );

      // Invaders shoot randomly
      setInvaders(prevInvaders => {
        const shootingInvader = prevInvaders.find(invader =>
          invader.alive && Math.random() < 0.005
        );
        if (shootingInvader) {
          setInvaderBullets(prev => [...prev, { x: shootingInvader.x, y: shootingInvader.y }]);
        }
        return prevInvaders;
      });

      // Check player bullet collisions with invaders
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];

        setInvaders(prevInvaders =>
          prevInvaders.map(invader => {
            if (!invader.alive) return invader;

            const hitBullet = remainingBullets.find(bullet =>
              Math.abs(bullet.x - invader.x) < 15 &&
              Math.abs(bullet.y - invader.y) < 15
            );

            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);

              const newScore = score + 10;
              setScore(newScore);
              onScoreChange(newScore);

              return { ...invader, alive: false };
            }

            return invader;
          })
        );

        return remainingBullets;
      });

      // Check invader bullet collisions with player
      setInvaderBullets(prevBullets => {
        const remainingBullets = prevBullets.filter(bullet => {
          const hitPlayer = Math.abs(bullet.x - playerPos) < 15 && bullet.y >= GAME_HEIGHT - 80;
          if (hitPlayer) {
            setGameOver(true);
          }
          return !hitPlayer;
        });
        return remainingBullets;
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [gameState, score, invaderDirection, onScoreChange, gameOver, playerPos]);

  return (
    <div className="space-invaders-game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Player */}
      <div 
        className="player"
        style={{ left: playerPos - 15, bottom: 20 }}
      >
        🚀
      </div>

      {/* Bullets */}
      {bullets.map((bullet, index) => (
        <div
          key={index}
          className="bullet"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Invader Bullets */}
      {invaderBullets.map((bullet, index) => (
        <div
          key={`invader-${index}`}
          className="bullet"
          style={{ left: bullet.x, top: bullet.y, background: '#ff0000' }}
        />
      ))}

      {/* Invaders */}
      {invaders.map((invader, index) =>
        invader.alive && (
          <div
            key={index}
            className="invader"
            style={{ left: invader.x, top: invader.y }}
          >
            👾
          </div>
        )
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center flex-col">
          <div className="text-red-500 text-2xl font-bold mb-4">GAME OVER</div>
          <div className="text-white text-lg mb-4">Final Score: {score}</div>
        </div>
      )}

      {/* Stars background */}
      <div className="stars">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SpaceInvadersGame;