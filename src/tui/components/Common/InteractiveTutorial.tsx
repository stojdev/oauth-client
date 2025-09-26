import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useKeyboard } from '../../hooks/useKeyboard.js';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  tips?: string[];
  keyboardHints?: string[];
  actionRequired?: boolean;
  completionCriteria?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  estimatedDuration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  steps: TutorialStep[];
}

interface InteractiveTutorialProps {
  tutorial: Tutorial;
  onComplete?: () => void;
  onClose?: () => void;
  onStepChange?: (stepIndex: number) => void;
  autoAdvance?: boolean;
  showProgress?: boolean;
}

const DEFAULT_TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with OAuth CLI',
    description: 'Learn the basics of using the OAuth CLI tool',
    estimatedDuration: '5-10 minutes',
    difficulty: 'beginner',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to OAuth CLI',
        content: 'OAuth CLI is a powerful terminal-based tool for testing OAuth 2.0 flows. This tutorial will guide you through the basic features and navigation.',
        tips: [
          'Use arrow keys or j/k to navigate',
          'Press Enter to proceed to the next step',
          'Press ESC at any time to exit the tutorial'
        ]
      },
      {
        id: 'navigation',
        title: 'Basic Navigation',
        content: 'The main menu is your starting point. From here you can access different areas of the application using keyboard shortcuts.',
        keyboardHints: [
          'Ctrl+D - Dashboard',
          'Ctrl+A - Authentication',
          'Ctrl+T - Token Management',
          'Ctrl+C - Configuration'
        ],
        tips: [
          'Global shortcuts work from anywhere in the app',
          'ESC always goes back one level',
          'Press ? or h for help at any time'
        ]
      },
      {
        id: 'configuration',
        title: 'Setting Up Your First Provider',
        content: 'Before you can authenticate, you need to configure an OAuth provider. This includes setting up client credentials and endpoint URLs.',
        actionRequired: true,
        completionCriteria: 'Navigate to Configuration Manager (Ctrl+C)',
        tips: [
          'Start with well-known providers like Google or GitHub',
          'Use provider discovery when possible',
          'Always test your configuration before using it'
        ]
      },
      {
        id: 'authentication',
        title: 'Your First Authentication Flow',
        content: 'Once configured, you can test OAuth flows. The Authorization Code flow is most common for web applications.',
        actionRequired: true,
        completionCriteria: 'Navigate to Authentication Wizard (Ctrl+A)',
        keyboardHints: [
          '1 - Authorization Code Flow',
          '2 - Client Credentials Flow',
          '3 - Device Code Flow'
        ]
      },
      {
        id: 'tokens',
        title: 'Managing Tokens',
        content: 'After successful authentication, tokens are stored securely. You can view, refresh, and inspect them in the Token Manager.',
        keyboardHints: [
          'v - View token details',
          'r - Refresh token',
          'i - Inspect JWT tokens',
          'c - Copy to clipboard'
        ]
      },
      {
        id: 'completion',
        title: 'Tutorial Complete',
        content: 'Congratulations! You now know the basics of OAuth CLI. Explore the help system (?) for more advanced features.',
        tips: [
          'Check out the keyboard shortcuts reference',
          'Try different OAuth flows',
          'Experiment with token inspection',
          'Use the search feature (Ctrl+/) to quickly find options'
        ]
      }
    ]
  },
  {
    id: 'advanced-flows',
    title: 'Advanced OAuth Flows',
    description: 'Learn about PKCE, device flows, and custom grant types',
    estimatedDuration: '10-15 minutes',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'pkce-intro',
        title: 'PKCE (Proof Key for Code Exchange)',
        content: 'PKCE adds security to the Authorization Code flow by using dynamically generated secrets instead of static client secrets.',
        tips: [
          'PKCE is recommended for all public clients',
          'It prevents authorization code interception attacks',
          'Required for mobile and single-page applications'
        ]
      },
      {
        id: 'device-flow',
        title: 'Device Authorization Flow',
        content: 'The device flow is designed for devices with limited input capabilities, like smart TVs or IoT devices.',
        keyboardHints: [
          '3 - Select Device Code Flow',
          'c - Copy device code to clipboard'
        ],
        tips: [
          'Perfect for devices without a web browser',
          'User completes authorization on a separate device',
          'Polling-based token retrieval'
        ]
      },
      {
        id: 'client-credentials',
        title: 'Client Credentials Flow',
        content: 'Used for machine-to-machine authentication where no user interaction is required.',
        tips: [
          'No user authorization required',
          'Client authenticates directly with authorization server',
          'Common for API-to-API communication'
        ]
      }
    ]
  }
];

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  tutorial,
  onComplete,
  onClose,
  onStepChange,
  // autoAdvance = false,
  showProgress = true,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());

  const currentStep = tutorial.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / tutorial.steps.length) * 100;

  useEffect(() => {
    setStepStartTime(Date.now());
    onStepChange?.(currentStepIndex);
  }, [currentStepIndex, onStepChange]);

  const nextStep = () => {
    if (currentStepIndex < tutorial.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsCompleted(true);
      onComplete?.();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const skipTutorial = () => {
    setIsCompleted(true);
    onClose?.();
  };

  useKeyboard({
    shortcuts: {
      'enter': nextStep,
      'right': nextStep,
      'l': nextStep,
      'left': prevStep,
      'h': prevStep,
      'escape': skipTutorial,
      'q': skipTutorial,
      's': skipTutorial,
      'up': prevStep,
      'down': nextStep,
      'j': nextStep,
      'k': prevStep,
      ' ': nextStep, // Space bar
    },
  });

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const formatElapsedTime = (startTime: number): string => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (isCompleted) {
    const totalTime = formatElapsedTime(startTime);
    return (
      <Box flexDirection="column" borderStyle="double" borderColor="green" paddingX={2} paddingY={1}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="green">✅ Tutorial Completed!</Text>
        </Box>
        
        <Box justifyContent="center" marginBottom={1}>
          <Text bold>{tutorial.title}</Text>
        </Box>

        <Box justifyContent="center" marginBottom={2}>
          <Text dimColor>Completed in {totalTime}</Text>
        </Box>

        <Box flexDirection="column" marginBottom={2}>
          <Text>Great job! You've completed the tutorial. Here's what you learned:</Text>
          <Box marginTop={1} flexDirection="column">
            {tutorial.steps.map((step) => (
              <Box key={step.id} marginY={0}>
                <Text color="green">✓</Text>
                <Box marginLeft={1}><Text>{step.title}</Text></Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box justifyContent="center" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>Press ESC or q to close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text bold color="cyan">{tutorial.title}</Text>
        </Box>
        <Box>
          <Text dimColor>
            Step {currentStepIndex + 1} of {tutorial.steps.length}
          </Text>
        </Box>
      </Box>

      {/* Tutorial metadata */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={2}>
          {tutorial.difficulty && (
            <Text color={getDifficultyColor(tutorial.difficulty)}>
              {tutorial.difficulty.toUpperCase()}
            </Text>
          )}
          {tutorial.estimatedDuration && (
            <Text dimColor>~{tutorial.estimatedDuration}</Text>
          )}
        </Box>
        <Text dimColor>Elapsed: {formatElapsedTime(stepStartTime)}</Text>
      </Box>

      {/* Progress bar */}
      {showProgress && (
        <Box marginBottom={1}>
          <Box borderStyle="single" borderColor="gray" width="100%" paddingX={1}>
            <Box width={Math.floor(progress / 5)}>
              <Text color="cyan">{'█'.repeat(Math.floor(progress / 5))}</Text>
            </Box>
            <Box width={20 - Math.floor(progress / 5)}>
              <Text dimColor>{'░'.repeat(20 - Math.floor(progress / 5))}</Text>
            </Box>
          </Box>
          <Text dimColor> {Math.round(progress)}%</Text>
        </Box>
      )}

      {/* Current Step */}
      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold color="yellow">{currentStep.title}</Text>
          {currentStep.actionRequired && (
            <Text color="red" bold> *</Text>
          )}
        </Box>

        <Box marginBottom={1}>
          <Text>{currentStep.content}</Text>
        </Box>

        {/* Completion criteria */}
        {currentStep.completionCriteria && (
          <Box marginBottom={1} borderStyle="single" borderColor="yellow" paddingX={1}>
            <Text color="yellow">Action Required: </Text>
            <Text>{currentStep.completionCriteria}</Text>
          </Box>
        )}

        {/* Keyboard hints */}
        {currentStep.keyboardHints && currentStep.keyboardHints.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold dimColor>Keyboard Shortcuts:</Text>
            {currentStep.keyboardHints.map((hint, index) => (
              <Box key={index} marginLeft={2}>
                <Text color="green">•</Text>
                <Box marginLeft={1}><Text color="cyan">{hint}</Text></Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Tips */}
        {currentStep.tips && currentStep.tips.length > 0 && (
          <Box flexDirection="column">
            <Text bold dimColor>💡 Tips:</Text>
            {currentStep.tips.map((tip, index) => (
              <Box key={index} marginLeft={2}>
                <Text color="yellow">•</Text>
                <Box marginLeft={1}><Text dimColor>{tip}</Text></Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box justifyContent="space-between" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text dimColor>
            {currentStepIndex > 0 ? '← Prev (h)' : ''}
          </Text>
        </Box>
        <Box>
          <Text dimColor>Enter/Space: Next • ESC: Exit • s: Skip</Text>
        </Box>
        <Box>
          <Text dimColor>
            {currentStepIndex < tutorial.steps.length - 1 ? 'Next (l) →' : 'Complete'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

// Export default tutorials for easy access
export const DEFAULT_TUTORIALS_EXPORT = DEFAULT_TUTORIALS;