import { useState, useEffect, useCallback } from 'react';

export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: number;
  category: string;
  success: boolean;
  duration?: number;
  error?: string;
  result?: string;
}

interface CommandHistoryHook {
  history: CommandHistoryEntry[];
  addCommand: (entry: Omit<CommandHistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  replay: (id: string) => void;
  getStats: () => CommandStats;
}

interface CommandStats {
  totalCommands: number;
  successRate: number;
  mostUsedCategory: string;
  averageDuration: number;
  recentCommands: CommandHistoryEntry[];
}

const STORAGE_KEY = 'oauth-cli-command-history';
const MAX_HISTORY_SIZE = 100;

export const useCommandHistory = (): CommandHistoryHook => {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CommandHistoryEntry[];
        // Only keep recent history
        const recent = parsed.slice(-MAX_HISTORY_SIZE);
        setHistory(recent);
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save command history:', error);
    }
  }, [history]);

  const addCommand = useCallback((entry: Omit<CommandHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: CommandHistoryEntry = {
      ...entry,
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [...prev, newEntry];
      // Keep only the most recent entries
      if (updated.length > MAX_HISTORY_SIZE) {
        return updated.slice(-MAX_HISTORY_SIZE);
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const replay = useCallback(
    (id: string) => {
      const entry = history.find((h) => h.id === id);
      if (entry) {
        // In a real implementation, this would execute the command
        // For now, we'll just simulate it

        // Add the replayed command to history
        addCommand({
          command: entry.command,
          category: entry.category,
          success: true,
          duration: entry.duration,
        });
      }
    },
    [history, addCommand],
  );

  const getStats = useCallback((): CommandStats => {
    if (history.length === 0) {
      return {
        totalCommands: 0,
        successRate: 0,
        mostUsedCategory: 'N/A',
        averageDuration: 0,
        recentCommands: [],
      };
    }

    const successCount = history.filter((h) => h.success).length;
    const successRate = (successCount / history.length) * 100;

    // Calculate most used category
    const categoryCounts = history.reduce(
      (acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostUsedCategory =
      Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Calculate average duration
    const durations = history.filter((h) => h.duration).map((h) => h.duration!);
    const averageDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    // Get recent commands (last 5)
    const recentCommands = history.slice(-5).reverse();

    return {
      totalCommands: history.length,
      successRate,
      mostUsedCategory,
      averageDuration,
      recentCommands,
    };
  }, [history]);

  return {
    history,
    addCommand,
    clearHistory,
    replay,
    getStats,
  };
};
