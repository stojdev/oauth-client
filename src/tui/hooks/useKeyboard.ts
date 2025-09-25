import { useInput, Key } from 'ink';
import { useEffect, useRef } from 'react';

interface KeyboardOptions {
  shortcuts: Record<string, () => void>;
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboard = ({
  shortcuts,
  enabled = true,
  preventDefault = true,
}: KeyboardOptions): void => {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useInput((input: string, key: Key) => {
    if (!enabled) {
      return undefined;
    }

    // Check for single key shortcuts
    if (input && shortcutsRef.current[input]) {
      shortcutsRef.current[input]();
      return preventDefault;
    }

    // Check for special keys
    if (key.escape && shortcutsRef.current['escape']) {
      shortcutsRef.current['escape']();
      return preventDefault;
    }

    if (key.return && shortcutsRef.current['enter']) {
      shortcutsRef.current['enter']();
      return preventDefault;
    }

    if (key.tab && shortcutsRef.current['tab']) {
      shortcutsRef.current['tab']();
      return preventDefault;
    }

    // Ctrl combinations
    if (key.ctrl && input) {
      const ctrlKey = `ctrl+${input}`;
      if (shortcutsRef.current[ctrlKey]) {
        shortcutsRef.current[ctrlKey]();
        return preventDefault;
      }
    }

    // Arrow keys
    if (key.upArrow && shortcutsRef.current['up']) {
      shortcutsRef.current['up']();
      return preventDefault;
    }

    if (key.downArrow && shortcutsRef.current['down']) {
      shortcutsRef.current['down']();
      return preventDefault;
    }

    if (key.leftArrow && shortcutsRef.current['left']) {
      shortcutsRef.current['left']();
      return preventDefault;
    }

    if (key.rightArrow && shortcutsRef.current['right']) {
      shortcutsRef.current['right']();
      return preventDefault;
    }

    return undefined;
  });
};
