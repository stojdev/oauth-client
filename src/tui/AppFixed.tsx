import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import { MainDashboard } from './components/Dashboard/MainDashboard.js';
import { EnhancedAuthWizard } from './components/Auth/EnhancedAuthWizard.js';
import { EnhancedTokenManager } from './components/Token/EnhancedTokenManager.js';
import { EnhancedConfigManager } from './components/Config/EnhancedConfigManager.js';
import { ConfigManager } from './screens/ConfigManager.js';
import { TokenInspector } from './components/Inspector/TokenInspector.js';
import { Header } from './components/Common/Header.js';
import { MainMenu } from './components/MainMenu.js';
import { HelpModal } from './components/Common/HelpModal.js';
import { HelpCenter } from './screens/HelpCenter.js';
import { StatusBar } from './components/Common/StatusBar.js';
import { NotificationDisplay } from './components/Common/NotificationDisplay.js';
import { NotificationProvider } from './hooks/useNotification.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { existsSync } from 'fs';
import { join } from 'path';

export type View = 'menu' | 'dashboard' | 'auth' | 'tokens' | 'config' | 'inspect' | 'help' | 'config-manager' | 'help-center';

interface AppProps {
  initialView?: View;
}

// Single static header component that never re-renders
const StaticHeader = React.memo<{ activeView: View }>(({ activeView }) => {
  const headerRef = useRef<boolean>(false);

  // Only render once
  if (headerRef.current) {
    return null;
  }
  headerRef.current = true;

  return <Header activeView={activeView} />;
}, () => true); // Never re-render

const AppContent: React.FC<AppProps> = ({ initialView = 'menu' }) => {
  const [activeView, setActiveView] = useState<View>(initialView);
  const [showHelp, setShowHelp] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [headerKey, setHeaderKey] = useState(0);
  const { exit } = useApp();
  const { stdout } = useStdout();

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

  const handleViewChange = useCallback((newView: string) => {
    // Clear the screen completely before changing views
    if (stdout) {
      stdout.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top
    }

    // Force header to re-initialize
    setHeaderKey(prev => prev + 1);

    if (newView === 'help') {
      setShowHelp(true);
    } else {
      setActiveView(newView as View);
    }
  }, [stdout]);

  const handleBack = useCallback(() => {
    if (showHelp) {
      setShowHelp(false);
    } else if (activeView !== 'menu') {
      if (stdout) {
        stdout.write('\x1b[2J\x1b[H');
      }
      setHeaderKey(prev => prev + 1);
      setActiveView('menu');
    } else {
      setIsExiting(true);
      setTimeout(() => exit(), 100);
    }
  }, [showHelp, activeView, exit, stdout]);

  // Memoize keyboard shortcuts to prevent recreation on every render
  const keyboardShortcuts = useMemo(() => ({
    'escape': handleBack,
    'q': () => {
      if (activeView === 'menu' || isExiting) {
        setIsExiting(true);
        setTimeout(() => exit(), 100);
      }
    },
    '?': () => setShowHelp(true),
    'h': () => handleViewChange('help-center'),
    'F1': () => handleViewChange('help-center'),
    'ctrl+d': () => handleViewChange('dashboard'),
    'ctrl+a': () => hasConfig && handleViewChange('auth'),
    'ctrl+t': () => handleViewChange('tokens'),
    'ctrl+c': () => handleViewChange('config'),
    'ctrl+i': () => handleViewChange('inspect'),
    'ctrl+m': () => handleViewChange('menu'),
  }), [handleBack, handleViewChange, activeView, isExiting, exit, hasConfig]);

  // Global keyboard shortcuts
  useKeyboard({
    shortcuts: keyboardShortcuts,
    enabled: !showHelp
  });

  if (isExiting) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green">👋 Goodbye! Thanks for using OAuth CLI.</Text>
      </Box>
    );
  }

  // Create a completely new render tree on each view change
  const renderContent = () => {
    switch (activeView) {
      case 'menu':
        return <MainMenu onSelect={handleViewChange} hasConfig={hasConfig} />;
      case 'dashboard':
        return <MainDashboard />;
      case 'auth':
        return <EnhancedAuthWizard onComplete={() => setActiveView('dashboard')} onCancel={() => setActiveView('menu')} />;
      case 'tokens':
        return <EnhancedTokenManager />;
      case 'config':
        return <EnhancedConfigManager />;
      case 'inspect':
        return <TokenInspector />;
      case 'config-manager':
        return <ConfigManager onBack={() => setActiveView('menu')} />;
      case 'help-center':
        return <HelpCenter onBack={() => setActiveView('menu')} />;
      default:
        return null;
    }
  };

  return (
    <Box key={headerKey} flexDirection="column" minHeight={20} height="100%">
      {/* Single header instance that gets recreated with new key */}
      <Box key={`header-${headerKey}`} flexShrink={0}>
        <Header activeView={activeView} />
      </Box>

      <Box flexGrow={1} flexDirection="column" paddingX={1} overflow="hidden">
        {showHelp && (
          <Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
            <HelpModal onClose={() => setShowHelp(false)} />
          </Box>
        )}

        {renderContent()}
      </Box>

      <Box flexShrink={0}>
        <StatusBar activeView={activeView} />
        <NotificationDisplay />
      </Box>
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