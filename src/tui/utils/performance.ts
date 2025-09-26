/**
 * Performance monitoring and optimization utilities
 * Optimized for React/Ink terminal applications
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  avgRenderTime: number;
  maxRenderTime: number;
  memoryUsage: number;
  lastUpdate: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private renderStartTimes: Map<string, number> = new Map();

  startRender(component: string): void {
    this.renderStartTimes.set(component, performance.now());
  }

  endRender(component: string): void {
    const startTime = this.renderStartTimes.get(component);
    if (!startTime) {
      return;
    }

    const renderTime = performance.now() - startTime;
    const existing = this.metrics.get(component) || {
      renderCount: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
      memoryUsage: 0,
      lastUpdate: Date.now(),
    };

    const newCount = existing.renderCount + 1;
    const newAvg = (existing.avgRenderTime * existing.renderCount + renderTime) / newCount;

    this.metrics.set(component, {
      renderCount: newCount,
      avgRenderTime: newAvg,
      maxRenderTime: Math.max(existing.maxRenderTime, renderTime),
      memoryUsage: process.memoryUsage().heapUsed,
      lastUpdate: Date.now(),
    });

    this.renderStartTimes.delete(component);
  }

  getMetrics(component?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (component) {
      return (
        this.metrics.get(component) || {
          renderCount: 0,
          avgRenderTime: 0,
          maxRenderTime: 0,
          memoryUsage: 0,
          lastUpdate: 0,
        }
      );
    }
    return new Map(this.metrics);
  }

  reset(component?: string): void {
    if (component) {
      this.metrics.delete(component);
    } else {
      this.metrics.clear();
    }
    this.renderStartTimes.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Debounce function for optimizing frequent updates
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for rate-limiting updates
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoization helper for expensive computations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string,
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args) as ReturnType<T>;
    cache.set(key, result);

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

/**
 * Batch updates to reduce render cycles
 */
export class BatchUpdater<T> {
  private updates: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private callback: (updates: T[]) => void;
  private delay: number;

  constructor(callback: (updates: T[]) => void, delay = 50) {
    this.callback = callback;
    this.delay = delay;
  }

  add(update: T): void {
    this.updates.push(update);

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush(): void {
    if (this.updates.length === 0) {
      return;
    }

    const updates = [...this.updates];
    this.updates = [];
    this.callback(updates);

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  clear(): void {
    this.updates = [];
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * Memory-efficient object pool for frequently created/destroyed objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void = () => {}, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool = [];
  }

  get size(): number {
    return this.pool.length;
  }
}

/**
 * React hook for monitoring component render performance
 */
export function useRenderPerformance(componentName: string, enabled = false) {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = performance.now();
    renderCountRef.current++;

    return () => {
      if (startTimeRef.current > 0) {
        const renderTime = performance.now() - startTimeRef.current;
        console.debug(`[Performance] ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`);
      }
    };
  }, [componentName, enabled]);

  return {
    renderCount: renderCountRef.current,
    reset: useCallback(() => {
      renderCountRef.current = 0;
    }, [])
  };
}

/**
 * Hook for debounced state updates to prevent excessive re-renders
 */
export function useDebouncedState<T>(initialValue: T, delay = 300): [T, T, (value: T) => void] {
  const [immediate, setImmediate] = useState<T>(initialValue);
  const [debounced, setDebounced] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setValue = useCallback((value: T) => {
    setImmediate(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebounced(value);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [immediate, debounced, setValue];
}

/**
 * Hook for stable object references to prevent prop drilling re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T, deps: React.DependencyList): T {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = callback;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useCallback(((...args: Parameters<T>) => {
    return ref.current?.(...args);
  }) as T, []);
}

/**
 * Performance monitor for Ink applications
 */
export class InkPerformanceMonitor {
  private static instance: InkPerformanceMonitor;
  private metrics = new Map<string, { renders: number; lastRender: number }>();

  static getInstance(): InkPerformanceMonitor {
    if (!InkPerformanceMonitor.instance) {
      InkPerformanceMonitor.instance = new InkPerformanceMonitor();
    }
    return InkPerformanceMonitor.instance;
  }

  trackRender(componentName: string): void {
    const existing = this.metrics.get(componentName);
    this.metrics.set(componentName, {
      renders: (existing?.renders || 0) + 1,
      lastRender: Date.now()
    });
  }

  getReport(): string {
    const entries = Array.from(this.metrics.entries())
      .sort((a, b) => b[1].renders - a[1].renders)
      .slice(0, 10);

    return entries
      .map(([name, { renders, lastRender }]) =>
        `${name}: ${renders} renders (last: ${new Date(lastRender).toLocaleTimeString()})`
      )
      .join('\n');
  }

  reset(): void {
    this.metrics.clear();
  }
}
