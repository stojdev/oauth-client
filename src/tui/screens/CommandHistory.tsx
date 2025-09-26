import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useCommandHistory } from '../hooks/useCommandHistory.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { useNotification } from '../hooks/useNotification.js';

interface CommandHistoryProps {
  onBack: () => void;
}

export const CommandHistory: React.FC<CommandHistoryProps> = ({ onBack }) => {
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [selectedCommand] = useState<string | null>(null);

  const { history, clearHistory, replay, getStats } = useCommandHistory();
  const { showNotification } = useNotification();

  const stats = getStats();

  // Filter history based on search and category
  const filteredHistory = history.filter(cmd => {
    const matchesFilter = filter === '' ||
      cmd.command.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.category.toLowerCase().includes(filter.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;

    return matchesFilter && matchesCategory;
  }).reverse(); // Show most recent first

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(history.map(h => h.category)))];

  const handleReplay = (commandId: string) => {
    const command = history.find(h => h.id === commandId);
    if (command) {
      replay(commandId);
      showNotification(`Replayed: ${command.command}`, 'success');
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    showNotification('Command history cleared', 'info');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  useKeyboard({
    shortcuts: {
      escape: onBack,
      s: () => setShowStats(!showStats),
      c: handleClearHistory,
      r: () => {
        if (selectedCommand) {
          handleReplay(selectedCommand);
        }
      },
      f: () => {
        // Focus filter input
      }
    },
    enabled: true
  });

  if (showStats) {
    return (
      <Box flexDirection="column" paddingY={1} paddingX={2}>
        <Box marginBottom={1}>
          <Text bold color="cyan">📊 Command History Statistics</Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="gray">Total Commands: </Text>
            <Text bold>{stats.totalCommands}</Text>
          </Box>

          <Box>
            <Text color="gray">Success Rate: </Text>
            <Text bold color={stats.successRate >= 80 ? 'green' : stats.successRate >= 50 ? 'yellow' : 'red'}>
              {stats.successRate.toFixed(1)}%
            </Text>
          </Box>

          <Box>
            <Text color="gray">Most Used Category: </Text>
            <Text bold color="cyan">{stats.mostUsedCategory}</Text>
          </Box>

          <Box>
            <Text color="gray">Average Duration: </Text>
            <Text bold>{formatDuration(stats.averageDuration)}</Text>
          </Box>

          {stats.recentCommands.length > 0 && (
            <>
              <Box marginTop={1}>
                <Text bold underline>Recent Commands:</Text>
              </Box>
              {stats.recentCommands.map(cmd => (
                <Box key={cmd.id} paddingLeft={2}>
                  <Text color={cmd.success ? 'green' : 'red'}>
                    {cmd.success ? '✓' : '✗'}
                  </Text>
                  <Text> {cmd.command}</Text>
                  <Text dimColor> ({formatTimestamp(cmd.timestamp)})</Text>
                </Box>
              ))}
            </>
          )}
        </Box>

        <Box marginTop={2}>
          <Text dimColor>[S] Hide Stats • [ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">📜 Command History</Text>
      </Box>

      <Box flexDirection="column" paddingX={2}>
        {/* Filter Controls */}
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text>Search: </Text>
            <TextInput
              value={filter}
              onChange={setFilter}
              placeholder="Filter commands..."
            />
          </Box>

          <Box>
            <Text>Category: </Text>
            <SelectInput
              items={categories.map(cat => ({
                label: cat === 'all' ? 'All Categories' : cat,
                value: cat
              }))}
              onSelect={(item) => setSelectedCategory(item.value)}
            />
          </Box>
        </Box>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <Box paddingY={2}>
            <Text color="yellow">
              {filter || selectedCategory !== 'all'
                ? 'No commands match your filter'
                : 'No command history yet'}
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            <Box marginBottom={1}>
              <Text dimColor>
                Showing {filteredHistory.length} command{filteredHistory.length === 1 ? '' : 's'}
              </Text>
            </Box>

            {filteredHistory.slice(0, 20).map(cmd => {
              const isSelected = cmd.id === selectedCommand;
              return (
                <Box
                  key={cmd.id}
                  flexDirection="row"
                  marginBottom={1}
                  paddingLeft={isSelected ? 0 : 2}
                >
                  {isSelected && <Text color="cyan">▶ </Text>}
                  <Box flexGrow={1}>
                    <Text color={cmd.success ? 'green' : 'red'}>
                      {cmd.success ? '✓' : '✗'}
                    </Text>
                    <Text> </Text>
                    <Text bold={isSelected}>{cmd.command}</Text>
                  </Box>
                  <Box>
                    <Text dimColor>[{cmd.category}]</Text>
                    <Text dimColor> {formatTimestamp(cmd.timestamp)}</Text>
                    {cmd.duration && (
                      <Text dimColor> ({formatDuration(cmd.duration)})</Text>
                    )}
                  </Box>
                </Box>
              );
            })}

            {filteredHistory.length > 20 && (
              <Box marginTop={1}>
                <Text dimColor>... and {filteredHistory.length - 20} more</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          [S] Stats • [R] Replay • [C] Clear • [F] Filter • [ESC] Back
        </Text>
      </Box>
    </Box>
  );
};