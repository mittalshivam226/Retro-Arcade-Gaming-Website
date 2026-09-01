import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SpaceInvadersGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

// Static stars — computed once
const STARS = Array.from({ length: 50 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 73 + 17) % 100}%`,
  delay: `${(i * 0.3) % 3}s`
}));

const SpaceInvadersGame: React.FC<SpaceInvadersGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState(GAME_WIDTH / 2);
  const [bullets, setBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [invaderBullets, setInvaderBullets] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [invaders, setInvaders] = useState<Array<{ x: number; y: number; alive: boolean; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bulletId, setBulletId] = useState(0);
  const [invaderBulletId, setInvaderBulletId] = useState(1000);

  // Single ref for invader group direction — avoids multi-flip per frame
  const invaderDirectionRef = useRef<1 | -1>(1);
  const scoreRef = useRef(score);
  const playerPosRef = useRef(playerPos);
  const bulletIdRef = useRef(bulletId);
  const invaderBulletIdRef = useRef(invaderBulletId);

  scoreRef.current = score;
  playerPosRef.current = playerPos;
  bulletIdRef.current = bulletId;
  invaderBulletIdRef.current = invaderBulletId;

  // Initialize invaders
  useEffect(() => {
    const initialInvaders: typeof invaders = [];
    let id = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        initialInvaders.push({
          x: col * 35 + 30,
          y: row * 30 + 50,
          alive: true,
          id: id++
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
      case ' ': {
        const id = bulletIdRef.current;
        setBullets(prev => [...prev, { x: playerPosRef.current, y: GAME_HEIGHT - 80, id }]);
        setBulletId(prev => prev + 1);
        break;
      }
    }
  }, [gameState, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Invader shooting — separate interval from movement loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const shootInterval = setInterval(() => {
      setInvaders(prevInvaders => {
        const alive = prevInvaders.filter(inv => inv.alive);
        if (alive.length === 0) return prevInvaders;

        // Pick a random alive invader to shoot from the bottom rows
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        const id = invaderBulletIdRef.current;
        setInvaderBullets(prev => [...prev, { x: shooter.x + 10, y: shooter.y + 20, id }]);
        setInvaderBulletId(prev => prev + 1);
        return prevInvaders;
      });
    }, 1500);

    return () => clearInterval(shootInterval);
  }, [gameState, gameOver]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      // Move player bullets upward
      setBullets(prev =>
        prev.map(b => ({ ...b, y: b.y - 8 })).filter(b => b.y > 0)
      );

      // Move invader bullets downward
      setInvaderBullets(prev =>
        prev.map(b => ({ ...b, y: b.y + 4 })).filter(b => b.y < GAME_HEIGHT)
      );

      // Move invaders as a group — check edge ONCE for all alive invaders
      setInvaders(prevInvaders => {
        const alive = prevInvaders.filter(inv => inv.alive);
        if (alive.length === 0) return prevInvaders;

        const dir = invaderDirectionRef.current;
        const moved = prevInvaders.map(inv =>
          inv.alive ? { ...inv, x: inv.x + dir * 1.5 } : inv
        );

        // Check if ANY alive invader hits an edge AFTER moving
        const hitEdge = moved.some(
          inv => inv.alive && (inv.x <= 10 || inv.x >= GAME_WIDTH - 30)
        );

        if (hitEdge) {
          invaderDirectionRef.current = (dir === 1 ? -1 : 1) as 1 | -1;
          // Move all down by 20 and return without x-move this frame
          const descended = prevInvaders.map(inv =>
            inv.alive ? { ...inv, y: inv.y + 20 } : inv
          );
          // Check if invaders reached player line
          if (descended.some(inv => inv.alive && inv.y >= GAME_HEIGHT - 100)) {
            setGameOver(true);
          }
          return descended;
        }

        return moved;
      });

      // Player bullet vs invader collision
      setBullets(prevBullets => {
        const toRemoveBullets = new Set<number>();

        setInvaders(prevInvaders =>
          prevInvaders.map(inv => {
            if (!inv.alive) return inv;

            const hit = prevBullets.find(
              b =>
                !toRemoveBullets.has(b.id) &&
                Math.abs(b.x - inv.x - 10) < 18 &&
                Math.abs(b.y - inv.y) < 18
            );

            if (hit) {
              toRemoveBullets.add(hit.id);
              const newScore = scoreRef.current + 10;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreChange(newScore);
              return { ...inv, alive: false };
            }
            return inv;
          })
        );

        return prevBullets.filter(b => !toRemoveBullets.has(b.id));
      });

      // Invader bullet vs player collision
      setInvaderBullets(prevBullets => {
        const hit = prevBullets.some(
          b =>
            Math.abs(b.x - playerPosRef.current) < 20 &&
            b.y >= GAME_HEIGHT - 90
        );
        if (hit) setGameOver(true);
        return prevBullets;
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]); // ✅ No score/invaderDirection state in deps

  return (
    <div className="space-invaders-game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Player */}
      <div className="player" style={{ left: playerPos - 15, bottom: 20 }}>🚀</div>

      {/* Player bullets */}
      {bullets.map(bullet => (
        <div key={bullet.id} className="bullet" style={{ left: bullet.x, top: bullet.y }} />
      ))}

      {/* Invader bullets */}
      {invaderBullets.map(bullet => (
        <div
          key={bullet.id}
          className="bullet"
          style={{ left: bullet.x, top: bullet.y, background: '#ff3333', width: 3, height: 12 }}
        />
      ))}

      {/* Invaders */}
      {invaders.map(inv =>
        inv.alive && (
          <div key={inv.id} className="invader" style={{ left: inv.x, top: inv.y }}>
            👾
          </div>
        )
      )}

      {/* Static stars background */}
      <div className="stars">
        {STARS.map((star, i) => (
          <div
            key={i}
            className="star"
            style={{ left: star.left, top: star.top, animationDelay: star.delay }}
          />
        ))}
      </div>

      {/* Score */}
      <div className="absolute top-2 left-2 text-green-400 text-xs">
        SCORE: {score}
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

export default SpaceInvadersGame;