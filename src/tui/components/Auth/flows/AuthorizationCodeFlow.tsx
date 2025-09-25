import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useKeyboard } from '../../../hooks/useKeyboard.js';

interface AuthorizationCodeFlowProps {
  provider: string;
  onSubmit: (config: any) => void;
  onCancel: () => void;
}

type FormField = 'clientId' | 'clientSecret' | 'redirectUri' | 'scope';

export const AuthorizationCodeFlow: React.FC<AuthorizationCodeFlowProps> = ({
  provider,
  onSubmit,
  onCancel
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:8080/callback');
  const [scope, setScope] = useState('');
  const [activeField, setActiveField] = useState<FormField>('clientId');
  const [usePKCE] = useState(true); // Always use PKCE for security

  const fields: { key: FormField; label: string; value: string; setter: (v: string) => void; mask?: boolean }[] = [
    { key: 'clientId', label: 'Client ID', value: clientId, setter: setClientId },
    { key: 'clientSecret', label: 'Client Secret', value: clientSecret, setter: setClientSecret, mask: true },
    { key: 'redirectUri', label: 'Redirect URI', value: redirectUri, setter: setRedirectUri },
    { key: 'scope', label: 'Scopes (space-separated)', value: scope, setter: setScope },
  ];

  const currentFieldIndex = fields.findIndex(f => f.key === activeField);

  const handleSubmit = () => {
    if (!clientId) {
      return;
    }

    onSubmit({
      clientId,
      clientSecret,
      redirectUri,
      scope: scope || undefined,
      usePKCE,
    });
  };

  useKeyboard({
    shortcuts: {
      tab: () => {
        const nextIndex = (currentFieldIndex + 1) % fields.length;
        setActiveField(fields[nextIndex].key);
      },
      'shift+tab': () => {
        const prevIndex = currentFieldIndex > 0 ? currentFieldIndex - 1 : fields.length - 1;
        setActiveField(fields[prevIndex].key);
      },
      enter: handleSubmit,
      escape: onCancel,
    },
    enabled: true,
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔐 Authorization Code Flow Configuration
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Provider: </Text>
        <Text color="yellow">{provider}</Text>
        {usePKCE && (
          <Text color="green"> (with PKCE)</Text>
        )}
      </Box>

      <Box flexDirection="column" gap={1}>
        {fields.map((field) => {
          const isActive = field.key === activeField;
          return (
            <Box key={field.key}>
              <Box width={25}>
                <Text color={isActive ? 'cyan' : undefined}>
                  {field.label}:
                </Text>
              </Box>
              {isActive ? (
                <TextInput
                  value={field.value}
                  onChange={field.setter}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  mask={field.mask ? '*' : undefined}
                />
              ) : (
                <Text dimColor>
                  {field.mask && field.value
                    ? '•'.repeat(field.value.length)
                    : field.value || `<${field.label.toLowerCase()}>`}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2} flexDirection="column" gap={1}>
        <Box borderStyle="single" borderColor="blue" paddingX={1}>
          <Text color="blue">
            ℹ️ This flow will:
          </Text>
        </Box>
        <Box marginLeft={2} flexDirection="column">
          <Text dimColor>1. Generate PKCE challenge</Text>
          <Text dimColor>2. Open browser for authorization</Text>
          <Text dimColor>3. Start local server on {redirectUri}</Text>
          <Text dimColor>4. Exchange code for tokens</Text>
        </Box>
      </Box>

      <Box marginTop={2} gap={2}>
        <Text color="green">[Enter] Start Authentication</Text>
        <Text dimColor>[Tab] Next Field</Text>
        <Text dimColor>[ESC] Cancel</Text>
      </Box>
    </Box>
  );
};