import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { MainDashboard } from './components/Dashboard/MainDashboard.js';
import { EnhancedAuthWizard } from './components/Auth/EnhancedAuthWizard.js';
import { EnhancedTokenManager } from './components/Token/EnhancedTokenManager.js';
import { EnhancedConfigManager } from './components/Config/EnhancedConfigManager.js';
import { ConfigManager } from './screens/ConfigManager.js';
import { TokenInspector } from './components/Inspector/TokenInspector.js';
import { Header } from './components/Common/Header.js';
import { MainMenu } from './components/MainMenu.js';
import { HelpModal } from './components/Common/HelpModal.js';
import { StatusBar } from './components/Common/StatusBar.js';
import { NotificationDisplay } from './components/Common/NotificationDisplay.js';
import { NotificationProvider } from './hooks/useNotification.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { existsSync } from 'fs';
import { join } from 'path';

export type View = 'menu' | 'dashboard' | 'auth' | 'tokens' | 'config' | 'inspect' | 'help' | 'config-manager';

interface AppProps {
  initialView?: View;
}

const AppContent: React.FC<AppProps> = ({ initialView = 'menu' }) => {
  const [activeView, setActiveView] = useState<View>(initialView);
  const [showHelp, setShowHelp] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const { exit } = useApp();

  // Check for configuration
  useEffect(() => {
    const configPaths = [
      join(process.cwd(), '.oauth-cli.json'),
      join(process.cwd(), '.oauth-cli.yaml'),
      join(process.cwd(), '.oauth-cli.yml'),
      join(process.cwd(), 'oauth-config.json'),
      join(process.cwd(), 'oauth-config.yaml'),
      join(process.cwd(), 'oauth-config.yml'),
    ];

    const configExists = configPaths.some(path => existsSync(path));
    setHasConfig(configExists);
  }, []);

  const handleViewChange = (newView: string) => {
    if (newView === 'help') {
      setShowHelp(true);
    } else {
      setActiveView(newView as View);
    }
  };

  const handleBack = () => {
    if (showHelp) {
      setShowHelp(false);
    } else if (activeView !== 'menu') {
      setActiveView('menu');
    } else {
      setIsExiting(true);
      setTimeout(() => exit(), 100);
    }
  };

  // Global keyboard shortcuts
  useKeyboard({
    shortcuts: {
      'escape': handleBack,
      'q': () => {
        if (activeView === 'menu' || isExiting) {
          setIsExiting(true);
          setTimeout(() => exit(), 100);
        }
      },
      '?': () => setShowHelp(true),
      'h': () => setShowHelp(true),
      'ctrl+d': () => setActiveView('dashboard'),
      'ctrl+a': () => hasConfig && setActiveView('auth'),
      'ctrl+t': () => setActiveView('tokens'),
      'ctrl+c': () => setActiveView('config'),
      'ctrl+i': () => setActiveView('inspect'),
      'ctrl+m': () => setActiveView('menu'),
    },
    enabled: !showHelp
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
        {showHelp && (
          <Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
            <HelpModal onClose={() => setShowHelp(false)} />
          </Box>
        )}

        {activeView === 'menu' && (
          <MainMenu onSelect={handleViewChange} hasConfig={hasConfig} />
        )}
        {activeView === 'dashboard' && <MainDashboard />}
        {activeView === 'auth' && <EnhancedAuthWizard onComplete={() => setActiveView('dashboard')} onCancel={() => setActiveView('menu')} />}
        {activeView === 'tokens' && <EnhancedTokenManager />}
        {activeView === 'config' && <EnhancedConfigManager />}
        {activeView === 'inspect' && <TokenInspector />}
        {activeView === 'config-manager' && <ConfigManager onBack={() => setActiveView('menu')} />}
      </Box>

      <StatusBar activeView={activeView} />
      <NotificationDisplay />
    </Box>
  );
};

export const App: React.FC<AppProps> = (props) => {
  return (
    <NotificationProvider>
      <AppContent {...props} />
    </NotificationProvider>
  );
};