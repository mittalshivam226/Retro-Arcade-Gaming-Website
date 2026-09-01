import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PaperboyGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

interface Paper {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
}

interface House {
  x: number;
  y: number;
  delivered: boolean;
  subscriber: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  type: 'car' | 'dog';
}

const PaperboyGame: React.FC<PaperboyGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 200 });
  const [papers, setPapers] = useState<Paper[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [paperId, setPaperId] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const scrollXRef = useRef(scrollX);
  const scoreRef = useRef(score);
  const playerRef = useRef(playerPos);
  const paperIdRef = useRef(paperId);
  const livesRef = useRef(lives);
  const housesRef = useRef(houses);

  scrollXRef.current = scrollX;
  scoreRef.current = score;
  playerRef.current = playerPos;
  paperIdRef.current = paperId;
  livesRef.current = lives;
  housesRef.current = houses;

  // Initialize level
  useEffect(() => {
    const initialHouses: House[] = [];
    for (let i = 0; i < 12; i++) {
      initialHouses.push({
        x: i * 100 + 120,
        y: 130,
        delivered: false,
        subscriber: Math.random() > 0.35
      });
    }

    const initialObstacles: Obstacle[] = [];
    for (let i = 0; i < 10; i++) {
      initialObstacles.push({
        x: Math.random() * 900 + 200,
        y: 210 + Math.random() * 40,
        type: Math.random() > 0.5 ? 'car' : 'dog'
      });
    }

    setHouses(initialHouses);
    setObstacles(initialObstacles);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(10, prev.x - 3) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 3) }));
        break;
      case 'ArrowUp':
        setPlayerPos(prev => ({ ...prev, y: Math.max(100, prev.y - 3) }));
        break;
      case 'ArrowDown':
        setPlayerPos(prev => ({ ...prev, y: Math.min(260, prev.y + 3) }));
        break;
      case ' ': {
        const id = paperIdRef.current;
        setPapers(prev => [...prev, {
          x: playerRef.current.x + 15,
          y: playerRef.current.y,
          vx: 5,
          vy: -3,
          id
        }]);
        setPaperId(prev => prev + 1);
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
      const sx = scrollXRef.current;

      // Auto-scroll
      setScrollX(prev => prev + 1.5);

      // Move papers
      setPapers(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.25 // gravity
        })).filter(p => p.x < GAME_WIDTH + 60 && p.y < GAME_HEIGHT)
      );

      // Paper-house collision
      setPapers(prevPapers => {
        const toRemove = new Set<number>();

        setHouses(prevHouses =>
          prevHouses.map(house => {
            if (house.delivered) return house;

            const screenX = house.x - sx;
            const hit = prevPapers.find(
              p =>
                !toRemove.has(p.id) &&
                Math.abs(p.x - screenX) < 35 &&
                Math.abs(p.y - house.y) < 30
            );

            if (hit) {
              toRemove.add(hit.id);
              if (house.subscriber) {
                const newScore = scoreRef.current + 250;
                scoreRef.current = newScore;
                setScore(newScore);
                onScoreChange(newScore);
              } else {
                // Penalty
                const newScore = Math.max(0, scoreRef.current - 100);
                scoreRef.current = newScore;
                setScore(newScore);
                onScoreChange(newScore);
              }
              return { ...house, delivered: true };
            }
            return house;
          })
        );

        return prevPapers.filter(p => !toRemove.has(p.id));
      });

      // Obstacle collision with player
      const player = playerRef.current;
      const hit = obstacles.some(
        o =>
          Math.abs((o.x - sx) - player.x) < 28 &&
          Math.abs(o.y - player.y) < 22
      );

      if (hit) {
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);
        if (newLives <= 0) setGameOver(true);
        else setPlayerPos({ x: 50, y: 200 });
      }

      // Check if all houses passed — wrap level
      if (sx > 1300) {
        const delivered = housesRef.current.filter(h => h.delivered && h.subscriber).length;
        const bonus = delivered * 100;
        const newScore = scoreRef.current + bonus;
        scoreRef.current = newScore;
        setScore(newScore);
        onScoreChange(newScore);
        // Reset scroll and houses for infinite play
        setScrollX(0);
        setHouses(prev =>
          prev.map(h => ({ ...h, delivered: false }))
        );
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, obstacles, onScoreChange]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'linear-gradient(180deg, #87ceeb 0%, #87ceeb 60%, #90ee90 60%)' }}
    >
      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gray-600" />
      {/* Road lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="absolute h-1 w-12 bg-yellow-400"
          style={{ left: i * 70 - (scrollX % 70), bottom: 30 }}
        />
      ))}

      {/* Sidewalk */}
      <div className="absolute bg-gray-400" style={{ bottom: 80, left: 0, right: 0, height: 20 }} />

      {/* Houses */}
      {houses.map((house, index) => {
        const screenX = house.x - scrollX;
        if (screenX < -80 || screenX > GAME_WIDTH + 20) return null;
        return (
          <div key={index} className="absolute" style={{ left: screenX, top: house.y }}>
            <div className={`text-3xl ${house.delivered ? 'opacity-50' : ''}`}>
              {house.subscriber ? '🏠' : '🏚️'}
            </div>
            {house.delivered && (
              <div className="absolute -top-4 left-2 text-xs">📰</div>
            )}
          </div>
        );
      })}

      {/* Obstacles */}
      {obstacles.map((obstacle, index) => {
        const screenX = obstacle.x - scrollX;
        if (screenX < -40 || screenX > GAME_WIDTH + 20) return null;
        return (
          <div key={index} className="absolute text-xl" style={{ left: screenX, top: obstacle.y }}>
            {obstacle.type === 'car' ? '🚗' : '🐕'}
          </div>
        );
      })}

      {/* Player */}
      <div
        className="absolute text-2xl z-10"
        style={{ left: playerPos.x, top: playerPos.y }}
      >
        🚴
      </div>

      {/* Papers */}
      {papers.map(paper => (
        <div
          key={paper.id}
          className="absolute text-sm animate-spin"
          style={{ left: paper.x, top: paper.y }}
        >
          📰
        </div>
      ))}

      {/* UI */}
      <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-60 px-2 py-1 rounded">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))} | Dist: {Math.floor(scrollX / 10)}m
      </div>
      <div className="absolute top-2 right-2 text-white text-xs">
        SPACE: Throw Paper
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

export default PaperboyGame;