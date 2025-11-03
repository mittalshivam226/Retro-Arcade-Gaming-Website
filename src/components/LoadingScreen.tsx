import React, { useEffect, useState } from 'react';

const LoadingScreen: React.FC<{ onLoadingComplete: () => void }> = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('INITIALIZING ARCADE SYSTEM');

  const loadingTexts = [
    'INITIALIZING ARCADE SYSTEM',
    'LOADING GAME DATA',
    'CALIBRATING CONTROLS',
    'WARMING UP PROCESSORS',
    'READY TO PLAY!'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          setTimeout(onLoadingComplete, 500);
          return 100;
        }

        // Update text based on progress
        const textIndex = Math.floor((newProgress / 100) * loadingTexts.length);
        setCurrentText(loadingTexts[Math.min(textIndex, loadingTexts.length - 1)]);

        return newProgress;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onLoadingComplete, loadingTexts]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* CRT Screen Effect Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 opacity-50"></div>

      {/* Main Loading Container */}
      <div className="arcade-cabinet relative z-10 flex flex-col items-center justify-center text-center">
        {/* Top Marquee */}
        <div className="marquee mb-8">
          <div className="marquee-text text-xl">LOADING...</div>
          <div className="marquee-light"></div>
        </div>

        {/* Screen Bezel */}
        <div className="screen-bezel flex flex-col items-center justify-center">
          <div className="crt-screen flex flex-col items-center justify-center p-8">
            {/* Scanlines overlay */}
            <div className="scanlines absolute inset-0"></div>

            {/* Loading Content */}
            <div className="relative z-10 text-center">
              {/* Retro Logo */}
              <div className="mb-8">
                <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-green-400 to-cyan-400 mb-4 animate-pulse">
                  RETRO ARCADE
                </h1>
                <div className="text-2xl md:text-4xl text-green-400 font-mono tracking-wider">
                  GAMING MACHINE
                </div>
              </div>

              {/* Loading Text */}
              <div className="mb-8">
                <div className="text-green-400 text-lg md:text-xl font-mono mb-4 animate-pulse">
                  {currentText}
                </div>

                {/* Progress Bar */}
                <div className="w-80 max-w-sm mx-auto">
                  <div className="bg-gray-800 border-2 border-green-400 p-2 rounded">
                    <div
                      className="bg-gradient-to-r from-green-400 to-cyan-400 h-4 rounded transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-green-400 text-sm font-mono mt-2">
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>

              {/* Loading Animation */}
              <div className="flex justify-center space-x-2 mb-8">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>

              {/* Game Icons Preview */}
              <div className="flex justify-center space-x-4 opacity-60">
                <div className="text-yellow-400 text-2xl">🕹️</div>
                <div className="text-red-400 text-2xl">👾</div>
                <div className="text-blue-400 text-2xl">🎮</div>
                <div className="text-green-400 text-2xl">🕹️</div>
                <div className="text-cyan-400 text-2xl">👾</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls Hint */}
        <div className="mt-8 text-green-400 text-sm font-mono text-center max-w-md">
          <div className="mb-2">PREPARING CLASSIC ARCADE GAMES</div>
          <div className="text-xs opacity-75">
            Pac-Man • Tetris • Snake • Pong • Asteroids • Galaga • Centipede • And More!
          </div>
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 text-green-400 text-xs font-mono opacity-50">
        RETRO ARCADE v1.0
      </div>
      <div className="absolute bottom-4 right-4 text-green-400 text-xs font-mono opacity-50">
        © 2025 ARCADE SYSTEMS
      </div>
    </div>
  );
};

export default LoadingScreen;
