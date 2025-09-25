import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MainDashboard } from './components/Dashboard/MainDashboard.js';
import { AuthWizard } from './components/Auth/AuthWizard.js';
import { TokenManager } from './components/Token/TokenManager.js';
import { ConfigManager } from './components/Config/ConfigManager.js';
import { Header } from './components/Common/Header.js';
import { Footer } from './components/Common/Footer.js';

export type View = 'dashboard' | 'auth' | 'tokens' | 'config' | 'inspect';

interface AppProps {
  initialView?: View;
}

export const App: React.FC<AppProps> = ({ initialView = 'dashboard' }) => {
  const [activeView, setActiveView] = useState<View>(initialView);
  const [isExiting, setIsExiting] = useState(false);
  const { exit } = useApp();

  useInput((input, key) => {
    // Global keyboard shortcuts
    if (key.escape) {
      setIsExiting(true);
      setTimeout(() => exit(), 100);
      return;
    }

    // View navigation with Ctrl+key
    if (key.ctrl) {
      switch (input) {
        case 'd':
          setActiveView('dashboard');
          break;
        case 'a':
          setActiveView('auth');
          break;
        case 't':
          setActiveView('tokens');
          break;
        case 'c':
          setActiveView('config');
          break;
        case 'i':
          setActiveView('inspect');
          break;
      }
    }
  });

  if (isExiting) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green">👋 Goodbye! Thanks for using OAuth CLI.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={20}>
      <Header activeView={activeView} />

      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        {activeView === 'dashboard' && <MainDashboard />}
        {activeView === 'auth' && <AuthWizard onComplete={() => setActiveView('dashboard')} />}
        {activeView === 'tokens' && <TokenManager />}
        {activeView === 'config' && <ConfigManager />}
        {activeView === 'inspect' && (
          <Box paddingY={1}>
            <Text color="yellow">JWT Inspector - Coming Soon!</Text>
          </Box>
        )}
      </Box>

      <Footer />
    </Box>
  );
};