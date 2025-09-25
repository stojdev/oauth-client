import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useKeyboard } from '../../../hooks/useKeyboard.js';
import clipboardy from 'clipboardy';

interface DeviceCodeFlowProps {
  provider: string;
  onSubmit: (config: any) => void;
  onCancel: () => void;
}

type FormField = 'clientId' | 'scope';
type FlowStep = 'configure' | 'device-code' | 'polling';

export const DeviceCodeFlow: React.FC<DeviceCodeFlowProps> = ({
  provider,
  onSubmit,
  onCancel
}) => {
  const [clientId, setClientId] = useState('');
  const [scope, setScope] = useState('');
  const [activeField, setActiveField] = useState<FormField>('clientId');
  const [flowStep, setFlowStep] = useState<FlowStep>('configure');

  // Device code response simulation
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [interval, setInterval] = useState(5);

  const fields: { key: FormField; label: string; value: string; setter: (v: string) => void }[] = [
    { key: 'clientId', label: 'Client ID', value: clientId, setter: setClientId },
    { key: 'scope', label: 'Scopes (optional)', value: scope, setter: setScope },
  ];

  const currentFieldIndex = fields.findIndex(f => f.key === activeField);

  const handleStartFlow = () => {
    if (!clientId) {
      return;
    }

    // Simulate device code request
    setFlowStep('device-code');

    // In real implementation, this would make an API call
    setTimeout(() => {
      setUserCode('ABCD-1234');
      setVerificationUri('https://example.com/device');
      setDeviceCode('device_code_123456');
      setExpiresIn(900); // 15 minutes
      setInterval(5); // Poll every 5 seconds
    }, 1000);
  };

  const handleCopyCode = async () => {
    try {
      await clipboardy.write(userCode);
    } catch (error) {
      // Clipboard access might fail in some environments
    }
  };

  const handleStartPolling = () => {
    setFlowStep('polling');

    // Start polling simulation
    onSubmit({
      clientId,
      scope: scope || undefined,
      deviceCode,
      interval,
    });
  };

  useKeyboard({
    shortcuts: {
      tab: () => {
        if (flowStep === 'configure') {
          const nextIndex = (currentFieldIndex + 1) % fields.length;
          setActiveField(fields[nextIndex].key);
        }
      },
      enter: () => {
        if (flowStep === 'configure') {
          handleStartFlow();
        } else if (flowStep === 'device-code') {
          handleStartPolling();
        }
      },
      c: () => {
        if (flowStep === 'device-code') {
          handleCopyCode();
        }
      },
      escape: onCancel,
    },
    enabled: true,
  });

  // Configuration Step
  if (flowStep === 'configure') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            📱 Device Authorization Flow Configuration
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
                  </Text>
                </Box>
                {isActive ? (
                  <TextInput
                    value={field.value}
                    onChange={field.setter}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                  />
                ) : (
                  <Text dimColor>
                    {field.value || `<${field.label.toLowerCase()}>`}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>

        <Box marginTop={2} flexDirection="column" gap={1}>
          <Box borderStyle="single" borderColor="blue" paddingX={1}>
            <Text color="blue">
              ℹ️ Device Flow is perfect for:
            </Text>
          </Box>
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>• Smart TVs and streaming devices</Text>
            <Text dimColor>• CLI applications</Text>
            <Text dimColor>• IoT devices</Text>
            <Text dimColor>• Any device with limited input</Text>
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color={clientId ? 'green' : 'gray'}>[Enter] Start Flow</Text>
          <Text dimColor>[Tab] Next Field</Text>
          <Text dimColor>[ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Device Code Display Step
  if (flowStep === 'device-code') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            📱 Device Authorization
          </Text>
        </Box>

        {userCode ? (
          <Box flexDirection="column" gap={2}>
            <Box borderStyle="double" borderColor="green" paddingX={2} paddingY={1}>
              <Box flexDirection="column" gap={1}>
                <Text>Visit this URL on any device:</Text>
                <Text color="cyan" bold>{verificationUri}</Text>

                <Box marginTop={1}>
                  <Text>Enter this code:</Text>
                </Box>
                <Text color="yellow" bold>
                  {userCode}
                </Text>
              </Box>
            </Box>

            <Box flexDirection="column">
              <Text dimColor>
                ⏱ Code expires in: {Math.floor(expiresIn / 60)} minutes
              </Text>
            </Box>

            <Box gap={2}>
              <Text color="green">[Enter] Start Polling</Text>
              <Text color="cyan">[C] Copy Code</Text>
              <Text dimColor>[ESC] Cancel</Text>
            </Box>
          </Box>
        ) : (
          <Box>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> Requesting device code...</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Polling Step
  if (flowStep === 'polling') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Waiting for authorization...</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            Polling every {interval} seconds
          </Text>
        </Box>
        <Box marginTop={2}>
          <Text dimColor>
            Please complete the authorization on your other device.
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
};