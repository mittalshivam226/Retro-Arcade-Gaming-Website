import React, { useState } from 'react';
import LoadingScreen from './components/LoadingScreen';
import ArcadeMachine from './components/ArcadeMachine';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <ArcadeMachine />
    </div>
  );
}

export default App;
