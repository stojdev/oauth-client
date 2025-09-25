import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';
import clipboardy from 'clipboardy';
import jwt from 'jsonwebtoken';

interface JWTInspectorProps {
  initialToken?: string;
  onBack?: () => void;
}

type InspectorView = 'input' | 'decoded' | 'error';

interface DecodedToken {
  header: any;
  payload: any;
  signature: string;
}

export const JWTInspector: React.FC<JWTInspectorProps> = ({
  initialToken = '',
  onBack
}) => {
  const [view, setView] = useState<InspectorView>(initialToken ? 'decoded' : 'input');
  const [token, setToken] = useState(initialToken);
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [selectedSection, setSelectedSection] = useState<'header' | 'payload' | 'signature'>('payload');

  const { showNotification } = useNotification();

  const decodeToken = (tokenString: string) => {
    try {
      // Remove any whitespace
      const cleanToken = tokenString.trim();

      // Basic JWT format validation
      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
      }

      // Decode without verification (for inspection purposes)
      const decoded = jwt.decode(cleanToken, { complete: true });

      if (decoded && typeof decoded === 'object' && 'header' in decoded && 'payload' in decoded) {
        setDecodedToken({
          header: decoded.header,
          payload: decoded.payload,
          signature: parts[2]
        });
        setView('decoded');
        setError(null);
      } else {
        throw new Error('Failed to decode token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JWT token');
      setView('error');
    }
  };

  const handleInspect = () => {
    if (token) {
      decodeToken(token);
    }
  };

  const handleCopySection = async () => {
    if (!decodedToken) return;

    try {
      let content = '';
      switch (selectedSection) {
        case 'header':
          content = JSON.stringify(decodedToken.header, null, 2);
          break;
        case 'payload':
          content = JSON.stringify(decodedToken.payload, null, 2);
          break;
        case 'signature':
          content = decodedToken.signature;
          break;
      }
      await clipboardy.write(content);
      showNotification(`${selectedSection} copied to clipboard`, 'success');
    } catch {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const handlePasteToken = async () => {
    try {
      const clipboard = await clipboardy.read();
      setToken(clipboard);
      showNotification('Token pasted from clipboard', 'success');
    } catch {
      showNotification('Failed to paste from clipboard', 'error');
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const renderTokenClaims = (claims: any) => {
    const standardClaims = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'];
    const sortedKeys = Object.keys(claims).sort((a, b) => {
      const aIsStandard = standardClaims.includes(a);
      const bIsStandard = standardClaims.includes(b);
      if (aIsStandard && !bIsStandard) return -1;
      if (!aIsStandard && bIsStandard) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => {
      const value = claims[key];
      let displayValue = value;
      let color: string | undefined;

      // Format timestamps
      if ((key === 'exp' || key === 'iat' || key === 'nbf') && typeof value === 'number') {
        displayValue = `${value} (${formatTimestamp(value)})`;

        // Check if expired
        if (key === 'exp') {
          const isExpired = value * 1000 < Date.now();
          color = isExpired ? 'red' : 'green';
        }
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value, null, 2);
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'true' : 'false';
        color = value ? 'green' : 'red';
      }

      return (
        <Box key={key} marginBottom={1}>
          <Box width={20}>
            <Text color={standardClaims.includes(key) ? 'cyan' : 'gray'}>
              {key}:
            </Text>
          </Box>
          <Text color={color} wrap="wrap">
            {String(displayValue)}
          </Text>
        </Box>
      );
    });
  };

  useKeyboard({
    shortcuts: {
      enter: () => {
        if (view === 'input') {
          handleInspect();
        }
      },
      escape: () => {
        if (view === 'decoded' || view === 'error') {
          setView('input');
        } else if (onBack) {
          onBack();
        }
      },
      tab: () => {
        if (view === 'decoded') {
          const sections: ('header' | 'payload' | 'signature')[] = ['header', 'payload', 'signature'];
          const currentIndex = sections.indexOf(selectedSection);
          const nextIndex = (currentIndex + 1) % sections.length;
          setSelectedSection(sections[nextIndex]);
        }
      },
      c: handleCopySection,
      p: handlePasteToken,
      r: () => setShowRaw(!showRaw),
      n: () => {
        setToken('');
        setView('input');
        setDecodedToken(null);
      },
    },
    enabled: true,
  });

  // Input View
  if (view === 'input') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔍 JWT Token Inspector
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text>Paste or enter a JWT token to inspect:</Text>
          <Box flexDirection="column">
            <TextInput
              value={token}
              onChange={setToken}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </Box>
        </Box>

        <Box marginTop={2} flexDirection="column" gap={1}>
          <Text dimColor>💡 Tips:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>• JWT tokens have 3 parts separated by dots</Text>
            <Text dimColor>• This inspector decodes without verification</Text>
            <Text dimColor>• Sensitive data in tokens will be visible</Text>
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color={token ? 'green' : 'gray'}>[Enter] Inspect</Text>
          <Text color="cyan">[P] Paste from Clipboard</Text>
          {onBack && <Text dimColor>[ESC] Back</Text>}
        </Box>
      </Box>
    );
  }

  // Error View
  if (view === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            ❌ Invalid JWT Token
          </Text>
        </Box>

        <Box marginBottom={2}>
          <Text color="red">{error}</Text>
        </Box>

        <Box gap={2}>
          <Text color="yellow">[ESC] Try Again</Text>
          {onBack && <Text dimColor>[Q] Quit</Text>}
        </Box>
      </Box>
    );
  }

  // Decoded View
  if (view === 'decoded' && decodedToken) {
    const isExpired = decodedToken.payload.exp && decodedToken.payload.exp * 1000 < Date.now();

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1} flexDirection="row" justifyContent="space-between">
          <Text bold color="cyan">
            🔍 JWT Token Inspector
          </Text>
          {isExpired && (
            <Text color="red" bold>
              ⚠️ TOKEN EXPIRED
            </Text>
          )}
        </Box>

        <Box flexDirection="row" gap={2} marginBottom={1}>
          <Text
            color={selectedSection === 'header' ? 'cyan' : 'gray'}
            underline={selectedSection === 'header'}
          >
            Header
          </Text>
          <Text
            color={selectedSection === 'payload' ? 'cyan' : 'gray'}
            underline={selectedSection === 'payload'}
          >
            Payload
          </Text>
          <Text
            color={selectedSection === 'signature' ? 'cyan' : 'gray'}
            underline={selectedSection === 'signature'}
          >
            Signature
          </Text>
        </Box>

        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={selectedSection === 'header' ? 'cyan' : 'gray'}
          paddingX={1}
          paddingY={1}
          marginBottom={1}
        >
          {selectedSection === 'header' && (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text bold color="yellow">
                  Header (Algorithm & Type)
                </Text>
              </Box>
              {showRaw ? (
                <Text dimColor>{JSON.stringify(decodedToken.header, null, 2)}</Text>
              ) : (
                renderTokenClaims(decodedToken.header)
              )}
            </Box>
          )}

          {selectedSection === 'payload' && (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text bold color="yellow">
                  Payload (Claims)
                </Text>
              </Box>
              {showRaw ? (
                <Text dimColor wrap="wrap">
                  {JSON.stringify(decodedToken.payload, null, 2)}
                </Text>
              ) : (
                renderTokenClaims(decodedToken.payload)
              )}
            </Box>
          )}

          {selectedSection === 'signature' && (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text bold color="yellow">
                  Signature
                </Text>
              </Box>
              <Text dimColor wrap="wrap">
                {decodedToken.signature}
              </Text>
              <Box marginTop={1}>
                <Text color="yellow">
                  ⚠️ Signature verification requires the secret key
                </Text>
              </Box>
            </Box>
          )}
        </Box>

        <Box gap={2}>
          <Text dimColor>[Tab] Switch Section</Text>
          <Text color="cyan">[C] Copy</Text>
          <Text dimColor>[R] Toggle Raw</Text>
          <Text dimColor>[N] New Token</Text>
          <Text dimColor>[ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  return null;
};