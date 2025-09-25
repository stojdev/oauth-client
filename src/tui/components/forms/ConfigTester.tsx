import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';
import type { ProviderConfig } from '../../../types/index.js';
import axios, { AxiosError } from 'axios';

interface ConfigTesterProps {
  provider: ProviderConfig;
  onBack: () => void;
}

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  responseTime?: number;
}

export const ConfigTester: React.FC<ConfigTesterProps> = ({ provider, onBack }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const { showNotification } = useNotification();

  useEffect(() => {
    runTests();
  }, []);

  const testEndpoint = async (url: string, endpointName: string): Promise<TestResult> => {
    const startTime = Date.now();
    setCurrentTest(endpointName);

    try {
      if (!url) {
        return {
          endpoint: endpointName,
          status: 'warning',
          message: 'Not configured',
          details: 'This endpoint is not configured for this provider'
        };
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return {
          endpoint: endpointName,
          status: 'error',
          message: 'Invalid URL format',
          details: `The URL "${url}" is not properly formatted`
        };
      }

      // Test endpoint reachability
      const response = await axios.head(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 404) {
        return {
          endpoint: endpointName,
          status: 'error',
          message: `Endpoint not found (404)`,
          details: 'The endpoint returned a 404 error. Please verify the URL.',
          responseTime
        };
      }

      if (response.status >= 400) {
        return {
          endpoint: endpointName,
          status: 'warning',
          message: `HTTP ${response.status}`,
          details: 'The endpoint is reachable but returned a client error. This might be expected if authentication is required.',
          responseTime
        };
      }

      return {
        endpoint: endpointName,
        status: 'success',
        message: `Reachable (${response.status})`,
        details: `Endpoint responded successfully in ${responseTime}ms`,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNREFUSED') {
        return {
          endpoint: endpointName,
          status: 'error',
          message: 'Connection refused',
          details: 'The server refused the connection. Please verify the URL and ensure the server is running.',
          responseTime
        };
      }

      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        return {
          endpoint: endpointName,
          status: 'error',
          message: 'Connection timeout',
          details: 'The request timed out. The server may be slow or unreachable.',
          responseTime
        };
      }

      if (axiosError.code === 'ENOTFOUND') {
        return {
          endpoint: endpointName,
          status: 'error',
          message: 'Host not found',
          details: 'The hostname could not be resolved. Please verify the URL.',
          responseTime
        };
      }

      return {
        endpoint: endpointName,
        status: 'error',
        message: 'Connection failed',
        details: axiosError.message || 'An unknown error occurred',
        responseTime
      };
    } finally {
      setCurrentTest('');
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const endpoints = [
      { url: provider.authorizationUrl, name: 'Authorization Endpoint' },
      { url: provider.tokenUrl, name: 'Token Endpoint' },
      { url: provider.userInfoUrl, name: 'User Info Endpoint' },
      { url: provider.revocationUrl, name: 'Revocation Endpoint' },
      { url: provider.introspectionUrl, name: 'Introspection Endpoint' },
      { url: provider.discoveryUrl, name: 'Discovery Endpoint' }
    ];

    const results: TestResult[] = [];

    // Test discovery endpoint first if available
    if (provider.discoveryUrl) {
      const discoveryResult = await testEndpoint(provider.discoveryUrl, 'Discovery Endpoint');
      results.push(discoveryResult);

      // If discovery succeeds, try to fetch and validate configuration
      if (discoveryResult.status === 'success') {
        try {
          const response = await axios.get(provider.discoveryUrl);
          const config = response.data;

          // Validate discovered configuration
          if (config.authorization_endpoint && config.authorization_endpoint !== provider.authorizationUrl) {
            results.push({
              endpoint: 'Configuration Validation',
              status: 'warning',
              message: 'Authorization endpoint mismatch',
              details: `Discovery reports: ${config.authorization_endpoint}`
            });
          }

          if (config.token_endpoint && config.token_endpoint !== provider.tokenUrl) {
            results.push({
              endpoint: 'Configuration Validation',
              status: 'warning',
              message: 'Token endpoint mismatch',
              details: `Discovery reports: ${config.token_endpoint}`
            });
          }
        } catch (error) {
          // Discovery endpoint might not return JSON
        }
      }
    }

    // Test other endpoints
    for (const endpoint of endpoints) {
      if (endpoint.name !== 'Discovery Endpoint') { // Skip discovery, already tested
        const result = await testEndpoint(endpoint.url || '', endpoint.name);
        results.push(result);
      }
    }

    // Test client credentials if provided
    if (provider.clientId) {
      results.push({
        endpoint: 'Client Credentials',
        status: 'success',
        message: 'Configured',
        details: `Client ID: ${provider.clientId.substring(0, 8)}...`
      });
    } else {
      results.push({
        endpoint: 'Client Credentials',
        status: 'warning',
        message: 'Not configured',
        details: 'No client credentials configured for this provider'
      });
    }

    setTestResults(results);
    setIsRunning(false);

    // Show summary notification
    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const successes = results.filter(r => r.status === 'success').length;

    if (errors > 0) {
      showNotification(`Tests completed: ${errors} error(s), ${warnings} warning(s)`, 'error');
    } else if (warnings > 0) {
      showNotification(`Tests completed: ${successes} passed, ${warnings} warning(s)`, 'warning');
    } else {
      showNotification('All tests passed successfully!', 'success');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
    }
  };

  useKeyboard({
    shortcuts: {
      escape: onBack,
      r: runTests,
      d: () => setShowDetails(!showDetails)
    },
    enabled: !isRunning
  });

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🧪 Testing Configuration: {provider.displayName || provider.name}
        </Text>
      </Box>

      {isRunning && (
        <Box marginBottom={2}>
          <Text color="blue">
            <Spinner type="dots" />
          </Text>
          <Text> Testing {currentTest || 'endpoints'}...</Text>
        </Box>
      )}

      {testResults.length > 0 && (
        <Box flexDirection="column" gap={1}>
          <Box marginBottom={1}>
            <Text bold underline>Test Results:</Text>
          </Box>

          {testResults.map((result, index) => (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color={getStatusColor(result.status)}>
                  {getStatusIcon(result.status)} {result.endpoint}
                </Text>
                <Text> - </Text>
                <Text color={getStatusColor(result.status)}>
                  {result.message}
                </Text>
                {result.responseTime && (
                  <Text dimColor> ({result.responseTime}ms)</Text>
                )}
              </Box>
              {showDetails && result.details && (
                <Box marginLeft={4}>
                  <Text dimColor>{result.details}</Text>
                </Box>
              )}
            </Box>
          ))}

          <Box marginTop={2} borderStyle="single" borderColor="gray" paddingX={1}>
            <Text>
              Summary: {testResults.filter(r => r.status === 'success').length} passed,
              {' '}{testResults.filter(r => r.status === 'warning').length} warnings,
              {' '}{testResults.filter(r => r.status === 'error').length} errors
            </Text>
          </Box>
        </Box>
      )}

      {!isRunning && testResults.length > 0 && (
        <Box marginTop={2} flexDirection="column" gap={1}>
          <Text bold color="yellow">Actions:</Text>
          <SelectInput
            items={[
              { label: '🔄 Re-run Tests', value: 'rerun' },
              { label: showDetails ? '📊 Hide Details' : '📊 Show Details', value: 'details' },
              { label: '⬅️ Back to Editor', value: 'back' }
            ]}
            onSelect={(item) => {
              switch (item.value) {
                case 'rerun':
                  runTests();
                  break;
                case 'details':
                  setShowDetails(!showDetails);
                  break;
                case 'back':
                  onBack();
                  break;
              }
            }}
          />
        </Box>
      )}

      <Box marginTop={2}>
        <Text dimColor>[R] Re-run • [D] Toggle Details • [ESC] Back</Text>
      </Box>
    </Box>
  );
};