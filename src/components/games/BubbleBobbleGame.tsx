import React, { useState, useEffect, useCallback } from 'react';

interface BubbleBobbleGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const BubbleBobbleGame: React.FC<BubbleBobbleGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 250 });
  const [bubbles, setBubbles] = useState<Array<{ x: number; y: number; vx: number; vy: number; id: number }>>([]);
  const [enemies, setEnemies] = useState<Array<{ x: number; y: number; trapped: boolean; id: number }>>([]);
  const [platforms, setPlatforms] = useState<Array<{ x: number; y: number; width: number }>>([]);
  const [score, setScore] = useState(0);
  const [bubbleId, setBubbleId] = useState(0);

  // Initialize level
  useEffect(() => {
    const initialPlatforms = [
      { x: 0, y: 280, width: GAME_WIDTH },
      { x: 50, y: 220, width: 100 },
      { x: 250, y: 180, width: 100 },
      { x: 100, y: 140, width: 150 },
      { x: 300, y: 100, width: 100 }
    ];
    
    const initialEnemies = [
      { x: 300, y: 200, trapped: false, id: 0 },
      { x: 150, y: 120, trapped: false, id: 1 },
      { x: 320, y: 80, trapped: false, id: 2 }
    ];
    
    setPlatforms(initialPlatforms);
    setEnemies(initialEnemies);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayerPos(prev => ({ ...prev, x: Math.max(0, prev.x - 3) }));
        break;
      case 'ArrowRight':
        setPlayerPos(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 30, prev.x + 3) }));
        break;
      case 'ArrowUp':
        // Jump
        setPlayerPos(prev => ({ ...prev, y: Math.max(0, prev.y - 40) }));
        break;
      case ' ':
        // Shoot bubble
        setBubbles(prev => [...prev, {
          x: playerPos.x + 15,
          y: playerPos.y + 10,
          vx: 3,
          vy: -2,
          id: bubbleId
        }]);
        setBubbleId(prev => prev + 1);
        break;
    }
  }, [gameState, playerPos, bubbleId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move bubbles
      setBubbles(prev => 
        prev.map(bubble => ({
          ...bubble,
          x: bubble.x + bubble.vx,
          y: bubble.y + bubble.vy,
          vy: bubble.vy + 0.1 // gravity
        })).filter(bubble => 
          bubble.x > -20 && bubble.x < GAME_WIDTH + 20 && 
          bubble.y > -20 && bubble.y < GAME_HEIGHT + 20
        )
      );

      // Check bubble-enemy collisions
      setBubbles(prevBubbles => {
        const remainingBubbles = [...prevBubbles];
        
        setEnemies(prevEnemies => 
          prevEnemies.map(enemy => {
            if (enemy.trapped) return enemy;
            
            const hitBubble = remainingBubbles.find(bubble => 
              Math.abs(bubble.x - enemy.x) < 25 && 
              Math.abs(bubble.y - enemy.y) < 25
            );
            
            if (hitBubble) {
              const bubbleIndex = remainingBubbles.indexOf(hitBubble);
              remainingBubbles.splice(bubbleIndex, 1);
              return { ...enemy, trapped: true };
            }
            
            return enemy;
          })
        );
        
        return remainingBubbles;
      });

      // Check if player pops trapped enemies
      setEnemies(prev => 
        prev.filter(enemy => {
          if (enemy.trapped && 
              Math.abs(enemy.x - playerPos.x) < 30 && 
              Math.abs(enemy.y - playerPos.y) < 30) {
            const newScore = score + 1000;
            setScore(newScore);
            onScoreChange(newScore);
            return false;
          }
          return true;
        })
      );

      // Simple gravity for player
      setPlayerPos(prev => {
        let newY = prev.y + 2;
        
        // Check platform collisions
        const onPlatform = platforms.find(platform => 
          prev.x >= platform.x - 20 && 
          prev.x <= platform.x + platform.width &&
          newY >= platform.y - 30 && 
          newY <= platform.y
        );
        
        if (onPlatform) {
          newY = onPlatform.y - 30;
        }
        
        return { ...prev, y: Math.min(270, newY) };
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, playerPos, platforms, score, onScoreChange]);

  return (
    <div className="relative bg-gradient-to-b from-blue-400 to-blue-600" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Platforms */}
      {platforms.map((platform, index) => (
        <div
          key={index}
          className="absolute bg-pink-500 rounded"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.width,
            height: 8
          }}
        />
      ))}

      {/* Player */}
      <div 
        className="absolute text-2xl"
        style={{ left: playerPos.x, top: playerPos.y }}
      >
        🐉
      </div>

      {/* Bubbles */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute text-lg animate-pulse"
          style={{ left: bubble.x, top: bubble.y }}
        >
          🫧
        </div>
      ))}

      {/* Enemies */}
      {enemies.map(enemy => (
        <div
          key={enemy.id}
          className={`absolute text-xl ${enemy.trapped ? 'animate-bounce' : ''}`}
          style={{ left: enemy.x, top: enemy.y }}
        >
          {enemy.trapped ? '🫧👹' : '👹'}
        </div>
      ))}
    </div>
  );
};

export default BubbleBobbleGame;