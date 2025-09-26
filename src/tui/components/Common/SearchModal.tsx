import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  description: string;
  action?: () => void;
  keywords?: string[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
  searchableItems?: SearchResult[];
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  searchableItems = []
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Default searchable items if none provided
  const defaultItems: SearchResult[] = [
    {
      id: 'cmd-auth',
      title: 'Authenticate',
      category: 'Commands',
      description: 'Start OAuth authentication flow',
      keywords: ['auth', 'login', 'oauth', 'authenticate']
    },
    {
      id: 'cmd-tokens',
      title: 'View Tokens',
      category: 'Commands',
      description: 'View and manage stored tokens',
      keywords: ['tokens', 'view', 'list', 'stored']
    },
    {
      id: 'cmd-inspect',
      title: 'Inspect Token',
      category: 'Commands',
      description: 'Decode and inspect JWT tokens',
      keywords: ['inspect', 'jwt', 'decode', 'token']
    },
    {
      id: 'cmd-config',
      title: 'Configuration',
      category: 'Commands',
      description: 'Manage OAuth provider configurations',
      keywords: ['config', 'configuration', 'provider', 'settings']
    },
    {
      id: 'help-shortcuts',
      title: 'Keyboard Shortcuts',
      category: 'Help',
      description: 'View all keyboard shortcuts',
      keywords: ['shortcuts', 'keyboard', 'keys', 'hotkeys']
    },
    {
      id: 'help-oauth-flows',
      title: 'OAuth Flows',
      category: 'Documentation',
      description: 'Learn about different OAuth grant types',
      keywords: ['oauth', 'flows', 'grant', 'types', 'authorization', 'code', 'client', 'credentials']
    },
    {
      id: 'help-pkce',
      title: 'PKCE',
      category: 'Documentation',
      description: 'Proof Key for Code Exchange explained',
      keywords: ['pkce', 'proof', 'key', 'code', 'exchange', 'security']
    },
    {
      id: 'help-jwt',
      title: 'JWT Tokens',
      category: 'Documentation',
      description: 'Understanding JSON Web Tokens',
      keywords: ['jwt', 'json', 'web', 'token', 'claims', 'signature']
    },
    {
      id: 'tutorial-first-auth',
      title: 'First Authentication',
      category: 'Tutorials',
      description: 'Step-by-step guide to your first OAuth authentication',
      keywords: ['tutorial', 'guide', 'first', 'authentication', 'getting', 'started']
    },
    {
      id: 'tutorial-provider-config',
      title: 'Configure Provider',
      category: 'Tutorials',
      description: 'How to configure a new OAuth provider',
      keywords: ['tutorial', 'provider', 'configure', 'setup', 'new']
    }
  ];

  const allItems = searchableItems.length > 0 ? searchableItems : defaultItems;

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate search delay for better UX
    const searchTimeout = setTimeout(() => {
      const searchQuery = query.toLowerCase();
      const searchResults = allItems.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(searchQuery);
        const descriptionMatch = item.description.toLowerCase().includes(searchQuery);
        const categoryMatch = item.category.toLowerCase().includes(searchQuery);
        const keywordMatch = item.keywords?.some(k => k.toLowerCase().includes(searchQuery));

        return titleMatch || descriptionMatch || categoryMatch || keywordMatch;
      });

      // Sort results by relevance
      searchResults.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const aExact = aTitle === searchQuery;
        const bExact = bTitle === searchQuery;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aTitle.startsWith(searchQuery);
        const bStarts = bTitle.startsWith(searchQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.title.localeCompare(b.title);
      });

      setResults(searchResults);
      setSelectedIndex(0);
      setIsSearching(false);

      if (onSearch) {
        onSearch(query);
      }
    }, 150);

    return () => clearTimeout(searchTimeout);
  }, [query, allItems, onSearch]);

  const handleSelect = (item: { value: string }) => {
    const result = results.find(r => r.id === item.value);
    if (result?.action) {
      result.action();
      onClose();
    }
  };

  useKeyboard({
    shortcuts: {
      escape: onClose,
      up: () => setSelectedIndex(Math.max(0, selectedIndex - 1)),
      down: () => setSelectedIndex(Math.min(results.length - 1, selectedIndex + 1)),
      enter: () => {
        if (results[selectedIndex]) {
          handleSelect({ value: results[selectedIndex].id });
        }
      }
    },
    enabled: isOpen
  });

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  if (!isOpen) return null;

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        width={60}
        minHeight={20}
      >
        <Box marginBottom={1}>
          <Text bold color="cyan">🔍 Search</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="blue">🔍 </Text>
          <TextInput
            value={query}
            onChange={setQuery}
            placeholder="Type to search commands, help, or documentation..."
          />
        </Box>

        {isSearching && (
          <Box paddingY={1}>
            <Text dimColor>Searching...</Text>
          </Box>
        )}

        {!isSearching && query.length > 0 && results.length === 0 && (
          <Box paddingY={1}>
            <Text color="yellow">No results found for "{query}"</Text>
          </Box>
        )}

        {!isSearching && results.length > 0 && (
          <Box flexDirection="column" flexGrow={1}>
            <Box marginBottom={1}>
              <Text dimColor>
                Found {results.length} result{results.length === 1 ? '' : 's'}
              </Text>
            </Box>

            {Object.entries(groupedResults).map(([category, items]) => (
              <Box key={category} flexDirection="column" marginBottom={1}>
                <Box marginBottom={1}>
                  <Text bold color="cyan">{category}</Text>
                </Box>
                <SelectInput
                  items={items.map(item => ({
                    label: `  ${item.title}`,
                    value: item.id
                  }))}
                  onSelect={handleSelect}
                />
                {items.map((item) => {
                  const isSelected = results.indexOf(item) === selectedIndex;
                  return (
                    <Box key={item.id} paddingLeft={2}>
                      <Text color={isSelected ? 'green' : undefined}>
                        {isSelected ? '▶ ' : '  '}
                        {item.title}
                      </Text>
                      <Text dimColor> - {item.description}</Text>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}

        {query.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text bold color="yellow">Quick Search Tips:</Text>
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>• Type "auth" to find authentication commands</Text>
              <Text dimColor>• Type "jwt" to learn about JWT tokens</Text>
              <Text dimColor>• Type "tutorial" to find step-by-step guides</Text>
              <Text dimColor>• Type "shortcuts" to view keyboard shortcuts</Text>
            </Box>
          </Box>
        )}

        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            [↑↓] Navigate • [Enter] Select • [ESC] Close
          </Text>
        </Box>
      </Box>
    </Box>
  );
};