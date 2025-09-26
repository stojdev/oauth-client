import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { JWTInspector } from './JWTInspector.js';
import { TokenManager } from '../../../core/TokenManager.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';

type InspectorMode = 'menu' | 'manual' | 'stored' | 'inspect';

interface StoredTokenInfo {
  provider: string;
  token: string;
  type: 'access' | 'refresh' | 'id';
}

export const TokenInspector: React.FC = () => {
  const [mode, setMode] = useState<InspectorMode>('menu');
  const [storedTokens, setStoredTokens] = useState<StoredTokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Create single instance using useMemo to prevent memory leaks
  const tokenManager = useMemo(() => new TokenManager(), []);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (mode === 'stored') {
      loadStoredTokens();
    }
  }, [mode]);

  const loadStoredTokens = async () => {
    setLoading(true);
    try {
      const tokens = await tokenManager.getAllTokens();
      const tokenList: StoredTokenInfo[] = [];

      for (const token of tokens) {
        if (token.access_token) {
          // Check if it's a JWT (has 3 parts separated by dots)
          if (token.access_token.split('.').length === 3) {
            tokenList.push({
              provider: token.provider,
              token: token.access_token,
              type: 'access'
            });
          }
        }
        if (token.refresh_token && token.refresh_token.split('.').length === 3) {
          tokenList.push({
            provider: token.provider,
            token: token.refresh_token,
            type: 'refresh'
          });
        }
        // Check for ID token if it exists
        if ('id_token' in token && token.id_token) {
          const idToken = token.id_token as string;
          if (idToken.split('.').length === 3) {
            tokenList.push({
              provider: token.provider,
              token: idToken,
              type: 'id'
            });
          }
        }
      }

      setStoredTokens(tokenList);
      if (tokenList.length === 0) {
        showNotification('No JWT tokens found in storage', 'warning');
        setMode('menu');
      }
    } catch (error) {
      showNotification('Failed to load stored tokens', 'error');
      setMode('menu');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuSelect = (item: { value: string }) => {
    switch (item.value) {
      case 'manual':
        setMode('manual');
        break;
      case 'stored':
        setMode('stored');
        break;
      case 'exit':
        // Return to main menu
        break;
    }
  };

  const handleTokenSelect = (item: { value: string }) => {
    setSelectedToken(item.value);
    setMode('inspect');
  };

  useKeyboard({
    shortcuts: {
      escape: () => {
        if (mode === 'inspect') {
          setMode(storedTokens.length > 0 ? 'stored' : 'menu');
        } else if (mode === 'manual' || mode === 'stored') {
          setMode('menu');
        }
      },
      m: () => setMode('manual'),
      s: () => setMode('stored'),
    },
    enabled: mode !== 'inspect',
  });

  // Main Menu
  if (mode === 'menu') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔍 Token Inspector
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Select inspection mode:</Text>
        </Box>

        <SelectInput
          items={[
            {
              label: '✏️  Manual Entry - Paste a JWT token',
              value: 'manual'
            },
            {
              label: '📦 Stored Tokens - Inspect saved tokens',
              value: 'stored'
            },
            {
              label: '❌ Back to Main Menu',
              value: 'exit'
            }
          ]}
          onSelect={handleMenuSelect}
        />

        <Box marginTop={2} flexDirection="column" gap={1}>
          <Box borderStyle="single" borderColor="blue" paddingX={1}>
            <Text color="blue">ℹ️ About JWT Inspector:</Text>
          </Box>
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>• Decode and inspect JWT tokens</Text>
            <Text dimColor>• View header, payload, and signature</Text>
            <Text dimColor>• Check token expiration</Text>
            <Text dimColor>• Copy decoded sections</Text>
            <Text dimColor>• No verification (inspection only)</Text>
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text dimColor>[M] Manual Entry</Text>
          <Text dimColor>[S] Stored Tokens</Text>
          <Text dimColor>[ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  // Manual Entry Mode
  if (mode === 'manual') {
    return (
      <JWTInspector
        onBack={() => setMode('menu')}
      />
    );
  }

  // Stored Tokens Mode
  if (mode === 'stored') {
    if (loading) {
      return (
        <Box paddingY={1}>
          <Text color="cyan">Loading stored tokens...</Text>
        </Box>
      );
    }

    if (storedTokens.length === 0) {
      return (
        <Box flexDirection="column" paddingY={1}>
          <Text color="yellow">No JWT tokens found in storage</Text>
          <Box marginTop={1}>
            <Text dimColor>JWT tokens have 3 parts separated by dots.</Text>
          </Box>
          <Box marginTop={2}>
            <Text dimColor>[ESC] Back</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            📦 Select a Token to Inspect
          </Text>
        </Box>

        <SelectInput
          items={storedTokens.map(token => ({
            label: `${token.provider} - ${token.type === 'id' ? 'ID' : token.type === 'refresh' ? 'Refresh' : 'Access'} Token`,
            value: token.token
          }))}
          onSelect={handleTokenSelect}
        />

        <Box marginTop={2}>
          <Text dimColor>[ESC] Back to Menu</Text>
        </Box>
      </Box>
    );
  }

  // Inspect Mode
  if (mode === 'inspect') {
    return (
      <JWTInspector
        initialToken={selectedToken}
        onBack={() => setMode(storedTokens.length > 0 ? 'stored' : 'menu')}
      />
    );
  }

  return null;
};