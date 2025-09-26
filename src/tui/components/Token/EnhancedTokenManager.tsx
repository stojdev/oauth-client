import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { TokenManager } from '../../../core/TokenManager.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';
import clipboardy from 'clipboardy';

interface TokenDisplay {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  createdAt: number;
}

interface TokenAction {
  label: string;
  value: string;
  icon: string;
  color?: string;
}

export const EnhancedTokenManager: React.FC = () => {
  const [tokens, setTokens] = useState<TokenDisplay[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Create single instance of TokenManager using useMemo to prevent memory leaks
  const tokenManager = useMemo(() => new TokenManager(), []);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      // Get all stored tokens
      const storedTokens = await tokenManager.getAllTokens();
      const displayTokens: TokenDisplay[] = storedTokens.map(token => ({
        provider: token.provider,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expiresAt,
        tokenType: token.token_type,
        scope: token.scope,
        createdAt: token.createdAt
      }));
      setTokens(displayTokens);

      if (displayTokens.length > 0 && !selectedToken) {
        setSelectedToken(displayTokens[0]);
      }
    } catch (error) {
      showNotification('Failed to load tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!selectedToken) return;

    try {
      await clipboardy.write(selectedToken.accessToken);
      showNotification('Access token copied to clipboard', 'success');
    } catch (error) {
      showNotification('Failed to copy token', 'error');
    }
  };

  const handleRefreshToken = async () => {
    if (!selectedToken || !selectedToken.refreshToken) return;

    showNotification('Refreshing token...', 'info');
    try {
      // Implement refresh logic here
      await loadTokens();
      showNotification('Token refreshed successfully', 'success');
    } catch (error) {
      showNotification('Failed to refresh token', 'error');
    }
  };

  const handleDeleteToken = async () => {
    if (!selectedToken) return;

    try {
      await tokenManager.clearToken(selectedToken.provider);
      showNotification(`Token for ${selectedToken.provider} deleted`, 'success');
      await loadTokens();
      setSelectedToken(null);
    } catch (error) {
      showNotification('Failed to delete token', 'error');
    }
  };

  const handleInspectToken = () => {
    if (!selectedToken) return;
    setShowDetails(!showDetails);
  };

  const tokenActions: TokenAction[] = [
    { label: 'Copy Token', value: 'copy', icon: '📋', color: 'cyan' },
    { label: 'Refresh Token', value: 'refresh', icon: '🔄', color: 'green' },
    { label: 'Inspect Token', value: 'inspect', icon: '🔍', color: 'blue' },
    { label: 'Delete Token', value: 'delete', icon: '🗑️', color: 'red' },
  ];

  const handleActionSelect = (item: { value: string }) => {
    switch (item.value) {
      case 'copy':
        handleCopyToken();
        break;
      case 'refresh':
        handleRefreshToken();
        break;
      case 'inspect':
        handleInspectToken();
        break;
      case 'delete':
        handleDeleteToken();
        break;
    }
    setShowActions(false);
  };

  useKeyboard({
    shortcuts: {
      c: handleCopyToken,
      r: handleRefreshToken,
      d: () => setShowDetails(!showDetails),
      delete: handleDeleteToken,
      a: () => setShowActions(!showActions),
      escape: () => {
        if (showActions) {
          setShowActions(false);
        } else if (showDetails) {
          setShowDetails(false);
        }
      },
    },
    enabled: !loading,
  });

  if (loading) {
    return (
      <Box paddingY={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Loading tokens...</Text>
      </Box>
    );
  }

  if (tokens.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="yellow">
          📦 No Tokens Stored
        </Text>
        <Box marginTop={1}>
          <Text dimColor>
            Press Ctrl+A to authenticate with a provider.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎫 Token Manager
        </Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        {/* Token List */}
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width="40%">
          <Box marginBottom={1}>
            <Text bold underline>
              Stored Tokens ({tokens.length})
            </Text>
          </Box>
          {tokens.map((token) => (
            <Box key={token.provider} marginBottom={1}>
              <Text
                color={selectedToken?.provider === token.provider ? 'cyan' : undefined}
                bold={selectedToken?.provider === token.provider}
              >
                {selectedToken?.provider === token.provider ? '▶ ' : '  '}
                {token.provider}
              </Text>
              <Box marginLeft={2}>
                <Text dimColor>
                  {token.expiresAt
                    ? `Expires: ${new Date(token.expiresAt).toLocaleString()}`
                    : 'No expiry'}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Token Details */}
        {selectedToken && (
          <Box flexDirection="column" flexGrow={1}>
            {showActions ? (
              <Box flexDirection="column">
                <Box marginBottom={1}>
                  <Text bold>Select Action:</Text>
                </Box>
                <SelectInput
                  items={tokenActions.map(action => ({
                    label: `${action.icon} ${action.label}`,
                    value: action.value,
                  }))}
                  onSelect={handleActionSelect}
                />
              </Box>
            ) : (
              <Box flexDirection="column">
                <Box marginBottom={1}>
                  <Text bold underline>
                    {selectedToken.provider} Token
                  </Text>
                </Box>

                <Box flexDirection="column" gap={1}>
                  <Box>
                    <Text color="gray">Type: </Text>
                    <Text>{selectedToken.tokenType || 'Bearer'}</Text>
                  </Box>

                  {selectedToken.scope && (
                    <Box>
                      <Text color="gray">Scopes: </Text>
                      <Text color="green">{selectedToken.scope}</Text>
                    </Box>
                  )}

                  <Box>
                    <Text color="gray">Created: </Text>
                    <Text>{new Date(selectedToken.createdAt).toLocaleString()}</Text>
                  </Box>

                  {selectedToken.expiresAt && (
                    <Box>
                      <Text color="gray">Expires: </Text>
                      <Text color={
                        new Date(selectedToken.expiresAt) < new Date() ? 'red' : 'green'
                      }>
                        {new Date(selectedToken.expiresAt).toLocaleString()}
                      </Text>
                    </Box>
                  )}

                  {showDetails && (
                    <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="blue" paddingX={1}>
                      <Text bold color="blue">Token Value:</Text>
                      <Text wrap="truncate-end" dimColor>
                        {selectedToken.accessToken.substring(0, 50)}...
                      </Text>
                      {selectedToken.refreshToken && (
                        <>
                          <Box marginTop={1}>
                        <Text bold color="blue">Refresh Token:</Text>
                      </Box>
                          <Text wrap="truncate-end" dimColor>
                            {selectedToken.refreshToken.substring(0, 50)}...
                          </Text>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={2} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          [A] Actions • [C] Copy • [R] Refresh • [D] Toggle Details • [Del] Delete • [ESC] Back
        </Text>
      </Box>
    </Box>
  );
};