import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MortalKombatGameProps {
  onScoreChange: (score: number) => void;
  gameState: string;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const GROUND_Y = 210;

interface Fighter {
  x: number;
  y: number;
  health: number;
  action: 'idle' | 'walk' | 'punch' | 'kick' | 'special' | 'hurt';
  facing: 'left' | 'right';
}

const MortalKombatGame: React.FC<MortalKombatGameProps> = ({ onScoreChange, gameState }) => {
  const [player1, setPlayer1] = useState<Fighter>({
    x: 80, y: GROUND_Y, health: 100, action: 'idle', facing: 'right'
  });
  const [player2, setPlayer2] = useState<Fighter>({
    x: 270, y: GROUND_Y, health: 100, action: 'idle', facing: 'left'
  });
  const [score, setScore] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const player1Ref = useRef(player1);
  const player2Ref = useRef(player2);
  const scoreRef = useRef(score);
  const winnerRef = useRef(winner);
  const comboRef = useRef(combo);

  player1Ref.current = player1;
  player2Ref.current = player2;
  scoreRef.current = score;
  winnerRef.current = winner;
  comboRef.current = combo;

  const checkWinner = useCallback(() => {
    const p1h = player1Ref.current.health;
    const p2h = player2Ref.current.health;
    if (p2h <= 0 && !winnerRef.current) {
      const bonus = 1000 + comboRef.current * 100;
      const newScore = scoreRef.current + bonus;
      scoreRef.current = newScore;
      setScore(newScore);
      onScoreChange(newScore);
      setWinner('SCORPION WINS!');
    } else if (p1h <= 0 && !winnerRef.current) {
      setWinner('SUB-ZERO WINS!');
    }
  }, [onScoreChange]);

  const addCombo = useCallback(() => {
    setCombo(prev => {
      const next = prev + 1;
      comboRef.current = next;
      return next;
    });
    if (comboTimer) clearTimeout(comboTimer);
    const t = setTimeout(() => { setCombo(0); comboRef.current = 0; }, 1500);
    setComboTimer(t);
  }, [comboTimer]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== 'playing' || winnerRef.current) return;

    const p1 = player1Ref.current;
    const p2 = player2Ref.current;
    const distance = Math.abs(p1.x - p2.x);

    switch (event.key) {
      case 'ArrowLeft':
        setPlayer1(prev => ({
          ...prev, x: Math.max(20, prev.x - 5), action: 'walk', facing: 'left'
        }));
        setTimeout(() => setPlayer1(prev => prev.action === 'walk' ? { ...prev, action: 'idle' } : prev), 120);
        break;

      case 'ArrowRight':
        setPlayer1(prev => ({
          ...prev, x: Math.min(GAME_WIDTH - 60, prev.x + 5), action: 'walk', facing: 'right'
        }));
        setTimeout(() => setPlayer1(prev => prev.action === 'walk' ? { ...prev, action: 'idle' } : prev), 120);
        break;

      case ' ':
        setPlayer1(prev => ({ ...prev, action: 'punch' }));
        if (distance < 65) {
          addCombo();
          const mult = 1 + Math.min(comboRef.current, 5) * 0.1;
          const dmg = Math.round(12 * mult);
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - dmg), action: 'hurt' }));
          const pts = 10 + comboRef.current * 5;
          const newScore = scoreRef.current + pts;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);
          setTimeout(() => { setPlayer2(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev); checkWinner(); }, 250);
        }
        setTimeout(() => setPlayer1(prev => prev.action === 'punch' ? { ...prev, action: 'idle' } : prev), 300);
        break;

      case 'ArrowUp':
        setPlayer1(prev => ({ ...prev, action: 'kick' }));
        if (distance < 80) {
          addCombo();
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 18), action: 'hurt' }));
          const pts = 15 + comboRef.current * 5;
          const newScore = scoreRef.current + pts;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);
          setTimeout(() => { setPlayer2(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev); checkWinner(); }, 300);
        }
        setTimeout(() => setPlayer1(prev => prev.action === 'kick' ? { ...prev, action: 'idle' } : prev), 400);
        break;

      case 'ArrowDown':
        setPlayer1(prev => ({ ...prev, action: 'special' }));
        if (distance < 90) {
          addCombo();
          setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - 28), action: 'hurt' }));
          const pts = 25 + comboRef.current * 10;
          const newScore = scoreRef.current + pts;
          scoreRef.current = newScore;
          setScore(newScore);
          onScoreChange(newScore);
          setTimeout(() => { setPlayer2(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev); checkWinner(); }, 400);
        }
        setTimeout(() => setPlayer1(prev => prev.action === 'special' ? { ...prev, action: 'idle' } : prev), 600);
        break;
    }
  }, [gameState, addCombo, checkWinner, onScoreChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // AI for Player 2
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;

    const aiLoop = setInterval(() => {
      if (winnerRef.current) return;
      const p1 = player1Ref.current;
      const p2 = player2Ref.current;
      const distance = Math.abs(p1.x - p2.x);

      if (distance > 100) {
        setPlayer2(prev => ({
          ...prev,
          x: prev.x < p1.x ? prev.x + 2.5 : prev.x - 2.5,
          action: 'walk',
          facing: prev.x < p1.x ? 'right' : 'left'
        }));
        setTimeout(() => setPlayer2(prev => prev.action === 'walk' ? { ...prev, action: 'idle' } : prev), 120);
      } else if (distance < 80 && Math.random() > 0.5) {
        const r = Math.random();
        let dmg = 0;
        let action: Fighter['action'] = 'punch';

        if (r > 0.75) { action = 'special'; dmg = 22; }
        else if (r > 0.45) { action = 'kick'; dmg = 15; }
        else { action = 'punch'; dmg = 10; }

        setPlayer2(prev => ({ ...prev, action }));

        if (distance < (action === 'special' ? 90 : action === 'kick' ? 80 : 65)) {
          setPlayer1(prev => ({ ...prev, health: Math.max(0, prev.health - dmg), action: 'hurt' }));
          setTimeout(() => { setPlayer1(prev => prev.action === 'hurt' ? { ...prev, action: 'idle' } : prev); checkWinner(); }, 250);
        }

        const delay = action === 'special' ? 600 : action === 'kick' ? 400 : 300;
        setTimeout(() => setPlayer2(prev => prev.action === action ? { ...prev, action: 'idle' } : prev), delay);
      }
    }, 450);

    return () => clearInterval(aiLoop);
  }, [gameState, winner, checkWinner]);

  const getSprite = (fighter: Fighter) => {
    switch (fighter.action) {
      case 'punch': return '👊';
      case 'kick': return '🦵';
      case 'special': return '⚡';
      case 'hurt': return '😵';
      case 'walk': return '🚶';
      default: return '🥷';
    }
  };

  const getActionEffect = (fighter: Fighter) => {
    if (fighter.action === 'special') return '💥';
    if (fighter.action === 'punch') return '👊';
    if (fighter.action === 'kick') return '💨';
    return null;
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        background: 'linear-gradient(180deg, #1a0000 0%, #3d0000 40%, #1a0000 100%)'
      }}
    >
      {/* Background pillars */}
      {[60, 160, 260, 340].map(x => (
        <div key={x} className="absolute bottom-12 w-6 bg-gray-800 opacity-40" style={{ left: x, height: 100 }} />
      ))}

      {/* Health bars */}
      <div className="absolute top-3 left-3 right-3 flex justify-between z-10 items-center">
        <div className="bg-black bg-opacity-80 p-1.5 rounded border-2 border-yellow-500">
          <div className="text-xs text-yellow-400 font-bold mb-1">SCORPION</div>
          <div className="w-28 h-5 bg-gray-900 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-150"
              style={{
                width: `${player1.health}%`,
                background: player1.health > 50 ? '#22c55e' : player1.health > 25 ? '#eab308' : '#dc2626'
              }}
            />
          </div>
        </div>
        <div className="text-center">
          <div className="text-yellow-500 text-sm font-bold">ROUND 1</div>
          {combo > 1 && (
            <div className="text-orange-400 text-xs font-bold animate-pulse">{combo}x COMBO!</div>
          )}
        </div>
        <div className="bg-black bg-opacity-80 p-1.5 rounded border-2 border-blue-400">
          <div className="text-xs text-blue-300 font-bold mb-1 text-right">SUB-ZERO</div>
          <div className="w-28 h-5 bg-gray-900 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-150 ml-auto"
              style={{
                width: `${player2.health}%`,
                background: player2.health > 50 ? '#22c55e' : player2.health > 25 ? '#eab308' : '#dc2626'
              }}
            />
          </div>
        </div>
      </div>

      {/* Player 1 */}
      <div
        className="absolute text-4xl transition-all duration-75 z-10"
        style={{
          left: player1.x, top: player1.y,
          transform: player1.facing === 'left' ? 'scaleX(-1)' : undefined
        }}
      >
        {getSprite(player1)}
      </div>

      {/* Player 1 effect */}
      {getActionEffect(player1) && (
        <div
          className="absolute text-2xl animate-ping z-10"
          style={{ left: player1.x + (player1.facing === 'right' ? 45 : -25), top: player1.y + 10 }}
        >
          {getActionEffect(player1)}
        </div>
      )}

      {/* Player 2 */}
      <div
        className="absolute text-4xl transition-all duration-75 z-10"
        style={{
          left: player2.x, top: player2.y,
          transform: player2.facing === 'left' ? 'scaleX(-1)' : undefined
        }}
      >
        {getSprite(player2)}
      </div>

      {/* Player 2 effect */}
      {getActionEffect(player2) && (
        <div
          className="absolute text-2xl animate-ping z-10"
          style={{ left: player2.x + (player2.facing === 'right' ? 45 : -25), top: player2.y + 10 }}
        >
          {getActionEffect(player2)}
        </div>
      )}

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-800 border-t-4 border-yellow-700" />

      {/* Controls */}
      <div className="absolute bottom-2 left-2 text-xs text-yellow-600 z-10">
        ←→: Move | SPACE: Punch | ↑: Kick | ↓: Special
      </div>
      <div className="absolute bottom-2 right-2 text-xs text-yellow-400 z-10">
        SCORE: {score}
      </div>

      {/* Winner */}
      {winner && (
        <div className="absolute inset-0 bg-black bg-opacity-85 flex items-center justify-center z-20 flex-col">
          <div className="text-5xl text-yellow-400 font-bold mb-4 animate-pulse">{winner}</div>
          <div className="text-3xl text-red-600 font-bold animate-bounce">FATALITY!</div>
          <div className="text-white mt-4 text-lg">Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default MortalKombatGame;