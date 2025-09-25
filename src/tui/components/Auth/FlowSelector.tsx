import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useKeyboard } from '../../hooks/useKeyboard.js';

export type OAuthFlow =
  | 'authorization_code'
  | 'client_credentials'
  | 'device_code'
  | 'password'
  | 'refresh_token'
  | 'implicit';

interface FlowInfo {
  id: OAuthFlow;
  name: string;
  description: string;
  icon: string;
  recommended?: boolean;
  deprecated?: boolean;
  requiresUserInteraction: boolean;
}

const FLOWS: FlowInfo[] = [
  {
    id: 'authorization_code',
    name: 'Authorization Code (with PKCE)',
    description: 'Most secure flow for web and native apps with user interaction',
    icon: '🔐',
    recommended: true,
    requiresUserInteraction: true,
  },
  {
    id: 'client_credentials',
    name: 'Client Credentials',
    description: 'For server-to-server authentication without user context',
    icon: '🤖',
    requiresUserInteraction: false,
  },
  {
    id: 'device_code',
    name: 'Device Authorization',
    description: 'For devices with limited input capabilities (TVs, CLI apps)',
    icon: '📱',
    requiresUserInteraction: true,
  },
  {
    id: 'password',
    name: 'Resource Owner Password',
    description: 'Legacy flow for trusted applications (not recommended)',
    icon: '🔑',
    deprecated: true,
    requiresUserInteraction: false,
  },
  {
    id: 'refresh_token',
    name: 'Refresh Token',
    description: 'Renew an expired access token',
    icon: '♻️',
    requiresUserInteraction: false,
  },
  {
    id: 'implicit',
    name: 'Implicit Grant',
    description: 'Deprecated flow for SPAs (use authorization code instead)',
    icon: '⚠️',
    deprecated: true,
    requiresUserInteraction: true,
  },
];

interface FlowSelectorProps {
  onSelect: (flow: OAuthFlow) => void;
  onCancel: () => void;
  supportedFlows?: OAuthFlow[];
}

export const FlowSelector: React.FC<FlowSelectorProps> = ({
  onSelect,
  onCancel,
  supportedFlows
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Filter flows based on what's supported
  const availableFlows = supportedFlows
    ? FLOWS.filter(f => supportedFlows.includes(f.id))
    : FLOWS;

  const currentFlow = availableFlows[selectedIndex];

  useKeyboard({
    shortcuts: {
      up: () => setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : availableFlows.length - 1
      ),
      down: () => setSelectedIndex((prev) =>
        (prev + 1) % availableFlows.length
      ),
      enter: () => onSelect(currentFlow.id),
      escape: onCancel,
      '?': () => setShowDetails(!showDetails),
      d: () => setShowDetails(!showDetails),
    },
    enabled: true,
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔐 Select OAuth Flow
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {availableFlows.map((flow, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={flow.id} flexDirection="column">
              <Box flexDirection="row">
                <Box width={3}>
                  <Text>{isSelected ? '▶' : ' '}</Text>
                </Box>
                <Box width={3}>
                  <Text>{flow.icon}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text
                    color={
                      flow.deprecated ? 'gray' :
                      flow.recommended ? 'green' :
                      isSelected ? 'cyan' : undefined
                    }
                    bold={isSelected}
                    strikethrough={flow.deprecated}
                  >
                    {flow.name}
                    {flow.recommended && <Text color="green"> ⭐</Text>}
                    {flow.deprecated && <Text color="red"> (Deprecated)</Text>}
                  </Text>
                </Box>
              </Box>
              {isSelected && showDetails && (
                <Box marginLeft={6} marginTop={1}>
                  <Text dimColor wrap="wrap">
                    {flow.description}
                  </Text>
                  {flow.requiresUserInteraction && (
                    <Box marginTop={1}>
                      <Text color="yellow">
                        ℹ️ Requires user interaction
                      </Text>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          [↑/↓] Navigate • [Enter] Select • [?/d] Toggle details • [ESC] Cancel
        </Text>
      </Box>
    </Box>
  );
};