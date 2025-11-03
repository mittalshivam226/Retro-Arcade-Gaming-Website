import React, { useState, useEffect, useCallback } from 'react';

interface PaperboyGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const PaperboyGame: React.FC<PaperboyGameProps> = ({ onScoreChange, gameState }) => {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 200 });
  const [papers, setPapers] = useState<Array<{ x: number; y: number; vx: number; vy: number; id: number }>>([]);
  const [houses, setHouses] = useState<Array<{ x: number; y: number; delivered: boolean; subscriber: boolean }>>([]);
  const [obstacles, setObstacles] = useState<Array<{ x: number; y: number; type: string }>>([]);
  const [score, setScore] = useState(0);
  const [paperId, setPaperId] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  // Initialize level
  useEffect(() => {
    const initialHouses = [];
    const initialObstacles = [];
    
    for (let i = 0; i < 10; i++) {
      initialHouses.push({
        x: i * 80 + 100,
        y: 150,
        delivered: false,
        subscriber: Math.random() > 0.3 // 70% are subscribers
      });
    }
    
    for (let i = 0; i < 15; i++) {
      initialObstacles.push({
        x: Math.random() * 800 + 200,
        y: 220 + Math.random() * 50,
        type: Math.random() > 0.5 ? 'car' : 'dog'
      });
    }
    
    setHouses(initialHouses);
    setObstacles(initialObstacles);
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
        setPlayerPos(prev => ({ ...prev, y: Math.max(100, prev.y - 3) }));
        break;
      case 'ArrowDown':
        setPlayerPos(prev => ({ ...prev, y: Math.min(250, prev.y + 3) }));
        break;
      case ' ':
        // Throw paper
        setPapers(prev => [...prev, {
          x: playerPos.x + 15,
          y: playerPos.y + 10,
          vx: 4,
          vy: -2,
          id: paperId
        }]);
        setPaperId(prev => prev + 1);
        break;
    }
  }, [gameState, playerPos, paperId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Auto-scroll forward
      setScrollX(prev => prev + 1);
      
      // Move papers
      setPapers(prev => 
        prev.map(paper => ({
          ...paper,
          x: paper.x + paper.vx,
          y: paper.y + paper.vy,
          vy: paper.vy + 0.2 // gravity
        })).filter(paper => 
          paper.x < GAME_WIDTH + 50 && paper.y < GAME_HEIGHT
        )
      );

      // Check paper-house collisions
      setPapers(prevPapers => {
        const remainingPapers = [...prevPapers];
        
        setHouses(prevHouses => 
          prevHouses.map(house => {
            if (house.delivered) return house;
            
            const hitPaper = remainingPapers.find(paper => 
              Math.abs(paper.x - (house.x - scrollX)) < 30 && 
              Math.abs(paper.y - house.y) < 30
            );
            
            if (hitPaper) {
              const paperIndex = remainingPapers.indexOf(hitPaper);
              remainingPapers.splice(paperIndex, 1);
              
              if (house.subscriber) {
                const newScore = score + 250;
                setScore(newScore);
                onScoreChange(newScore);
              } else {
                // Penalty for delivering to non-subscriber
                const newScore = Math.max(0, score - 100);
                setScore(newScore);
                onScoreChange(newScore);
              }
              
              return { ...house, delivered: true };
            }
            
            return house;
          })
        );
        
        return remainingPapers;
      });

      // Check obstacle collisions
      const hitObstacle = obstacles.some(obstacle => 
        Math.abs((obstacle.x - scrollX) - playerPos.x) < 25 && 
        Math.abs(obstacle.y - playerPos.y) < 25
      );

      if (hitObstacle) {
        // Reset position (simplified collision)
        setPlayerPos({ x: 50, y: 200 });
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, scrollX, score, obstacles, onScoreChange]);

  return (
    <div className="relative bg-gradient-to-b from-blue-400 to-green-400 overflow-hidden" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gray-600"></div>
      
      {/* Sidewalk */}
      <div className="absolute bottom-20 left-0 right-0 h-8 bg-gray-400"></div>

      {/* Houses */}
      {houses.map((house, index) => (
        <div
          key={index}
          className={`absolute text-2xl ${house.delivered ? 'opacity-50' : ''}`}
          style={{ left: house.x - scrollX, top: house.y }}
        >
          {house.subscriber ? '🏠' : '🏚️'}
          {house.delivered && (
            <div className="absolute -top-4 left-0 text-xs text-green-600">📰</div>
          )}
        </div>
      ))}

      {/* Obstacles */}
      {obstacles.map((obstacle, index) => (
        <div
          key={index}
          className="absolute text-xl"
          style={{ left: obstacle.x - scrollX, top: obstacle.y }}
        >
          {obstacle.type === 'car' ? '🚗' : '🐕'}
        </div>
      ))}

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
      <div className="absolute top-2 left-2 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
        Score: {score}
      </div>
      
      <div className="absolute top-2 right-2 text-white text-xs">
        SPACE: Throw | Arrows: Move
      </div>
    </div>
  );
};

export default PaperboyGame;