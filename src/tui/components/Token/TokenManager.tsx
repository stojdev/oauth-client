import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import tokenManager from '../../../core/TokenManager.js';

type Action = 'view' | 'delete' | 'export' | 'refresh';

interface TokenDetails {
  provider: string;
  accessToken: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

export const TokenManager: React.FC = () => {
  const [tokens, setTokens] = useState<TokenDetails[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenDetails | null>(null);
  const [_action, _setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const providers = await tokenManager.listProviders();
      const tokenDetails: TokenDetails[] = [];

      for (const provider of providers) {
        const token = await tokenManager.getToken(provider);
        if (token) {
          tokenDetails.push({
            provider,
            accessToken: token.access_token,
            expiresAt: token.expiresAt,
            scope: token.scope,
            tokenType: token.token_type,
          });
        }
      }

      setTokens(tokenDetails);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (item: { value: string }) => {
    const token = tokens.find((t) => t.provider === item.value);
    setSelectedToken(token || null);
  };

  const handleActionSelect = (_item: { value: string }) => {
    // Handle action execution here
  };

  const formatExpiry = (expiresAt?: number): string => {
    if (!expiresAt) return 'No expiry';
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Box paddingY={1}>
        <Text color="blue">Loading tokens...</Text>
      </Box>
    );
  }

  if (tokens.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="yellow">
          📦 Token Manager
        </Text>
        <Box marginTop={2}>
          <Text color="gray">No tokens stored. Press Ctrl+A to authenticate.</Text>
        </Box>
      </Box>
    );
  }

  if (!selectedToken) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="yellow">
          📦 Token Manager
        </Text>
        <Box marginTop={2}>
          <Text>Select a token to manage:</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={tokens.map((t) => ({
              label: `${t.provider} (${formatExpiry(t.expiresAt)})`,
              value: t.provider,
            }))}
            onSelect={handleTokenSelect}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="yellow">
        📦 Managing Token: {selectedToken.provider}
      </Text>

      <Box marginTop={2} flexDirection="column" gap={1}>
        <Box flexDirection="row">
          <Text color="gray">Status: </Text>
          <Text color={selectedToken.expiresAt && selectedToken.expiresAt > Date.now() ? 'green' : 'red'}>
            {selectedToken.expiresAt && selectedToken.expiresAt > Date.now() ? 'Active' : 'Expired'}
          </Text>
        </Box>

        <Box flexDirection="row">
          <Text color="gray">Expires: </Text>
          <Text>{formatExpiry(selectedToken.expiresAt)}</Text>
        </Box>

        {selectedToken.scope && (
          <Box flexDirection="row">
            <Text color="gray">Scope: </Text>
            <Text>{selectedToken.scope}</Text>
          </Box>
        )}

        <Box flexDirection="row">
          <Text color="gray">Type: </Text>
          <Text>{selectedToken.tokenType || 'Bearer'}</Text>
        </Box>

        <Box flexDirection="row">
          <Text color="gray">Token: </Text>
          <Text dimColor>{selectedToken.accessToken.substring(0, 20)}...</Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text bold>Actions:</Text>
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: '📋 Copy to Clipboard', value: 'export' },
            { label: '🔄 Refresh Token', value: 'refresh' },
            { label: '🗑️  Delete Token', value: 'delete' },
            { label: '← Back to List', value: 'back' },
          ]}
          onSelect={handleActionSelect}
        />
      </Box>
    </Box>
  );
};