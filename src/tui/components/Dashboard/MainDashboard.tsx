import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import tokenManager from '../../../core/TokenManager.js';
import { ProviderConfigManager } from '../../../providers/ProviderConfig.js';

interface TokenInfo {
  provider: string;
  status: 'active' | 'expired' | 'missing';
  expiresIn?: string;
}

export const MainDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const providerManager = new ProviderConfigManager();
        const providerIds = providerManager.listProviderIds();
        setProviders(providerIds);

        const storedProviders = await tokenManager.listProviders();
        const tokenInfos: TokenInfo[] = [];

        for (const provider of storedProviders) {
          const token = await tokenManager.getToken(provider);
          if (token) {
            const now = Date.now();
            const expiresAt = token.expiresAt || 0;
            const expiresIn = expiresAt - now;

            if (expiresIn > 0) {
              const hours = Math.floor(expiresIn / (1000 * 60 * 60));
              const minutes = Math.floor((expiresIn % (1000 * 60 * 60)) / (1000 * 60));
              tokenInfos.push({
                provider,
                status: 'active',
                expiresIn: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
              });
            } else {
              tokenInfos.push({
                provider,
                status: 'expired',
              });
            }
          }
        }

        setTokens(tokenInfos);
      } catch (error) {
        // Handle error silently for now
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Box paddingY={2} alignItems="center" justifyContent="center">
        <Text color="blue">
          <Spinner type="dots" /> Loading dashboard...
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        📊 OAuth Dashboard
      </Text>

      <Box marginTop={2} flexDirection="row" gap={2}>
        {/* Providers Panel */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          padding={1}
          minWidth={30}
        >
          <Text bold color="cyan">
            🔌 Available Providers
          </Text>
          <Box marginTop={1} flexDirection="column">
            {providers.slice(0, 5).map((provider) => (
              <Text key={provider} dimColor>
                • {provider}
              </Text>
            ))}
            {providers.length > 5 && (
              <Text dimColor italic>
                ...and {providers.length - 5} more
              </Text>
            )}
            {providers.length === 0 && <Text dimColor>No providers available</Text>}
          </Box>
        </Box>

        {/* Tokens Panel */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="green"
          padding={1}
          minWidth={30}
        >
          <Text bold color="green">
            🔐 Stored Tokens
          </Text>
          <Box marginTop={1} flexDirection="column">
            {tokens.length === 0 ? (
              <Text dimColor>No tokens stored</Text>
            ) : (
              tokens.map((token) => (
                <Box key={token.provider}>
                  <Text color={token.status === 'active' ? 'green' : 'red'}>
                    {token.status === 'active' ? '✅' : '❌'} {token.provider}
                  </Text>
                  {token.expiresIn && (
                    <Text dimColor> ({token.expiresIn})</Text>
                  )}
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box marginTop={2} flexDirection="column">
        <Text bold color="yellow">
          ⚡ Quick Actions
        </Text>
        <Box marginTop={1} gap={2}>
          <Text dimColor>[Ctrl+A] New Auth</Text>
          <Text dimColor>[Ctrl+T] Manage Tokens</Text>
          <Text dimColor>[Ctrl+C] Configure Provider</Text>
        </Box>
      </Box>

      {/* Status */}
      <Box marginTop={2}>
        <Text dimColor>
          {tokens.filter((t) => t.status === 'active').length} active token(s) • {providers.length}{' '}
          provider(s) available
        </Text>
      </Box>
    </Box>
  );
};