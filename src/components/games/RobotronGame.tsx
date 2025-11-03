import React, { useState, useEffect, useCallback } from 'react';

interface RobotronGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const RobotronGame: React.FC<RobotronGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 200, y: 150 });
  const [bullets, setBullets] = useState<Array<{ x: number; y: number; vx: number; vy: number; id: number }>>([]);
  const [robots, setRobots] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [humans, setHumans] = useState<Array<{ x: number; y: number; saved: boolean; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [bulletId, setBulletId] = useState(0);

  // Initialize game objects
  useEffect(() => {
    const initialRobots = [];
    const initialHumans = [];
    
    for (let i = 0; i < 8; i++) {
      initialRobots.push({
        x: Math.random() * (GAME_WIDTH - 40) + 20,
        y: Math.random() * (GAME_HEIGHT - 40) + 20,
        id: i
      });
    }
    
    for (let i = 0; i < 5; i++) {
      initialHumans.push({
        x: Math.random() * (GAME_WIDTH - 40) + 20,
        y: Math.random() * (GAME_HEIGHT - 40) + 20,
        saved: false,
        id: i
      });
    }
    
    setRobots(initialRobots);
    setHumans(initialHumans);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    const speed = 3;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - speed) }));
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 20, prev.x + speed) }));
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        setPlayerPos(prev => ({ ...prev, y: Math.max(0, prev.y - speed) }));
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        setPlayerPos(prev => ({ ...prev, y: Math.min(GAME_HEIGHT - 20, prev.y + speed) }));
        break;
      case ' ': {
        // Shoot in all directions
        const directions = [
          { vx: 5, vy: 0 },   // right
          { vx: -5, vy: 0 },  // left
          { vx: 0, vy: -5 },  // up
          { vx: 0, vy: 5 },   // down
          { vx: 3.5, vy: -3.5 }, // diagonal
          { vx: -3.5, vy: -3.5 },
          { vx: 3.5, vy: 3.5 },
          { vx: -3.5, vy: 3.5 }
        ];

        directions.forEach((dir, index) => {
          setBullets(prev => [...prev, {
            x: playerPos.x + 10,
            y: playerPos.y + 10,
            vx: dir.vx,
            vy: dir.vy,
            id: bulletId + index
          }]);
        });
        setBulletId(prev => prev + 8);
        break;
      }
    }
  }, [gameState, playerPos, bulletId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move bullets
      setBullets(prev => 
        prev.map(bullet => ({
          ...bullet,
          x: bullet.x + bullet.vx,
          y: bullet.y + bullet.vy
        })).filter(bullet => 
          bullet.x > -10 && bullet.x < GAME_WIDTH + 10 && 
          bullet.y > -10 && bullet.y < GAME_HEIGHT + 10
        )
      );

      // Move robots toward player
      setRobots(prev => 
        prev.map(robot => {
          const dx = playerPos.x - robot.x;
          const dy = playerPos.y - robot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const speed = 0.8;
            return {
              ...robot,
              x: robot.x + (dx / distance) * speed,
              y: robot.y + (dy / distance) * speed
            };
          }
          return robot;
        })
      );

      // Check bullet-robot collisions
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setRobots(prevRobots => 
          prevRobots.filter(robot => {
            const hitBullet = remainingBullets.find(bullet => 
              Math.abs(bullet.x - robot.x) < 15 && 
              Math.abs(bullet.y - robot.y) < 15
            );
            
            if (hitBullet) {
              const bulletIndex = remainingBullets.indexOf(hitBullet);
              remainingBullets.splice(bulletIndex, 1);
              
              const newScore = score + 50;
              setScore(newScore);
              onScoreChange(newScore);
              
              return false;
            }
            
            return true;
          })
        );
        
        return remainingBullets;
      });

      // Check if player rescues humans
      setHumans(prev => 
        prev.map(human => {
          if (!human.saved && 
              Math.abs(human.x - playerPos.x) < 25 && 
              Math.abs(human.y - playerPos.y) < 25) {
            const newScore = score + 1000;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...human, saved: true };
          }
          return human;
        })
      );
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, playerPos, score, onScoreChange]);

  return (
    <div className="relative bg-gray-900" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute border-l border-cyan-500" style={{ left: i * 20, height: '100%' }} />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="absolute border-t border-cyan-500" style={{ top: i * 20, width: '100%' }} />
        ))}
      </div>

      {/* Player */}
      <div 
        className="absolute text-xl text-green-400"
        style={{ left: playerPos.x, top: playerPos.y }}
      >
        🤖
      </div>

      {/* Bullets */}
      {bullets.map(bullet => (
        <div
          key={bullet.id}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
          style={{ left: bullet.x, top: bullet.y }}
        />
      ))}

      {/* Robots */}
      {robots.map(robot => (
        <div
          key={robot.id}
          className="absolute text-lg text-red-500"
          style={{ left: robot.x, top: robot.y }}
        >
          🔴
        </div>
      ))}

      {/* Humans */}
      {humans.map(human => (
        <div
          key={human.id}
          className={`absolute text-sm ${human.saved ? 'text-green-400' : 'text-blue-400'}`}
          style={{ left: human.x, top: human.y }}
        >
          {human.saved ? '✅' : '👤'}
        </div>
      ))}

      {/* Instructions */}
      <div className="absolute top-2 left-2 text-xs text-white">
        WASD/Arrows: Move | SPACE: Shoot | Save the humans!
      </div>
    </div>
  );
};

export default RobotronGame;