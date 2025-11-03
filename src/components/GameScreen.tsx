import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Game } from '../types/game';
import PacManGame from './games/PacManGame';
import TetrisGame from './games/TetrisGame';
import SpaceInvadersGame from './games/SpaceInvadersGame';
import SnakeGame from './games/SnakeGame';
import PongGame from './games/PongGame';
import DonkeyKongGame from './games/DonkeyKongGame';
import StreetFighterGame from './games/StreetFighterGame';
import GalagaGame from './games/GalagaGame';
import FroggerGame from './games/FroggerGame';
import CentipedeGame from './games/CentipedeGame';
import AsteroidsGame from './games/AsteroidsGame';
import QBertGame from './games/QBertGame';
import DefenderGame from './games/DefenderGame';
import JoustGame from './games/JoustGame';
import MissileCommandGame from './games/MissileCommandGame';
import PitfallGame from './games/PitfallGame';
import BubbleBobbleGame from './games/BubbleBobbleGame';
import TempestGame from './games/TempestGame';
import RobotronGame from './games/RobotronGame';
import PaperboyGame from './games/PaperboyGame';
import MortalKombatGame from './games/MortalKombatGame';

interface GameScreenProps {
  game: Game;
  onBackToMenu: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ game, onBackToMenu }) => {
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'paused' | 'gameover'>('loading');
  const [score, setScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGameState('playing');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const renderGame = () => {
    switch (game.title) {
      case 'PAC-MAN':
        return <PacManGame onScoreChange={setScore} gameState={gameState} />;
      case 'TETRIS':
        return <TetrisGame onScoreChange={setScore} gameState={gameState} />;
      case 'SPACE INVADERS':
        return <SpaceInvadersGame onScoreChange={setScore} gameState={gameState} />;
      case 'SNAKE':
        return <SnakeGame onScoreChange={setScore} gameState={gameState} />;
      case 'PONG':
        return <PongGame onScoreChange={setScore} gameState={gameState} />;
      case 'DONKEY KONG':
        return <DonkeyKongGame onScoreChange={setScore} gameState={gameState} />;
      case 'STREET FIGHTER II':
        return <StreetFighterGame onScoreChange={setScore} gameState={gameState} />;
      case 'GALAGA':
        return <GalagaGame onScoreChange={setScore} gameState={gameState} />;
      case 'FROGGER':
        return <FroggerGame onScoreChange={setScore} gameState={gameState} />;
      case 'CENTIPEDE':
        return <CentipedeGame onScoreChange={setScore} gameState={gameState} />;
      case 'ASTEROIDS':
        return <AsteroidsGame onScoreChange={setScore} gameState={gameState} />;
      case 'Q*BERT':
        return <QBertGame onScoreChange={setScore} gameState={gameState} />;
      case 'DEFENDER':
        return <DefenderGame onScoreChange={setScore} gameState={gameState} />;
      case 'JOUST':
        return <JoustGame onScoreChange={setScore} gameState={gameState} />;
      case 'MISSILE COMMAND':
        return <MissileCommandGame onScoreChange={setScore} gameState={gameState} />;
      case 'PITFALL!':
        return <PitfallGame onScoreChange={setScore} gameState={gameState} />;
      case 'BUBBLE BOBBLE':
        return <BubbleBobbleGame onScoreChange={setScore} gameState={gameState} />;
      case 'TEMPEST':
        return <TempestGame onScoreChange={setScore} gameState={gameState} />;
      case 'ROBOTRON: 2084':
        return <RobotronGame onScoreChange={setScore} gameState={gameState} />;
      case 'PAPERBOY':
        return <PaperboyGame onScoreChange={setScore} gameState={gameState} />;
      case 'MORTAL KOMBAT':
        return <MortalKombatGame onScoreChange={setScore} gameState={gameState} />;
      default:
        return (
          <div className="generic-game">
            <div className="game-icon-large">{game.icon}</div>
            <h2>{game.title}</h2>
            <p>Game implementation coming soon!</p>
            <div className="demo-animation">
              <div className="pixel-art">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className="pixel"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      backgroundColor: `hsl(${(i * 30) % 360}, 70%, 50%)`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  if (gameState === 'loading') {
    return (
      <div className="game-loading">
        <div className="loading-screen">
          <div className="game-logo">
            <div className="logo-icon">{game.icon}</div>
            <h1>{game.title}</h1>
          </div>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
          <div className="loading-text">LOADING...</div>
          <div className="copyright">© {game.year} RETRO ARCADE</div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <div className="game-header">
        <button onClick={onBackToMenu} className="back-button">
          <ArrowLeft className="w-4 h-4" />
          MENU
        </button>
        <div className="game-title">{game.title}</div>
        <div className="score-display">SCORE: {score.toLocaleString()}</div>
      </div>

      <div className="game-area">
        {renderGame()}
      </div>

      <div className="game-footer">
        <div className="controls-hint">
          USE ARROW KEYS TO MOVE • SPACE TO ACTION
        </div>
      </div>
    </div>
  );
};

export default GameScreen;