import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CentipedeGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

interface CentipedeSegment {
  x: number;
  y: number;
  direction: number;
}

interface Mushroom {
  x: number;
  y: number;
  hits: number;
}

interface Bullet {
  x: number;
  y: number;
  id: number;
}

const CentipedeGame: React.FC<CentipedeGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 200, y: 450 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [centipede, setCentipede] = useState<CentipedeSegment[]>([]);
  const [mushrooms, setMushrooms] = useState<Mushroom[]>([]);
  const [score, setScore] = useState(0);
  const [bulletId, setBulletId] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Refs to avoid stale closures
  const scoreRef = useRef(score);
  const mushroomsRef = useRef(mushrooms);
  const centipedeRef = useRef(centipede);
  const playerPosRef = useRef(playerPos);
  const bulletIdRef = useRef(bulletId);

  scoreRef.current = score;
  mushroomsRef.current = mushrooms;
  centipedeRef.current = centipede;
  playerPosRef.current = playerPos;
  bulletIdRef.current = bulletId;

  // Initialize game objects
  useEffect(() => {
    const initialCentipede: CentipedeSegment[] = [];
    for (let i = 0; i < 12; i++) {
      initialCentipede.push({ x: i * 30, y: 30, direction: 1 });
    }
    setCentipede(initialCentipede);

    const initialMushrooms: Mushroom[] = [];
    for (let i = 0; i < 25; i++) {
      initialMushrooms.push({
        x: Math.floor(Math.random() * ((GAME_WIDTH - 20) / 20)) * 20,
        y: Math.floor(Math.random() * (280 / 20)) * 20 + 80,
        hits: 0
      });
    }
    setMushrooms(initialMushrooms);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 20, prev.x + 5) }));
        break;
      case 'ArrowUp':
        setPlayerPos(prev => ({ ...prev, y: Math.max(300, prev.y - 5) }));
        break;
      case 'ArrowDown':
        setPlayerPos(prev => ({ ...prev, y: Math.min(GAME_HEIGHT - 20, prev.y + 5) }));
        break;
      case ' ': {
        const newId = bulletIdRef.current;
        setBullets(prev => [...prev, { x: playerPosRef.current.x + 10, y: playerPosRef.current.y, id: newId }]);
        setBulletId(prev => prev + 1);
        break;
      }
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
      // Move bullets upward
      setBullets(prev =>
        prev
          .map(bullet => ({ ...bullet, y: bullet.y - 8 }))
          .filter(bullet => bullet.y > 0)
      );

      // Move centipede — use functional update to get fresh state
      setCentipede(prevCentipede => {
        const currentMushrooms = mushroomsRef.current;

        return prevCentipede.map(segment => {
          // Head moves, body follows — each segment follows the one before it
          // For simplicity: each segment moves individually but reverses direction at walls/mushrooms
          const newX = segment.x + segment.direction * 2;
          let newY = segment.y;
          let newDirection = segment.direction;

          // Check wall boundaries
          const hitWall = newX <= 0 || newX >= GAME_WIDTH - 20;

          // Check mushroom collision
          const hitMushroom = currentMushrooms.some(
            mushroom => Math.abs(newX - mushroom.x) < 18 && Math.abs(segment.y - mushroom.y) < 18
          );

          if (hitWall || hitMushroom) {
            newDirection = -segment.direction;
            newY = segment.y + 20;
          }

          // Check if centipede reached player zone — game over
          if (newY >= GAME_HEIGHT - 60) {
            setGameOver(true);
          }

          return { x: hitWall || hitMushroom ? segment.x : newX, y: newY, direction: newDirection };
        });
      });

      // Bullet-centipede collision
      setBullets(prevBullets => {
        const toRemove = new Set<number>();
        const defeatedPositions: { x: number; y: number }[] = [];

        setCentipede(prevCentipede => {
          // Collect hits first
          const hitIndexes = new Set<number>();

          prevBullets.forEach(bullet => {
            prevCentipede.forEach((segment, segIdx) => {
              if (
                !hitIndexes.has(segIdx) &&
                !toRemove.has(bullet.id) &&
                Math.abs(bullet.x - segment.x) < 15 &&
                Math.abs(bullet.y - segment.y) < 15
              ) {
                hitIndexes.add(segIdx);
                toRemove.add(bullet.id);
                defeatedPositions.push({ x: segment.x, y: segment.y });
              }
            });
          });

          if (hitIndexes.size > 0) {
            const points = hitIndexes.size * 10;
            const newScore = scoreRef.current + points;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);

            // Convert killed segments to mushrooms
            if (defeatedPositions.length > 0) {
              setMushrooms(prev => [
                ...prev,
                ...defeatedPositions.map(pos => ({ ...pos, hits: 0 }))
              ]);
            }

            // Remove hit segments (filter by index)
            return prevCentipede.filter((_, idx) => !hitIndexes.has(idx));
          }

          return prevCentipede;
        });

        // Remove bullets that hit
        return prevBullets.filter(b => !toRemove.has(b.id));
      });

      // Bullet-mushroom collision — separate pass
      setBullets(prevBullets => {
        const toRemoveMushroomBullets = new Set<number>();

        setMushrooms(prevMushrooms => {
          return prevMushrooms
            .map(mushroom => {
              const hitBullet = prevBullets.find(
                b =>
                  !toRemoveMushroomBullets.has(b.id) &&
                  Math.abs(b.x - mushroom.x) < 15 &&
                  Math.abs(b.y - mushroom.y) < 15
              );
              if (hitBullet) {
                toRemoveMushroomBullets.add(hitBullet.id);
                const newScore = scoreRef.current + 1;
                scoreRef.current = newScore;
                setScore(newScore);
                onScoreChange(newScore);
                return { ...mushroom, hits: mushroom.hits + 1 };
              }
              return mushroom;
            })
            .filter(m => m.hits < 4);
        });

        return prevBullets.filter(b => !toRemoveMushroomBullets.has(b.id));
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, onScoreChange]); // ✅ No mushrooms/centipede/score in deps

  return (
    <div className="relative bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Player area boundary */}
      <div
        className="absolute left-0 right-0 h-px bg-green-500 opacity-50"
        style={{ top: 300 }}
      />

      {/* Player */}
      <div className="absolute text-xl" style={{ left: playerPos.x, top: playerPos.y }}>
        🔫
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-1 h-3 bg-yellow-400"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Centipede */}
      {centipede.map((segment, index) => (
        <div
          key={index}
          className="absolute text-lg"
          style={{ left: segment.x, top: segment.y }}
        >
          {index === 0 ? '🐛' : '🟢'}
        </div>
      ))}

      {/* Mushrooms */}
      {mushrooms.map((mushroom, index) => (
        <div
          key={index}
          className="absolute text-sm"
          style={{ left: mushroom.x, top: mushroom.y, opacity: 1 - mushroom.hits * 0.2 }}
        >
          🍄
        </div>
      ))}

      {/* Score */}
      <div className="absolute top-2 left-2 text-green-400 text-xs">
        SCORE: {score} | Segments: {centipede.length}
      </div>

      {/* Controls */}
      <div className="absolute bottom-2 left-2 text-green-400 text-xs">
        Arrows: Move | SPACE: Shoot
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

export default CentipedeGame;