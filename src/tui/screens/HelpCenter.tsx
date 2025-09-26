import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { KeyboardShortcuts } from '../components/Common/KeyboardShortcuts.js';
import { InteractiveTutorial, Tutorial, DEFAULT_TUTORIALS_EXPORT } from '../components/Common/InteractiveTutorial.js';
import { useKeyboard } from '../hooks/useKeyboard.js';

interface HelpCenterProps {
  onBack?: () => void;
  initialView?: 'main' | 'shortcuts' | 'tutorials' | 'about';
  initialTutorial?: string;
}

type HelpView = 'main' | 'shortcuts' | 'tutorials' | 'tutorial-active' | 'about';

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  shortcut: string;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Complete reference of all keyboard shortcuts',
    icon: '⌨️',
    shortcut: 's',
  },
  {
    id: 'tutorials',
    title: 'Interactive Tutorials',
    description: 'Step-by-step guides for common tasks',
    icon: '📚',
    shortcut: 't',
  },
  {
    id: 'about',
    title: 'About OAuth CLI',
    description: 'Version info, documentation links, and support',
    icon: 'ℹ️',
    shortcut: 'a',
  },
];

export const HelpCenter: React.FC<HelpCenterProps> = ({
  onBack,
  initialView = 'main',
  initialTutorial,
}) => {
  const [currentView, setCurrentView] = useState<HelpView>(initialView);
  const [selectedSection, setSelectedSection] = useState(0);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorialHistory, setTutorialHistory] = useState<string[]>([]);

  const handleSectionSelect = (sectionId: string) => {
    switch (sectionId) {
      case 'shortcuts':
        setCurrentView('shortcuts');
        break;
      case 'tutorials':
        setCurrentView('tutorials');
        break;
      case 'about':
        setCurrentView('about');
        break;
      default:
        break;
    }
  };

  const handleTutorialSelect = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setCurrentView('tutorial-active');
    setTutorialHistory([...tutorialHistory, tutorial.id]);
  };

  const handleTutorialComplete = () => {
    setCurrentView('tutorials');
    setSelectedTutorial(null);
  };

  const handleBack = () => {
    switch (currentView) {
      case 'shortcuts':
      case 'tutorials':
      case 'about':
        setCurrentView('main');
        break;
      case 'tutorial-active':
        setCurrentView('tutorials');
        setSelectedTutorial(null);
        break;
      case 'main':
      default:
        onBack?.();
        break;
    }
  };

  // Main menu keyboard shortcuts
  useKeyboard({
    shortcuts: {
      'escape': handleBack,
      'q': handleBack,
      'up': () => currentView === 'main' && setSelectedSection(Math.max(0, selectedSection - 1)),
      'down': () => currentView === 'main' && setSelectedSection(Math.min(HELP_SECTIONS.length - 1, selectedSection + 1)),
      'j': () => currentView === 'main' && setSelectedSection(Math.min(HELP_SECTIONS.length - 1, selectedSection + 1)),
      'k': () => currentView === 'main' && setSelectedSection(Math.max(0, selectedSection - 1)),
      'enter': () => currentView === 'main' && handleSectionSelect(HELP_SECTIONS[selectedSection].id),
      ' ': () => currentView === 'main' && handleSectionSelect(HELP_SECTIONS[selectedSection].id),
      's': () => currentView === 'main' && handleSectionSelect('shortcuts'),
      't': () => currentView === 'main' && handleSectionSelect('tutorials'),
      'a': () => currentView === 'main' && handleSectionSelect('about'),
      '1': () => currentView === 'main' && handleSectionSelect(HELP_SECTIONS[0]?.id),
      '2': () => currentView === 'main' && handleSectionSelect(HELP_SECTIONS[1]?.id),
      '3': () => currentView === 'main' && handleSectionSelect(HELP_SECTIONS[2]?.id),
    },
    enabled: currentView !== 'shortcuts' && currentView !== 'tutorial-active',
  });

  // Initialize tutorial if specified
  React.useEffect(() => {
    if (initialTutorial && currentView === 'tutorials') {
      const tutorial = DEFAULT_TUTORIALS_EXPORT.find(t => t.id === initialTutorial);
      if (tutorial) {
        handleTutorialSelect(tutorial);
      }
    }
  }, [initialTutorial, currentView]);

  const renderMainMenu = () => (
    <Box flexDirection="column">
      <Box justifyContent="center" marginBottom={2}>
        <Text bold color="cyan">OAuth CLI Help Center</Text>
      </Box>

      <Box justifyContent="center" marginBottom={2}>
        <Text dimColor>Choose a help topic below or use keyboard shortcuts</Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {HELP_SECTIONS.map((section, index) => (
          <Box
            key={section.id}
            borderStyle={index === selectedSection ? 'single' : undefined}
            borderColor={index === selectedSection ? 'yellow' : undefined}
            paddingX={2}
            paddingY={1}
          >
            <Box width={4} justifyContent="center">
              <Text>{section.icon}</Text>
            </Box>
            <Box flexGrow={1} flexDirection="column" marginLeft={2}>
              <Box>
                <Text bold color={index === selectedSection ? 'yellow' : 'white'}>
                  {section.title}
                </Text>
                <Text dimColor> (Press {section.shortcut} or {index + 1})</Text>
              </Box>
              <Text dimColor>{section.description}</Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box marginTop={2} justifyContent="center" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Use ↑/↓ or j/k to navigate • Enter/Space to select • ESC to go back</Text>
      </Box>
    </Box>
  );

  const renderTutorialsList = () => (
    <Box flexDirection="column">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">Interactive Tutorials</Text>
      </Box>

      <Box justifyContent="center" marginBottom={2}>
        <Text dimColor>Choose a tutorial to start learning</Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {DEFAULT_TUTORIALS_EXPORT.map((tutorial, index) => {
          const isCompleted = tutorialHistory.includes(tutorial.id);
          const difficultyColor = tutorial.difficulty === 'beginner' ? 'green' : 
                                 tutorial.difficulty === 'intermediate' ? 'yellow' : 'red';

          return (
            <Box
              key={tutorial.id}
              borderStyle="single"
              borderColor="gray"
              paddingX={2}
              paddingY={1}
            >
              <Box width={4} justifyContent="center">
                <Text color={isCompleted ? 'green' : 'gray'}>
                  {isCompleted ? '✅' : `${index + 1}.`}
                </Text>
              </Box>
              <Box flexGrow={1} flexDirection="column" marginLeft={2}>
                <Box>
                  <Text bold color={isCompleted ? 'green' : 'white'}>
                    {tutorial.title}
                  </Text>
                  {tutorial.difficulty && (
                    <Text color={difficultyColor} dimColor>
                      {' '}[{tutorial.difficulty.toUpperCase()}]
                    </Text>
                  )}
                </Box>
                <Text dimColor>{tutorial.description}</Text>
                {tutorial.estimatedDuration && (
                  <Text dimColor>Duration: ~{tutorial.estimatedDuration}</Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2} justifyContent="center" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Use numbers 1-{DEFAULT_TUTORIALS_EXPORT.length} to start tutorial • ESC to go back</Text>
      </Box>
    </Box>
  );

  const renderAbout = () => (
    <Box flexDirection="column">
      <Box justifyContent="center" marginBottom={2}>
        <Text bold color="cyan">About OAuth CLI</Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Text bold>Version Information</Text>
            <Text dimColor>OAuth CLI v1.0.0</Text>
            <Text dimColor>Built with TypeScript, React, and Ink</Text>
            <Text dimColor>Node.js Runtime Required</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Text bold>Features</Text>
            <Text dimColor>• Complete OAuth 2.0 grant type support</Text>
            <Text dimColor>• PKCE (Proof Key for Code Exchange) support</Text>
            <Text dimColor>• Secure token storage with AES-256-GCM encryption</Text>
            <Text dimColor>• JWT token inspection and validation</Text>
            <Text dimColor>• Provider configuration management</Text>
            <Text dimColor>• Interactive terminal user interface</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Text bold>Supported OAuth Flows</Text>
            <Text dimColor>• Authorization Code Grant (with PKCE)</Text>
            <Text dimColor>• Client Credentials Grant</Text>
            <Text dimColor>• Device Authorization Grant</Text>
            <Text dimColor>• Resource Owner Password Credentials (legacy)</Text>
            <Text dimColor>• Refresh Token Grant</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Text bold>Security Features</Text>
            <Text dimColor>• AES-256-GCM token encryption</Text>
            <Text dimColor>• Environment-based key management</Text>
            <Text dimColor>• PKCE support for public clients</Text>
            <Text dimColor>• Secure credential handling</Text>
            <Text dimColor>• State parameter validation</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Text bold>Configuration</Text>
            <Text dimColor>• JSON/YAML configuration files supported</Text>
            <Text dimColor>• Environment variable support</Text>
            <Text dimColor>• Provider discovery and templates</Text>
            <Text dimColor>• Multiple provider configurations</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Text bold>Getting Help</Text>
            <Text dimColor>• Press ? or h anywhere for context help</Text>
            <Text dimColor>• Use keyboard shortcuts for quick navigation</Text>
            <Text dimColor>• Check tutorials for step-by-step guides</Text>
            <Text dimColor>• Review keyboard shortcuts reference</Text>
          </Box>
        </Box>
      </Box>

      <Box marginTop={2} justifyContent="center" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>ESC to go back • Visit documentation for detailed guides</Text>
      </Box>
    </Box>
  );

  // Tutorial selection for tutorials view
  useKeyboard({
    shortcuts: {
      '1': () => currentView === 'tutorials' && DEFAULT_TUTORIALS_EXPORT[0] && handleTutorialSelect(DEFAULT_TUTORIALS_EXPORT[0]),
      '2': () => currentView === 'tutorials' && DEFAULT_TUTORIALS_EXPORT[1] && handleTutorialSelect(DEFAULT_TUTORIALS_EXPORT[1]),
      '3': () => currentView === 'tutorials' && DEFAULT_TUTORIALS_EXPORT[2] && handleTutorialSelect(DEFAULT_TUTORIALS_EXPORT[2]),
      '4': () => currentView === 'tutorials' && DEFAULT_TUTORIALS_EXPORT[3] && handleTutorialSelect(DEFAULT_TUTORIALS_EXPORT[3]),
      '5': () => currentView === 'tutorials' && DEFAULT_TUTORIALS_EXPORT[4] && handleTutorialSelect(DEFAULT_TUTORIALS_EXPORT[4]),
    },
    enabled: currentView === 'tutorials',
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} minHeight={20}>
      {/* Breadcrumb */}
      <Box marginBottom={1}>
        <Text dimColor>
          Help Center
          {currentView === 'shortcuts' && ' > Keyboard Shortcuts'}
          {currentView === 'tutorials' && ' > Tutorials'}
          {currentView === 'tutorial-active' && selectedTutorial && ` > Tutorials > ${selectedTutorial.title}`}
          {currentView === 'about' && ' > About'}
        </Text>
      </Box>

      {/* Content */}
      <Box flexGrow={1}>
        {currentView === 'main' && renderMainMenu()}
        {currentView === 'shortcuts' && (
          <KeyboardShortcuts onClose={handleBack} />
        )}
        {currentView === 'tutorials' && renderTutorialsList()}
        {currentView === 'tutorial-active' && selectedTutorial && (
          <InteractiveTutorial
            tutorial={selectedTutorial}
            onComplete={handleTutorialComplete}
            onClose={handleTutorialComplete}
          />
        )}
        {currentView === 'about' && renderAbout()}
      </Box>
    </Box>
  );
};