import React, { useState } from 'react';
import { Power, Volume2, Coins } from 'lucide-react';
import GameSelector from './GameSelector';
import GameScreen from './GameScreen';
import { games } from '../data/games';

const ArcadeMachine: React.FC = () => {
  const [isPoweredOn, setIsPoweredOn] = useState(true);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [credits, setCredits] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleInsertCoin = () => {
    setCredits(prev => prev + 1);
    // Coin sound effect would go here
  };

  const handleStartGame = (gameId: number) => {
    if (credits > 0) {
      setCredits(prev => prev - 1);
      setSelectedGame(gameId);
      setIsPlaying(true);
      console.log('Starting game:', gameId); // Debug log
    }
  };

  const handleBackToMenu = () => {
    setSelectedGame(null);
    setIsPlaying(false);
    console.log('Back to menu'); // Debug log
  };

  const handlePowerToggle = () => {
    setIsPoweredOn(!isPoweredOn);
    if (isPoweredOn) {
      setSelectedGame(null);
      setIsPlaying(false);
    }
  };
  if (!isPoweredOn) {
    return (
      <div className="arcade-cabinet">
        <div className="cabinet-top">
          <div className="marquee">
            <div className="marquee-light"></div>
            <h1 className="marquee-text">RETRO ARCADE</h1>
            <div className="marquee-light"></div>
          </div>
          
          <div className="screen-bezel">
            <div className="crt-screen bg-black flex items-center justify-center">
              <div className="text-green-500 text-2xl font-mono animate-pulse">
                POWER OFF
              </div>
            </div>
          </div>
        </div>
        <div className="control-panel">
          <div className="control-section">
            <div className="center-controls">
              <button
                onClick={handlePowerToggle}
                className="power-button bg-red-600 hover:bg-red-500"
              >
                <Power className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        <div className="cabinet-base">
          <div className="coin-door">
            <div className="coin-slot"></div>
            <div className="coin-return"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arcade-cabinet">
      {/* Cabinet Top with Screen */}
      <div className="cabinet-top">
        <div className="marquee">
          <div className="marquee-light"></div>
          <h1 className="marquee-text">RETRO ARCADE</h1>
          <div className="marquee-light"></div>
        </div>
        
        <div className="screen-bezel">
          <div className="crt-screen">
            <div className="scanlines"></div>
            {selectedGame && isPlaying ? (
              <GameScreen 
                game={games.find(g => g.id === selectedGame)!}
                onBackToMenu={handleBackToMenu}
              />
            ) : (
              <GameSelector 
                games={games}
                onSelectGame={handleStartGame}
                credits={credits}
              />
            )}
          </div>
        </div>

        {/* Speaker Grilles */}
        <div className="speakers">
          <div className="speaker-left">
            <div className="speaker-grille"></div>
          </div>
          <div className="speaker-right">
            <div className="speaker-grille"></div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <div className="control-section">
          {/* Player 1 Controls */}
          <div className="player-controls">
            <div className="joystick">
              <div className="joystick-base"></div>
              <div className="joystick-stick"></div>
            </div>
            <div className="action-buttons">
              <button className="arcade-button red"></button>
              <button className="arcade-button blue"></button>
              <button className="arcade-button yellow"></button>
            </div>
          </div>

          {/* Center Controls */}
          <div className="center-controls">
            <button
              onClick={handleInsertCoin}
              className="coin-button"
            >
              <Coins className="w-6 h-6" />
              <span>INSERT COIN</span>
            </button>
            
            <div className="credits-display">
              <span>CREDITS: {credits}</span>
            </div>

            <button
              onClick={handlePowerToggle}
              className="power-button"
            >
              <Power className="w-4 h-4" />
            </button>

            <button className="volume-button">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Player 2 Controls */}
          <div className="player-controls">
            <div className="joystick">
              <div className="joystick-base"></div>
              <div className="joystick-stick"></div>
            </div>
            <div className="action-buttons">
              <button className="arcade-button red"></button>
              <button className="arcade-button blue"></button>
              <button className="arcade-button yellow"></button>
            </div>
          </div>
        </div>
      </div>

      {/* Cabinet Base */}
      <div className="cabinet-base">
        <div className="coin-door">
          <div className="coin-slot"></div>
          <div className="coin-return"></div>
        </div>
      </div>
    </div>
  );
};

export default ArcadeMachine;