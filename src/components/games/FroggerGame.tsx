import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FroggerGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const FROG_SIZE = 20;
const CELL = 40;

interface Vehicle {
  x: number;
  speed: number;
  lane: number;
  id: number;
}

interface Log {
  x: number;
  speed: number;
  lane: number;
  width: number;
  id: number;
}

interface LilyPad {
  x: number;
  filled: boolean;
}

const ROAD_LANES = [260, 220, 180, 140]; // y-values of road lanes
const WATER_LANES = [100, 70, 40];       // y-values of log lanes

const FroggerGame: React.FC<FroggerGameProps> = ({ onScoreChange, gameState }) => {
  const [frogPos, setFrogPos] = useState({ x: 180, y: 360 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [lilyPads, setLilyPads] = useState<LilyPad[]>([
    { x: 30, filled: false },
    { x: 110, filled: false },
    { x: 190, filled: false },
    { x: 270, filled: false },
    { x: 350, filled: false }
  ]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const frogRef = useRef(frogPos);
  const logsRef = useRef(logs);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const deadRef = useRef(false);

  frogRef.current = frogPos;
  logsRef.current = logs;
  scoreRef.current = score;
  livesRef.current = lives;

  const resetFrog = useCallback(() => {
    setFrogPos({ x: 180, y: 360 });
    deadRef.current = false;
  }, []);

  const killFrog = useCallback(() => {
    if (deadRef.current) return;
    deadRef.current = true;
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);
    if (newLives <= 0) setGameOver(true);
    else setTimeout(resetFrog, 600);
  }, [resetFrog]);

  // Initialize vehicles and logs
  useEffect(() => {
    const initialVehicles: Vehicle[] = [];
    let vid = 0;
    ROAD_LANES.forEach((lane, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = (i + 1) * 0.8 * dir;
      for (let j = 0; j < 3; j++) {
        initialVehicles.push({
          x: j * 130 + (i * 30),
          speed,
          lane,
          id: vid++
        });
      }
    });
    setVehicles(initialVehicles);

    const initialLogs: Log[] = [];
    let lid = 100;
    WATER_LANES.forEach((lane, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = (i + 1) * 0.7 * dir;
      for (let j = 0; j < 2; j++) {
        initialLogs.push({
          x: j * 180 + i * 20,
          speed,
          lane,
          width: 80 + i * 20,
          id: lid++
        });
      }
    });
    setLogs(initialLogs);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || gameOver || deadRef.current) return;

    setFrogPos(prev => {
      let { x, y } = prev;
      switch (event.key) {
        case 'ArrowUp':    y = Math.max(10, y - CELL); break;
        case 'ArrowDown':  y = Math.min(360, y + CELL); break;
        case 'ArrowLeft':  x = Math.max(5, x - CELL);  break;
        case 'ArrowRight': x = Math.min(365, x + CELL); break;
        default: return prev;
      }
      // Score for moving forward (up)
      if (y < prev.y) {
        const pts = Math.floor((360 - y) / CELL) * 10;
        if (pts > scoreRef.current) {
          const diff = pts - scoreRef.current;
          scoreRef.current = pts;
          setScore(pts);
          if (diff > 0) onScoreChange(pts);
        }
      }
      return { x, y };
    });
  }, [gameState, gameOver, onScoreChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    const gameLoop = setInterval(() => {
      // Move vehicles
      setVehicles(prev =>
        prev.map(v => {
          let newX = v.x + v.speed;
          if (newX > GAME_WIDTH + 60) newX = -60;
          if (newX < -60) newX = GAME_WIDTH + 60;
          return { ...v, x: newX };
        })
      );

      // Move logs
      setLogs(prev =>
        prev.map(log => {
          let newX = log.x + log.speed;
          if (newX > GAME_WIDTH + 20) newX = -log.width - 20;
          if (newX < -log.width - 20) newX = GAME_WIDTH + 20;
          return { ...log, x: newX };
        })
      );

      if (deadRef.current) return;

      const frog = frogRef.current;

      // Check water zone — frog must be on a log
      const inWater = WATER_LANES.some(ly => Math.abs(frog.y - ly) < 15);
      if (inWater) {
        const currentLogs = logsRef.current;
        const onLog = currentLogs.find(
          log =>
            Math.abs(log.lane - frog.y) < 15 &&
            frog.x >= log.x &&
            frog.x <= log.x + log.width
        );

        if (onLog) {
          // Ride the log
          setFrogPos(prev => ({
            ...prev,
            x: Math.max(5, Math.min(365, prev.x + onLog.speed))
          }));
        } else {
          // Fell in water
          killFrog();
          return;
        }
      }

      // Check road collision
      setVehicles(prevVehicles => {
        const hit = prevVehicles.some(
          v =>
            Math.abs(v.lane - frog.y) < 15 &&
            frog.x + FROG_SIZE > v.x &&
            frog.x < v.x + 40
        );
        if (hit) killFrog();
        return prevVehicles;
      });

      // Check lily pad arrival (top row)
      if (frog.y <= 15) {
        const hitPad = lilyPads.findIndex(pad => Math.abs(pad.x - frog.x) < 25);
        if (hitPad >= 0 && !lilyPads[hitPad].filled) {
          setLilyPads(prev => {
            const updated = [...prev];
            updated[hitPad] = { ...updated[hitPad], filled: true };
            const newScore = scoreRef.current + 200;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
            return updated;
          });
          resetFrog();
        } else if (hitPad < 0) {
          killFrog(); // Missed lily pad
        }
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, gameOver, lilyPads, killFrog, resetFrog, onScoreChange]);

  return (
    <div className="relative bg-gray-900" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Safe zones */}
      <div className="absolute left-0 right-0 h-10 bg-green-900" style={{ top: 0 }} />
      <div className="absolute left-0 right-0 h-10 bg-green-800" style={{ top: 300 }} />
      <div className="absolute left-0 right-0 h-60 bg-gray-800" style={{ top: 295 }} />

      {/* Water */}
      <div className="absolute left-0 right-0 bg-blue-900" style={{ top: 20, height: 118 }} />

      {/* Road */}
      <div className="absolute left-0 right-0 bg-gray-700" style={{ top: 140, height: 158 }} />
      <div className="absolute left-0 right-0 h-px bg-yellow-400 opacity-30" style={{ top: 160 }} />
      <div className="absolute left-0 right-0 h-px bg-yellow-400 opacity-30" style={{ top: 200 }} />
      <div className="absolute left-0 right-0 h-px bg-yellow-400 opacity-30" style={{ top: 240 }} />

      {/* Lily pads */}
      {lilyPads.map((pad, i) => (
        <div
          key={i}
          className={`absolute text-xl ${pad.filled ? 'opacity-50' : ''}`}
          style={{ left: pad.x - 15, top: 2 }}
        >
          {pad.filled ? '🐸' : '🍀'}
        </div>
      ))}

      {/* Logs */}
      {logs.map(log => (
        <div
          key={log.id}
          className="absolute bg-amber-800 rounded"
          style={{ left: log.x, top: log.lane - 8, width: log.width, height: 16 }}
        />
      ))}

      {/* Vehicles */}
      {vehicles.map(v => (
        <div
          key={v.id}
          className="absolute text-xl"
          style={{
            left: v.x,
            top: v.lane - 14,
            transform: v.speed < 0 ? 'scaleX(-1)' : undefined
          }}
        >
          🚗
        </div>
      ))}

      {/* Frog */}
      {!deadRef.current && (
        <div
          className="absolute text-xl z-10"
          style={{ left: frogPos.x - 10, top: frogPos.y - 14 }}
        >
          🐸
        </div>
      )}

      {/* UI */}
      <div className="absolute top-2 right-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
        SCORE: {score} | LIVES: {'❤️'.repeat(Math.max(0, lives))}
      </div>

      <div className="absolute bottom-2 left-2 text-white text-xs">
        Arrow Keys: Move | Ride logs across water!
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

export default FroggerGame;