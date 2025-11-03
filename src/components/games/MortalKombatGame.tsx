import React, { useState, useEffect, useCallback } from 'react';

interface MortalKombatGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;

const MortalKombatGame: React.FC<MortalKombatGameProps> = ({ onScoreChange, gameState }) => {
  const [player1, setPlayer1] = useState({ 
    x: 100, 
    y: 200, 
    health: 100, 
    action: 'idle',
    facing: 'right'
  });
  const [player2, setPlayer2] = useState({ 
    x: 300, 
    y: 200, 
    health: 100, 
    action: 'idle',
    facing: 'left'
  });
  const [score, setScore] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || winner) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        setPlayer1(prev => ({ 
          ...prev, 
          x: Math.max(0, prev.x - 4), 
          action: 'walk',
          facing: 'left'
        }));
        break;
      case 'ArrowRight':
        setPlayer1(prev => ({ 
          ...prev, 
          x: Math.min(GAME_WIDTH - 50, prev.x + 4), 
          action: 'walk',
          facing: 'right'
        }));
        break;
      case ' ':
        setPlayer1(prev => ({ ...prev, action: 'punch' }));
        // Check if punch hits player 2
        if (Math.abs(player1.x - player2.x) < 60) {
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 12) }));
          const newScore = score + 10;
          setScore(newScore);
          onScoreChange(newScore);
        }
        setTimeout(() => setPlayer1(prev => ({ ...prev, action: 'idle' })), 300);
        break;
      case 'ArrowUp':
        setPlayer1(prev => ({ ...prev, action: 'kick' }));
        if (Math.abs(player1.x - player2.x) < 70) {
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 18) }));
          const newScore = score + 15;
          setScore(newScore);
          onScoreChange(newScore);
        }
        setTimeout(() => setPlayer1(prev => ({ ...prev, action: 'idle' })), 400);
        break;
      case 'ArrowDown':
        // Special move
        setPlayer1(prev => ({ ...prev, action: 'special' }));
        if (Math.abs(player1.x - player2.x) < 80) {
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 25) }));
          const newScore = score + 25;
          setScore(newScore);
          onScoreChange(newScore);
        }
        setTimeout(() => setPlayer1(prev => ({ ...prev, action: 'idle' })), 600);
        break;
    }
  }, [gameState, player1.x, player2.x, score, winner, onScoreChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // AI for player 2
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;

    const aiLoop = setInterval(() => {
      const distance = Math.abs(player1.x - player2.x);
      
      if (distance > 100) {
        // Move towards player 1
        setPlayer2(prev => ({
          ...prev,
          x: prev.x < player1.x ? prev.x + 2 : prev.x - 2,
          action: 'walk',
          facing: prev.x < player1.x ? 'right' : 'left'
        }));
      } else if (distance < 70 && Math.random() > 0.6) {
        // Attack
        const attackType = Math.random();
        if (attackType > 0.7) {
          setPlayer2(prev => ({ ...prev, action: 'special' }));
          if (distance < 80) {
            setPlayer1(prev => ({ ...prev, health: Math.max(0, prev.health - 20) }));
          }
          setTimeout(() => setPlayer2(prev => ({ ...prev, action: 'idle' })), 600);
        } else if (attackType > 0.4) {
          setPlayer2(prev => ({ ...prev, action: 'kick' }));
          if (distance < 70) {
            setPlayer1(prev => ({ ...prev, health: Math.max(0, prev.health - 15) }));
          }
          setTimeout(() => setPlayer2(prev => ({ ...prev, action: 'idle' })), 400);
        } else {
          setPlayer2(prev => ({ ...prev, action: 'punch' }));
          if (distance < 60) {
            setPlayer1(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }));
          }
          setTimeout(() => setPlayer2(prev => ({ ...prev, action: 'idle' })), 300);
        }
      } else {
        setPlayer2(prev => ({ ...prev, action: 'idle' }));
      }
    }, 400);

    return () => clearInterval(aiLoop);
  }, [gameState, player1.x, player2.x, winner]);

  // Check for winner
  useEffect(() => {
    if (player1.health <= 0) {
      setWinner('Player 2 Wins!');
    } else if (player2.health <= 0) {
      setWinner('Player 1 Wins!');
      const newScore = score + 1000;
      setScore(newScore);
      onScoreChange(newScore);
    }
  }, [player1.health, player2.health, score, onScoreChange]);

  const getPlayerSprite = (player: { action: string }) => {
    switch (player.action) {
      case 'punch': return '👊';
      case 'kick': return '🦵';
      case 'special': return '⚡';
      case 'walk': return '🚶';
      default: return '🥋';
    }
  };

  const getActionEffect = (player: { action: string }) => {
    if (player.action === 'special') return '💥';
    if (player.action === 'punch') return '👊';
    if (player.action === 'kick') return '💨';
    return '';
  };

  return (
    <div className="relative bg-gradient-to-b from-red-900 to-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-red-900 opacity-50"></div>
      
      {/* Health bars */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
        <div className="bg-gray-800 p-2 rounded border-2 border-yellow-400">
          <div className="text-xs text-yellow-400 mb-1 font-bold">SCORPION</div>
          <div className="w-32 h-6 bg-red-800 rounded border">
            <div 
              className="h-full bg-green-500 rounded transition-all duration-300"
              style={{ width: `${player1.health}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded border-2 border-yellow-400">
          <div className="text-xs text-yellow-400 mb-1 font-bold">SUB-ZERO</div>
          <div className="w-32 h-6 bg-red-800 rounded border">
            <div 
              className="h-full bg-green-500 rounded transition-all duration-300"
              style={{ width: `${player2.health}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Round indicator */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-yellow-400 text-xl font-bold z-10">
        ROUND 1
      </div>

      {/* Winner announcement */}
      {winner && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="text-4xl text-yellow-400 font-bold mb-4 animate-pulse">
              {winner}
            </div>
            <div className="text-xl text-red-500 font-bold animate-bounce">
              FATALITY!
            </div>
          </div>
        </div>
      )}

      {/* Player 1 */}
      <div 
        className="absolute text-4xl transition-all duration-100 z-10"
        style={{ 
          left: player1.x, 
          top: player1.y,
          transform: player1.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
        }}
      >
        {getPlayerSprite(player1)}
      </div>

      {/* Player 1 action effects */}
      {player1.action !== 'idle' && player1.action !== 'walk' && (
        <div 
          className="absolute text-2xl animate-ping z-10"
          style={{ 
            left: player1.x + (player1.facing === 'right' ? 40 : -20), 
            top: player1.y + 10
          }}
        >
          {getActionEffect(player1)}
        </div>
      )}

      {/* Player 2 */}
      <div 
        className="absolute text-4xl transition-all duration-100 z-10"
        style={{ 
          left: player2.x, 
          top: player2.y,
          transform: player2.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
        }}
      >
        {getPlayerSprite(player2)}
      </div>

      {/* Player 2 action effects */}
      {player2.action !== 'idle' && player2.action !== 'walk' && (
        <div 
          className="absolute text-2xl animate-ping z-10"
          style={{ 
            left: player2.x + (player2.facing === 'right' ? 40 : -20), 
            top: player2.y + 10
          }}
        >
          {getActionEffect(player2)}
        </div>
      )}

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-700 border-t-4 border-yellow-600"></div>

      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-xs text-yellow-400 z-10">
        ←→: Move | SPACE: Punch | ↑: Kick | ↓: Special
      </div>
    </div>
  );
};

export default MortalKombatGame;