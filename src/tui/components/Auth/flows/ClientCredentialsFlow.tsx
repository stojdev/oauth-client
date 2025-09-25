import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useKeyboard } from '../../../hooks/useKeyboard.js';

interface ClientCredentialsFlowProps {
  provider: string;
  onSubmit: (config: any) => void;
  onCancel: () => void;
}

type FormField = 'clientId' | 'clientSecret' | 'scope';

export const ClientCredentialsFlow: React.FC<ClientCredentialsFlowProps> = ({
  provider,
  onSubmit,
  onCancel
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [scope, setScope] = useState('');
  const [activeField, setActiveField] = useState<FormField>('clientId');

  const fields: { key: FormField; label: string; value: string; setter: (v: string) => void; mask?: boolean; required?: boolean }[] = [
    { key: 'clientId', label: 'Client ID', value: clientId, setter: setClientId, required: true },
    { key: 'clientSecret', label: 'Client Secret', value: clientSecret, setter: setClientSecret, mask: true, required: true },
    { key: 'scope', label: 'Scopes (optional)', value: scope, setter: setScope },
  ];

  const currentFieldIndex = fields.findIndex(f => f.key === activeField);

  const handleSubmit = () => {
    if (!clientId || !clientSecret) {
      return;
    }

    onSubmit({
      clientId,
      clientSecret,
      scope: scope || undefined,
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
          🤖 Client Credentials Flow Configuration
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Provider: </Text>
        <Text color="yellow">{provider}</Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {fields.map((field) => {
          const isActive = field.key === activeField;
          return (
            <Box key={field.key}>
              <Box width={25}>
                <Text color={isActive ? 'cyan' : undefined}>
                  {field.label}:
                  {field.required && <Text color="red"> *</Text>}
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
            ℹ️ Client Credentials Flow:
          </Text>
        </Box>
        <Box marginLeft={2} flexDirection="column">
          <Text dimColor>• Server-to-server authentication</Text>
          <Text dimColor>• No user interaction required</Text>
          <Text dimColor>• Returns access token directly</Text>
          <Text dimColor>• Best for backend services</Text>
        </Box>
      </Box>

      <Box marginTop={2} gap={2}>
        <Text color={clientId && clientSecret ? 'green' : 'gray'}>
          [Enter] Authenticate
        </Text>
        <Text dimColor>[Tab] Next Field</Text>
        <Text dimColor>[ESC] Cancel</Text>
      </Box>
    </Box>
  );
};