import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useApp } from 'ink';
import { MainDashboard } from './components/Dashboard/MainDashboard.js';
import { EnhancedAuthWizard } from './components/Auth/EnhancedAuthWizard.js';
import { EnhancedTokenManager } from './components/Token/EnhancedTokenManager.js';
import { EnhancedConfigManager } from './components/Config/EnhancedConfigManager.js';
import { ConfigManager } from './screens/ConfigManager.js';
import { TokenInspector } from './components/Inspector/TokenInspector.js';
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

// Create a SINGLE static header that displays inline with tabs
const InlineHeader: React.FC<{ activeView: View }> = ({ activeView }) => {
  const tabs = [
    { view: 'menu' as View, label: 'Menu', shortcut: 'Ctrl+M' },
    { view: 'dashboard' as View, label: 'Dashboard', shortcut: 'Ctrl+D' },
    { view: 'auth' as View, label: 'Auth', shortcut: 'Ctrl+A' },
    { view: 'tokens' as View, label: 'Tokens', shortcut: 'Ctrl+T' },
    { view: 'config' as View, label: 'Config', shortcut: 'Ctrl+C' },
    { view: 'inspect' as View, label: 'Inspect', shortcut: 'Ctrl+I' },
  ];

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Title line */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="blue">🔐 OAuth CLI v1.0.0</Text>
        <Text dimColor>Terminal User Interface</Text>
      </Box>
      {/* Navigation tabs */}
      <Box gap={2}>
        {tabs.map((tab) => (
          <Text
            key={tab.view}
            color={activeView === tab.view ? 'green' : 'gray'}
            bold={activeView === tab.view}
          >
            [{tab.shortcut}] {tab.label}
          </Text>
        ))}
      </Box>
      {/* Border */}
      <Box marginTop={1}>
        <Text dimColor>{'─'.repeat(80)}</Text>
      </Box>
    </Box>
  );
};

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

  const handleViewChange = useCallback((newView: string) => {
    if (newView === 'help') {
      setShowHelp(true);
    } else {
      setActiveView(newView as View);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (showHelp) {
      setShowHelp(false);
    } else if (activeView !== 'menu') {
      setActiveView('menu');
    } else {
      setIsExiting(true);
      setTimeout(() => exit(), 100);
    }
  }, [showHelp, activeView, exit]);

  // Memoize keyboard shortcuts
  const keyboardShortcuts = useMemo(() => ({
    'escape': handleBack,
    'q': () => {
      if (activeView === 'menu' || isExiting) {
        setIsExiting(true);
        setTimeout(() => exit(), 100);
      }
    },
    '?': () => setShowHelp(true),
    'h': () => setActiveView('help-center'),
    'F1': () => setActiveView('help-center'),
    'ctrl+d': () => setActiveView('dashboard'),
    'ctrl+a': () => hasConfig && setActiveView('auth'),
    'ctrl+t': () => setActiveView('tokens'),
    'ctrl+c': () => setActiveView('config'),
    'ctrl+i': () => setActiveView('inspect'),
    'ctrl+m': () => setActiveView('menu'),
  }), [handleBack, activeView, isExiting, exit, hasConfig]);

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

  // Render current view content
  const renderView = () => {
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
    <Box flexDirection="column" minHeight={20}>
      {/* Single inline header */}
      <InlineHeader activeView={activeView} />

      {/* Content area */}
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        {showHelp && (
          <Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
            <HelpModal onClose={() => setShowHelp(false)} />
          </Box>
        )}
        {renderView()}
      </Box>

      {/* Status bar */}
      <Box flexShrink={0} marginTop={1}>
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