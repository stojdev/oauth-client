import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useVirtualScroll } from '../../hooks/useVirtualScroll.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  onSelect?: (item: T, index: number) => void;
  selectedIndex?: number;
  showScrollbar?: boolean;
  emptyMessage?: string;
}

/**
 * High-performance virtual scrolling list component
 * Only renders visible items for optimal performance with large datasets
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight = 1,
  containerHeight = 20,
  onSelect,
  selectedIndex: controlledSelectedIndex,
  showScrollbar = true,
  emptyMessage = 'No items to display'
}: VirtualListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(controlledSelectedIndex ?? 0);
  const measuredHeight = containerHeight;

  // Update selected index when controlled value changes
  useEffect(() => {
    if (controlledSelectedIndex !== undefined) {
      setSelectedIndex(controlledSelectedIndex);
    }
  }, [controlledSelectedIndex]);

  const {
    virtualStart,
    virtualEnd,
    scrollToIndex,
    scrollBy,
    totalHeight,
    offsetY,
    visibleStart,
    visibleEnd
  } = useVirtualScroll({
    itemCount: items.length,
    itemHeight,
    containerHeight: measuredHeight,
    overscan: 5
  });

  // Ensure selected item is visible
  useEffect(() => {
    if (selectedIndex < visibleStart || selectedIndex >= visibleEnd) {
      scrollToIndex(selectedIndex);
    }
  }, [selectedIndex, visibleStart, visibleEnd, scrollToIndex]);

  useKeyboard({
    shortcuts: {
      up: () => {
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        if (newIndex < visibleStart) {
          scrollBy(-itemHeight);
        }
      },
      down: () => {
        const newIndex = Math.min(items.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        if (newIndex >= visibleEnd) {
          scrollBy(itemHeight);
        }
      },
      pageUp: () => {
        const pageSize = Math.floor(measuredHeight / itemHeight);
        const newIndex = Math.max(0, selectedIndex - pageSize);
        setSelectedIndex(newIndex);
        scrollToIndex(newIndex);
      },
      pageDown: () => {
        const pageSize = Math.floor(measuredHeight / itemHeight);
        const newIndex = Math.min(items.length - 1, selectedIndex + pageSize);
        setSelectedIndex(newIndex);
        scrollToIndex(newIndex);
      },
      home: () => {
        setSelectedIndex(0);
        scrollToIndex(0);
      },
      end: () => {
        const lastIndex = items.length - 1;
        setSelectedIndex(lastIndex);
        scrollToIndex(lastIndex);
      },
      enter: () => {
        if (onSelect && items[selectedIndex]) {
          onSelect(items[selectedIndex], selectedIndex);
        }
      }
    },
    enabled: items.length > 0
  });

  // Calculate scrollbar position
  const scrollbarHeight = Math.max(
    1,
    Math.round((measuredHeight / totalHeight) * measuredHeight)
  );
  const scrollbarPosition = Math.round(
    ((visibleStart * itemHeight) / totalHeight) * measuredHeight
  );

  if (items.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="yellow">{emptyMessage}</Text>
      </Box>
    );
  }

  // Get visible items
  const visibleItems = items.slice(virtualStart, virtualEnd);

  return (
    <Box flexDirection="row" height={measuredHeight}>
      {/* Main list content */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Top padding for virtual scroll */}
        {virtualStart > 0 && (
          <Box height={Math.floor(offsetY / itemHeight)}>
            <Text dimColor>↑ {virtualStart} more items</Text>
          </Box>
        )}

        {/* Visible items */}
        {visibleItems.map((item, index) => {
          const actualIndex = virtualStart + index;
          const isSelected = actualIndex === selectedIndex;
          return (
            <Box key={actualIndex} height={itemHeight}>
              {renderItem(item, actualIndex, isSelected)}
            </Box>
          );
        })}

        {/* Bottom padding indicator */}
        {virtualEnd < items.length && (
          <Box>
            <Text dimColor>↓ {items.length - virtualEnd} more items</Text>
          </Box>
        )}
      </Box>

      {/* Scrollbar */}
      {showScrollbar && items.length > measuredHeight / itemHeight && (
        <Box
          flexDirection="column"
          width={1}
          marginLeft={1}
        >
          {Array.from({ length: measuredHeight }).map((_, i) => {
            const isScrollbar = i >= scrollbarPosition &&
                               i < scrollbarPosition + scrollbarHeight;
            return (
              <Text key={i} color={isScrollbar ? 'cyan' : 'gray'}>
                {isScrollbar ? '█' : '│'}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/**
 * Optimized static list for small datasets
 * Uses memoization and efficient rendering
 */
export const OptimizedList: React.FC<{
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  maxVisible?: number;
}> = React.memo(({ items, renderItem, maxVisible = 50 }) => {
  const visibleItems = items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  return (
    <Box flexDirection="column">
      {visibleItems.map((item, index) => (
        <Box key={index}>{renderItem(item, index)}</Box>
      ))}
      {hasMore && (
        <Box marginTop={1}>
          <Text dimColor>
            ... and {items.length - maxVisible} more items
          </Text>
        </Box>
      )}
    </Box>
  );
});