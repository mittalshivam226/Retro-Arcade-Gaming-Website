import React, { useState, useEffect, useCallback } from 'react';

interface StreetFighterGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const StreetFighterGame: React.FC<StreetFighterGameProps> = ({ onScoreChange, gameState }) => {
  const [player1, setPlayer1] = useState({ x: 100, y: 200, health: 100, action: 'idle' });
  const [player2, setPlayer2] = useState({ x: 300, y: 200, health: 100, action: 'idle' });
  const [score, setScore] = useState(0);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayer1(prev => ({ ...prev, x: Math.max(0, prev.x - 5), action: 'walk' }));
        break;
      case 'ArrowRight':
        setPlayer1(prev => ({ ...prev, x: Math.min(GAME_WIDTH - 50, prev.x + 5), action: 'walk' }));
        break;
      case ' ':
        setPlayer1(prev => ({ ...prev, action: 'punch' }));
        // Check if punch hits player 2
        if (Math.abs(player1.x - player2.x) < 60) {
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }));
          const newScore = score + 10;
          setScore(newScore);
          onScoreChange(newScore);
        }
        setTimeout(() => setPlayer1(prev => ({ ...prev, action: 'idle' })), 200);
        break;
      case 'ArrowUp':
        setPlayer1(prev => ({ ...prev, action: 'kick' }));
        if (Math.abs(player1.x - player2.x) < 70) {
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 15) }));
          const newScore = score + 15;
          setScore(newScore);
          onScoreChange(newScore);
        }
        setTimeout(() => setPlayer1(prev => ({ ...prev, action: 'idle' })), 300);
        break;
    }
  }, [gameState, player1.x, player2.x, score, onScoreChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // AI for player 2
  useEffect(() => {
    if (gameState !== 'playing') return;

    const aiLoop = setInterval(() => {
      const distance = Math.abs(player1.x - player2.x);
      
      if (distance > 80) {
        // Move towards player 1
        setPlayer2(prev => ({
          ...prev,
          x: prev.x < player1.x ? prev.x + 2 : prev.x - 2,
          action: 'walk'
        }));
      } else if (distance < 60 && Math.random() > 0.7) {
        // Attack
        setPlayer2(prev => ({ ...prev, action: 'punch' }));
        if (distance < 50) {
          setPlayer1(prev => ({ ...prev, health: Math.max(0, prev.health - 8) }));
        }
        setTimeout(() => setPlayer2(prev => ({ ...prev, action: 'idle' })), 200);
      } else {
        setPlayer2(prev => ({ ...prev, action: 'idle' }));
      }
    }, 300);

    return () => clearInterval(aiLoop);
  }, [gameState, player1.x, player2.x]);

  const getPlayerSprite = (player: { action: string }) => {
    switch (player.action) {
      case 'punch': return '👊';
      case 'kick': return '🦵';
      case 'walk': return '🚶';
      default: return '🥋';
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-blue-900 to-blue-600" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-400 to-yellow-600 opacity-30"></div>
      
      {/* Health bars */}
      <div className="absolute top-4 left-4 right-4 flex justify-between">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-white mb-1">RYU</div>
          <div className="w-32 h-4 bg-red-800 rounded">
            <div 
              className="h-full bg-green-500 rounded transition-all duration-300"
              style={{ width: `${player1.health}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-white mb-1">KEN</div>
          <div className="w-32 h-4 bg-red-800 rounded">
            <div 
              className="h-full bg-green-500 rounded transition-all duration-300"
              style={{ width: `${player2.health}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Round indicator */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-white text-xl font-bold">
        ROUND 1
      </div>

      {/* Player 1 */}
      <div 
        className="absolute text-4xl transition-all duration-100"
        style={{ left: player1.x, top: player1.y }}
      >
        {getPlayerSprite(player1)}
      </div>

      {/* Player 2 */}
      <div 
        className="absolute text-4xl transition-all duration-100 transform scale-x-[-1]"
        style={{ left: player2.x, top: player2.y }}
      >
        {getPlayerSprite(player2)}
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-600"></div>

      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-xs text-white">
        ←→: Move | SPACE: Punch | ↑: Kick
      </div>
    </div>
  );
};

export default StreetFighterGame;