import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { TokenManager } from '../../../core/TokenManager.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';

interface RefreshableToken {
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  tokenEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
}

type RefreshStep = 'select' | 'refreshing' | 'success' | 'error';

export const TokenRefresher: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<RefreshStep>('select');
  const [refreshableTokens, setRefreshableTokens] = useState<RefreshableToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<RefreshableToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTokenInfo, setNewTokenInfo] = useState<any>(null);

  const tokenManager = new TokenManager();
  const { showNotification } = useNotification();

  useEffect(() => {
    loadRefreshableTokens();
  }, []);

  const loadRefreshableTokens = async () => {
    setLoading(true);
    try {
      const tokens = await tokenManager.getAllTokens();
      const refreshable: RefreshableToken[] = [];

      for (const token of tokens) {
        if (token.refresh_token) {
          refreshable.push({
            provider: token.provider,
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: token.expiresAt,
            tokenEndpoint: undefined,
            clientId: undefined,
            clientSecret: undefined,
          });
        }
      }

      setRefreshableTokens(refreshable);
    } catch (error) {
      showNotification('Failed to load tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (item: { value: string }) => {
    const token = refreshableTokens.find(t => t.provider === item.value);
    if (token) {
      setSelectedToken(token);
      performRefresh(token);
    }
  };

  const performRefresh = async (token: RefreshableToken) => {
    setStep('refreshing');

    try {
      // Import the RefreshTokenGrant
      const { RefreshTokenGrant } = await import('../../../grants/RefreshToken.js');

      // For now, we need the token endpoint from somewhere
      // In a real implementation, this would be loaded from config
      if (!token.tokenEndpoint) {
        throw new Error('Token endpoint not configured for this provider');
      }

      // Create refresh token grant instance
      const refreshGrant = new RefreshTokenGrant({
        clientId: token.clientId || 'not_configured',
        clientSecret: token.clientSecret,
        tokenUrl: token.tokenEndpoint,
        authorizationUrl: '', // Not needed for refresh
        refreshToken: token.refreshToken,
      });

      // Execute the refresh
      const tokenResponse = await refreshGrant.getAccessToken();

      // Store the new token response
      const newToken = {
        access_token: tokenResponse.access_token,
        token_type: tokenResponse.token_type || 'Bearer',
        expires_in: tokenResponse.expires_in,
        refresh_token: tokenResponse.refresh_token || token.refreshToken, // Keep old refresh token if new one not provided
        scope: tokenResponse.scope,
      };

      setNewTokenInfo(newToken);

      // Save the new token
      await tokenManager.storeToken(token.provider, newToken);

      showNotification(`Token for ${token.provider} refreshed successfully`, 'success');
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
      showNotification('Token refresh failed', 'error');
      setStep('error');
    }
  };

  const getExpirationStatus = (expiresAt?: number) => {
    if (!expiresAt) return { text: 'No expiry', color: 'gray' };

    const now = Date.now();
    const expiry = expiresAt;
    const timeLeft = expiry - now;

    if (timeLeft < 0) {
      return { text: 'Expired', color: 'red' };
    } else if (timeLeft < 60 * 60 * 1000) { // Less than 1 hour
      return { text: `Expires in ${Math.floor(timeLeft / 60000)} min`, color: 'yellow' };
    } else if (timeLeft < 24 * 60 * 60 * 1000) { // Less than 1 day
      return { text: `Expires in ${Math.floor(timeLeft / 3600000)} hours`, color: 'green' };
    } else {
      return { text: `Expires in ${Math.floor(timeLeft / 86400000)} days`, color: 'green' };
    }
  };

  useKeyboard({
    shortcuts: {
      escape: () => {
        if (step === 'success' || step === 'error') {
          setStep('select');
        } else if (onBack) {
          onBack();
        }
      },
      r: () => {
        if (step === 'error' && selectedToken) {
          performRefresh(selectedToken);
        }
      },
    },
    enabled: true,
  });

  if (loading) {
    return (
      <Box paddingY={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Loading refreshable tokens...</Text>
      </Box>
    );
  }

  // Select Token Step
  if (step === 'select') {
    if (refreshableTokens.length === 0) {
      return (
        <Box flexDirection="column" paddingY={1}>
          <Box marginBottom={1}>
            <Text bold color="yellow">
              ⚠️ No Refreshable Tokens
            </Text>
          </Box>
          <Text dimColor>
            No tokens with refresh tokens are available.
          </Text>
          <Box marginTop={1}>
            <Text dimColor>
              Refresh tokens are obtained during initial authentication.
            </Text>
          </Box>
          {onBack && (
            <Box marginTop={2}>
              <Text dimColor>[ESC] Back</Text>
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔄 Token Refresh
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Select a token to refresh:</Text>
        </Box>

        <SelectInput
          items={refreshableTokens.map(token => {
            const expStatus = getExpirationStatus(token.expiresAt);
            return {
              label: `${token.provider} - ${expStatus.text}`,
              value: token.provider
            };
          })}
          onSelect={handleTokenSelect}
        />

        <Box marginTop={2} flexDirection="column" gap={1}>
          <Text dimColor>ℹ️ Token refresh will:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>• Exchange refresh token for new access token</Text>
            <Text dimColor>• Update stored credentials</Text>
            <Text dimColor>• Preserve refresh token for future use</Text>
          </Box>
        </Box>

        {onBack && (
          <Box marginTop={2}>
            <Text dimColor>[ESC] Back</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Refreshing Step
  if (step === 'refreshing') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Refreshing token for {selectedToken?.provider}...</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Exchanging refresh token for new access token...</Text>
        </Box>
      </Box>
    );
  }

  // Success Step
  if (step === 'success' && newTokenInfo) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="green">
            ✅ Token Refreshed Successfully
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="gray">Provider: </Text>
            <Text>{selectedToken?.provider}</Text>
          </Box>

          <Box>
            <Text color="gray">Token Type: </Text>
            <Text>{newTokenInfo.token_type}</Text>
          </Box>

          <Box>
            <Text color="gray">Expires In: </Text>
            <Text color="green">{newTokenInfo.expires_in} seconds</Text>
          </Box>

          {newTokenInfo.scope && (
            <Box>
              <Text color="gray">Scope: </Text>
              <Text>{newTokenInfo.scope}</Text>
            </Box>
          )}

          <Box>
            <Text color="gray">New Access Token: </Text>
            <Text dimColor wrap="truncate-end">
              {newTokenInfo.access_token.substring(0, 50)}...
            </Text>
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="green">[ESC] Back to List</Text>
        </Box>
      </Box>
    );
  }

  // Error Step
  if (step === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            ❌ Token Refresh Failed
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text dimColor>Possible reasons:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>• Refresh token has expired</Text>
            <Text dimColor>• Invalid client credentials</Text>
            <Text dimColor>• Provider requires re-authentication</Text>
            <Text dimColor>• Network or server error</Text>
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="yellow">[R] Retry</Text>
          <Text dimColor>[ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  return null;
};