import React, { useState, useEffect, useRef, useCallback } from 'react';

interface StreetFighterGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const GROUND_Y = 220;

interface Fighter {
  x: number;
  y: number;
  health: number;
  action: 'idle' | 'walk' | 'punch' | 'kick' | 'block' | 'hurt';
  facing: 'left' | 'right';
}

const StreetFighterGame: React.FC<StreetFighterGameProps> = ({ onScoreChange, gameState }) => {
  const [player1, setPlayer1] = useState<Fighter>({ x: 80, y: GROUND_Y, health: 100, action: 'idle', facing: 'right' });
  const [player2, setPlayer2] = useState<Fighter>({ x: 280, y: GROUND_Y, health: 100, action: 'idle', facing: 'left' });
  const [score, setScore] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [round] = useState(1);

  const player1Ref = useRef(player1);
  const player2Ref = useRef(player2);
  const scoreRef = useRef(score);
  const winnerRef = useRef(winner);

  player1Ref.current = player1;
  player2Ref.current = player2;
  scoreRef.current = score;
  winnerRef.current = winner;

  const checkWinner = useCallback(() => {
    if (player1Ref.current.health <= 0 && !winnerRef.current) {
      setWinner('SUB-ZERO WINS!');
    } else if (player2Ref.current.health <= 0 && !winnerRef.current) {
      const newScore = scoreRef.current + 500;
      scoreRef.current = newScore;
      setScore(newScore);
      onScoreChange(newScore);
      setWinner('RYU WINS!');
    }
  }, [onScoreChange]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || winnerRef.current) return;

    const p1 = player1Ref.current;
    const p2 = player2Ref.current;
    const distance = Math.abs(p1.x - p2.x);

    switch (event.key) {
      case 'ArrowLeft':
        setPlayer1(prev => ({
          ...prev,
          x: Math.max(20, prev.x - 6),
          action: 'walk',
          facing: 'left'
        }));
        setTimeout(() => setPlayer1(prev => prev.action === 'walk' ? { ...prev, action: 'idle' } : prev), 150);
        break;

      case 'ArrowRight':
        setPlayer1(prev => ({
          ...prev,
          x: Math.min(GAME_WIDTH - 60, prev.x + 6),
          action: 'walk',
          facing: 'right'
        }));
        setTimeout(() => setPlayer1(prev => prev.action === 'walk' ? { ...prev, action: 'idle' } : prev), 150);
        break;

      case ' ':
        setPlayer1(prev => ({ ...prev, action: 'punch' }));
        if (distance < 65) {
          setPlayer2(prev => {
            const newHealth = Math.max(0, prev.health - 12);
            const newScore = scoreRef.current + 10;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...prev, health: newHealth, action: 'hurt' };
          });
          setTimeout(() => {
            setPlayer2(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev);
            checkWinner();
          }, 200);
        }
        setTimeout(() => setPlayer1(prev => prev.action === 'punch' ? { ...prev, action: 'idle' } : prev), 300);
        break;

      case 'ArrowUp':
        setPlayer1(prev => ({ ...prev, action: 'kick' }));
        if (distance < 80) {
          setPlayer2(prev => {
            const newHealth = Math.max(0, prev.health - 18);
            const newScore = scoreRef.current + 15;
            scoreRef.current = newScore;
            setScore(newScore);
            onScoreChange(newScore);
            return { ...prev, health: newHealth, action: 'hurt' };
          });
          setTimeout(() => {
            setPlayer2(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev);
            checkWinner();
          }, 300);
        }
        setTimeout(() => setPlayer1(prev => prev.action === 'kick' ? { ...prev, action: 'idle' } : prev), 400);
        break;

      case 'ArrowDown':
        setPlayer1(prev => ({ ...prev, action: 'block' }));
        setTimeout(() => setPlayer1(prev => prev.action === 'block' ? { ...prev, action: 'idle' } : prev), 400);
        break;
    }
  }, [gameState, checkWinner, onScoreChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // AI for Player 2
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;

    const aiLoop = setInterval(() => {
      const p1 = player1Ref.current;
      const p2 = player2Ref.current;
      if (winnerRef.current) return;

      const distance = Math.abs(p1.x - p2.x);

      if (distance > 90) {
        // Move toward player
        setPlayer2(prev => ({
          ...prev,
          x: prev.x < p1.x ? prev.x + 3 : prev.x - 3,
          action: 'walk',
          facing: prev.x < p1.x ? 'right' : 'left'
        }));
        setTimeout(() => setPlayer2(prev => prev.action === 'walk' ? { ...prev, action: 'idle' } : prev), 150);
      } else if (distance < 75 && Math.random() > 0.5) {
        const r = Math.random();
        if (r > 0.6) {
          // Kick
          setPlayer2(prev => ({ ...prev, action: 'kick' }));
          if (distance < 80) {
            setPlayer1(prev => {
              // Check if blocking
              if (prev.action === 'block') return { ...prev };
              return { ...prev, health: Math.max(0, prev.health - 14), action: 'hurt' };
            });
            setTimeout(() => {
              setPlayer1(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev);
              checkWinner();
            }, 300);
          }
          setTimeout(() => setPlayer2(prev => prev.action === 'kick' ? { ...prev, action: 'idle' } : prev), 400);
        } else {
          // Punch
          setPlayer2(prev => ({ ...prev, action: 'punch' }));
          if (distance < 65) {
            setPlayer1(prev => {
              if (prev.action === 'block') return { ...prev };
              return { ...prev, health: Math.max(0, prev.health - 10), action: 'hurt' };
            });
            setTimeout(() => {
              setPlayer1(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev);
              checkWinner();
            }, 200);
          }
          setTimeout(() => setPlayer2(prev => prev.action === 'punch' ? { ...prev, action: 'idle' } : prev), 300);
        }
      }
    }, 400);

    return () => clearInterval(aiLoop);
  }, [gameState, winner, checkWinner]);

  const getSprite = (fighter: Fighter) => {
    switch (fighter.action) {
      case 'punch': return '👊';
      case 'kick': return '🦵';
      case 'block': return '🛡️';
      case 'hurt': return '😵';
      case 'walk': return '🚶';
      default: return '🥋';
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        background: 'linear-gradient(180deg, #1a237e 0%, #4a148c 50%, #880e4f 100%)'
      }}
    >
      {/* Crowd silhouette */}
      <div className="absolute top-0 left-0 right-0 h-16 opacity-20 bg-gradient-to-b from-gray-600 to-transparent" />

      {/* Health bars */}
      <div className="absolute top-3 left-3 right-3 flex justify-between z-10">
        <div className="bg-black bg-opacity-70 p-1.5 rounded border border-yellow-400">
          <div className="text-xs text-yellow-400 font-bold mb-1">RYU</div>
          <div className="w-28 h-4 bg-gray-800 rounded overflow-hidden border border-gray-600">
            <div
              className="h-full rounded transition-all duration-200"
              style={{
                width: `${player1.health}%`,
                background: player1.health > 50 ? '#22c55e' : player1.health > 25 ? '#eab308' : '#ef4444'
              }}
            />
          </div>
        </div>
        <div className="text-center text-yellow-400 text-sm font-bold">
          ROUND {round}
        </div>
        <div className="bg-black bg-opacity-70 p-1.5 rounded border border-yellow-400">
          <div className="text-xs text-yellow-400 font-bold mb-1 text-right">SUB-ZERO</div>
          <div className="w-28 h-4 bg-gray-800 rounded overflow-hidden border border-gray-600">
            <div
              className="h-full rounded transition-all duration-200 ml-auto"
              style={{
                width: `${player2.health}%`,
                background: player2.health > 50 ? '#22c55e' : player2.health > 25 ? '#eab308' : '#ef4444'
              }}
            />
          </div>
        </div>
      </div>

      {/* Player 1 */}
      <div
        className="absolute text-4xl transition-all duration-75 z-10"
        style={{
          left: player1.x,
          top: player1.y,
          transform: player1.facing === 'left' ? 'scaleX(-1)' : undefined
        }}
      >
        {getSprite(player1)}
      </div>

      {/* Player 2 */}
      <div
        className="absolute text-4xl transition-all duration-75 z-10"
        style={{
          left: player2.x,
          top: player2.y,
          transform: player2.facing === 'left' ? 'scaleX(-1)' : undefined
        }}
      >
        {getSprite(player2)}
      </div>

      {/* Ground */}
      <div className="absolute left-0 right-0 h-16 bottom-0 bg-gray-700 border-t-4 border-yellow-600" />

      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-xs text-yellow-300 z-10">
        ←→: Move | SPACE: Punch | ↑: Kick | ↓: Block
      </div>

      {/* Score */}
      <div className="absolute bottom-2 right-2 text-xs text-yellow-300 z-10">
        SCORE: {score}
      </div>

      {/* Winner announcement */}
      {winner && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-20 flex-col">
          <div className="text-4xl text-yellow-400 font-bold mb-3 animate-pulse">{winner}</div>
          <div className="text-2xl text-red-500 font-bold animate-bounce">FLAWLESS VICTORY!</div>
        </div>
      )}
    </div>
  );
};

export default StreetFighterGame;