import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Play } from 'lucide-react';
import { Game } from '../types/game';

interface GameSelectorProps {
  games: Game[];
  onSelectGame: (gameId: number) => void;
  credits: number;
}

const GameSelector: React.FC<GameSelectorProps> = ({ games, onSelectGame, credits }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const gamesPerPage = 6;
  const totalPages = Math.ceil(games.length / gamesPerPage);

  const currentGames = games.slice(
    currentPage * gamesPerPage,
    (currentPage + 1) * gamesPerPage
  );

  const handleUp = () => {
    setSelectedIndex(prev => prev > 0 ? prev - 1 : currentGames.length - 1);
  };

  const handleDown = () => {
    setSelectedIndex(prev => prev < currentGames.length - 1 ? prev + 1 : 0);
  };

  const handlePageUp = () => {
    setCurrentPage(prev => prev > 0 ? prev - 1 : totalPages - 1);
    setSelectedIndex(0);
  };

  const handlePageDown = () => {
    setCurrentPage(prev => prev < totalPages - 1 ? prev + 1 : 0);
    setSelectedIndex(0);
  };

  const handleGameSelect = () => {
    const selectedGame = currentGames[selectedIndex];
    if (selectedGame && credits > 0) {
      onSelectGame(selectedGame.id);
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        handleUp();
        break;
      case 'ArrowDown':
        event.preventDefault();
        handleDown();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handlePageUp();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handlePageDown();
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        handleGameSelect();
        break;
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedIndex, currentPage, credits, currentGames]);

  const selectedGame = currentGames[selectedIndex];

  return (
    <div className="game-selector">
      <div className="selector-header">
        <div className="title-glow">
          <h2 className="selector-title">SELECT GAME</h2>
        </div>
        <div className="page-info">
          PAGE {currentPage + 1} OF {totalPages}
        </div>
      </div>

      <div className="game-list">
        <div className="game-grid">
          {currentGames.map((game, index) => (
            <div
              key={game.id}
              className={`game-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => setSelectedIndex(index)}
              onDoubleClick={() => {
                setSelectedIndex(index);
                handleGameSelect();
              }}
            >
              <div className="game-icon">{game.icon}</div>
              <div className="game-info">
                <div className="game-title">{game.title}</div>
                <div className="game-year">{game.year}</div>
              </div>
              {index === selectedIndex && (
                <div className="selection-indicator">
                  <Play className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="navigation-controls">
          <button onClick={handlePageUp} className="nav-button">
            <ChevronUp className="w-6 h-6" />
            <span>PREV PAGE</span>
          </button>
          
          <div className="game-controls">
            <button onClick={handleUp} className="nav-button small">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={handleDown} className="nav-button small">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <button onClick={handlePageDown} className="nav-button">
            <ChevronDown className="w-6 h-6" />
            <span>NEXT PAGE</span>
          </button>
        </div>
      </div>

      {selectedGame && (
        <div className="game-preview">
          <div className="preview-screen">
            <div className="preview-icon">{selectedGame.icon}</div>
            <div className="preview-info">
              <h3>{selectedGame.title}</h3>
              <p>{selectedGame.description}</p>
              <div className="game-stats">
                <span>YEAR: {selectedGame.year}</span>
                <span>RATING: {selectedGame.rating}/5</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleGameSelect}
            disabled={credits === 0}
            className={`start-button ${credits === 0 ? 'disabled' : ''}`}
          >
            {credits === 0 ? 'INSERT COIN' : 'START GAME'}
          </button>
        </div>
      )}

      <div className="credits-info">
        CREDITS: {credits} | INSERT COIN TO PLAY
        <div className="controls-hint">
          ↑↓: Navigate | ←→: Change Page | SPACE/ENTER: Select Game
        </div>
      </div>
    </div>
  );
};

export default GameSelector;