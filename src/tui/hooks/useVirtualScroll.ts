import { useState, useEffect, useCallback } from 'react';

interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  visibleStart: number;
  visibleEnd: number;
  virtualStart: number;
  virtualEnd: number;
  scrollTop: number;
  scrollToIndex: (index: number) => void;
  scrollBy: (delta: number) => void;
  totalHeight: number;
  offsetY: number;
}

/**
 * Hook for implementing virtual scrolling in terminal UIs
 * Optimizes rendering of large lists by only rendering visible items
 */
export const useVirtualScroll = ({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: VirtualScrollOptions): VirtualScrollResult => {
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(visibleStart + visibleItemCount, itemCount);

  // Calculate virtual range (includes overscan for smoother scrolling)
  const virtualStart = Math.max(0, visibleStart - overscan);
  const virtualEnd = Math.min(itemCount, visibleEnd + overscan);

  // Total scrollable height
  const totalHeight = itemCount * itemHeight;

  // Offset for virtual items
  const offsetY = virtualStart * itemHeight;

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      const targetScrollTop = index * itemHeight;
      const maxScrollTop = totalHeight - containerHeight;
      setScrollTop(Math.max(0, Math.min(targetScrollTop, maxScrollTop)));
    },
    [itemHeight, totalHeight, containerHeight],
  );

  // Scroll by delta
  const scrollBy = useCallback(
    (delta: number) => {
      setScrollTop((prev) => {
        const maxScrollTop = totalHeight - containerHeight;
        return Math.max(0, Math.min(prev + delta, maxScrollTop));
      });
    },
    [totalHeight, containerHeight],
  );

  // Ensure scroll position is valid when items change
  useEffect(() => {
    const maxScrollTop = Math.max(0, totalHeight - containerHeight);
    if (scrollTop > maxScrollTop) {
      setScrollTop(maxScrollTop);
    }
  }, [scrollTop, totalHeight, containerHeight]);

  return {
    visibleStart,
    visibleEnd,
    virtualStart,
    virtualEnd,
    scrollTop,
    scrollToIndex,
    scrollBy,
    totalHeight,
    offsetY,
  };
};

/**
 * Hook for optimized list rendering with memoization
 */
export const useOptimizedList = <T>(
  items: T[],
  dependencies: unknown[] = [],
): { items: T[]; isUpdating: boolean } => {
  const [optimizedItems, setOptimizedItems] = useState<T[]>(items);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Debounce updates for large lists
    if (items.length > 100) {
      setIsUpdating(true);
      const timeout = setTimeout(() => {
        setOptimizedItems(items);
        setIsUpdating(false);
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      setOptimizedItems(items);
      return undefined;
    }
  }, [items, ...dependencies]);

  return {
    items: optimizedItems,
    isUpdating,
  };
};
