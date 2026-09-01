import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PitfallGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const GROUND_Y = 200;
const GRAVITY = 0.6;
const JUMP_POWER = -12;

interface Obstacle {
  x: number;
  y: number;
  type: 'pit' | 'log' | 'vine';
  width: number;
}

interface Treasure {
  x: number;
  y: number;
  collected: boolean;
  value: number;
}

const PitfallGame: React.FC<PitfallGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: GROUND_Y });
  const [playerVy, setPlayerVy] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles] = useState<Obstacle[]>([
    { x: 180, y: GROUND_Y + 10, type: 'pit',  width: 50 },
    { x: 310, y: GROUND_Y - 10, type: 'log',  width: 30 },
    { x: 450, y: GROUND_Y + 10, type: 'pit',  width: 50 },
    { x: 600, y: GROUND_Y - 30, type: 'vine', width: 20 },
    { x: 750, y: GROUND_Y + 10, type: 'pit',  width: 50 },
    { x: 900, y: GROUND_Y - 10, type: 'log',  width: 30 },
  ]);
  const [treasures, setTreasures] = useState<Treasure[]>([
    { x: 220, y: GROUND_Y - 30, collected: false, value: 2000 },
    { x: 420, y: GROUND_Y - 30, collected: false, value: 3000 },
    { x: 650, y: GROUND_Y - 40, collected: false, value: 5000 },
    { x: 850, y: GROUND_Y - 30, collected: false, value: 2000 },
  ]);
  const [score, setScore] = useState(0);
  const [cameraX, setCameraX] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Refs for use inside game loop
  const playerPosRef = useRef(playerPos);
  const playerVyRef = useRef(playerVy);
  const isJumpingRef = useRef(isJumping);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);

  playerPosRef.current = playerPos;
  playerVyRef.current = playerVy;
  isJumpingRef.current = isJumping;
  scoreRef.current = score;
  livesRef.current = lives;

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(5, prev.x - 4) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: prev.x + 4 })); // No right cap — infinite scroll
        break;
      case ' ':
      case 'ArrowUp':
        if (!isJumpingRef.current) {
          setIsJumping(true);
          setPlayerVy(JUMP_POWER);
        }
        break;
    }
  }, [gameState, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop — physics-based jumping using refs
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      // Apply gravity and move vertically
      setPlayerVy(prevVy => {
        const newVy = prevVy + GRAVITY;

        setPlayerPos(prev => {
          let newY = prev.y + newVy;
          let finalVy = newVy;

          // Land on ground
          if (newY >= GROUND_Y) {
            newY = GROUND_Y;
            finalVy = 0;
            setIsJumping(false);
          }

          playerVyRef.current = finalVy;
          return { ...prev, y: newY };
        });

        return playerVyRef.current;
      });

      // Update camera
      setCameraX(playerPosRef.current.x - 80);

      // Treasure collection
      setTreasures(prev =>
        prev.map(treasure => {
          if (!treasure.collected &&
            Math.abs(treasure.x - playerPosRef.current.x) < 20 &&
            Math.abs(treasure.y - playerPosRef.current.y) < 25) {
            const newScore = scoreRef.current + treasure.value;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...treasure, collected: true };
          }
          return treasure;
        })
      );

      // Check pit collision — only when not jumping
      const player = playerPosRef.current;
      if (!isJumpingRef.current) {
        const inPit = obstacles.some(
          o =>
            o.type === 'pit' &&
            player.x + 10 >= o.x &&
            player.x <= o.x + o.width &&
            player.y >= GROUND_Y
        );

        if (inPit) {
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          if (newLives <= 0) {
            setGameOver(true);
          } else {
            setPlayerPos({ x: 50, y: GROUND_Y });
            setCameraX(0);
          }
        }
      }

      // Log collision — jump on rolling logs
      const onLog = obstacles.some(
        o =>
          o.type === 'log' &&
          Math.abs(player.x - o.x) < 25 &&
          Math.abs(player.y - o.y) < 18 &&
          !isJumpingRef.current
      );
      if (onLog) {
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);
        if (newLives <= 0) setGameOver(true);
        else {
          setPlayerPos({ x: 50, y: GROUND_Y });
          setCameraX(0);
        }
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, obstacles, onScoreChange]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'linear-gradient(180deg, #0f4f0f 0%, #2d7a1f 60%, #8b6914 80%, #3d2b1f 100%)' }}
    >
      {/* Sky */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-blue-600 to-green-600 opacity-70" />

      {/* Trees (background decoration) */}
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="absolute text-3xl"
          style={{ left: i * 120 - cameraX * 0.3, top: 20 }}
        >
          🌴
        </div>
      ))}

      {/* Ground */}
      <div
        className="absolute bg-amber-800"
        style={{ left: -cameraX, top: GROUND_Y + 20, width: 1200, height: 60 }}
      />

      {/* Obstacles */}
      {obstacles.map((obstacle, index) => (
        <div
          key={index}
          className="absolute"
          style={{ left: obstacle.x - cameraX, top: obstacle.y - 10 }}
        >
          {obstacle.type === 'pit' && (
            <div
              className="bg-black"
              style={{ width: obstacle.width, height: 40 }}
            />
          )}
          {obstacle.type === 'log' && (
            <div className="text-2xl animate-spin-slow">🪵</div>
          )}
          {obstacle.type === 'vine' && (
            <div className="text-3xl animate-bounce">🌿</div>
          )}
        </div>
      ))}

      {/* Treasures */}
      {treasures.map((treasure, index) =>
        !treasure.collected && (
          <div
            key={index}
            className="absolute text-xl animate-bounce z-10"
            style={{ left: treasure.x - cameraX, top: treasure.y }}
          >
            💎
          </div>
        )
      )}

      {/* Player */}
      <div
        className="absolute text-2xl z-20"
        style={{ left: playerPos.x - cameraX, top: playerPos.y - 8 }}
      >
        🤠
      </div>

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-60 px-2 py-1 rounded">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))} | DIST: {Math.floor(playerPos.x / 10)}m
      </div>
      <div className="absolute bottom-2 left-2 text-white text-xs">
        ←→: Move | ↑/SPACE: Jump | Collect diamonds!
      </div>

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

export default PitfallGame;