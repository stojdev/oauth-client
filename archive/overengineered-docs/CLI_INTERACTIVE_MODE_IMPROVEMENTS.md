# CLI Interactive Mode Improvements Guide

## Executive Summary

The OAuth client's interactive mode currently lacks proper escape/back navigation functionality. This document provides research findings and implementation recommendations for creating a robust, user-friendly CLI interactive experience that follows industry best practices.

## Current Issues

1. **No Escape key handling** - Users cannot press ESC to go back or exit menus
2. **No navigation stack** - No way to track menu hierarchy and navigate backwards
3. **Missing keyboard shortcuts** - Limited keyboard navigation options
4. **No graceful exit handling** - Interrupts may leave terminal in bad state

## Recommended Solution Architecture

### 1. Navigation System Implementation

#### Core Navigation Handler

```typescript
// src/cli/interactive/navigation-manager.ts
import { EventEmitter } from 'events';

export class NavigationManager extends EventEmitter {
  private navigationStack: NavigationState[] = [];
  private currentState: NavigationState;

  constructor() {
    super();
    this.setupKeyboardHandling();
    this.setupSignalHandling();
  }

  private setupKeyboardHandling() {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.handleKeypress.bind(this));
  }

  private handleKeypress(chunk: Buffer) {
    const key = chunk.toString();

    switch (key) {
      case '\x1b': // ESC key
        this.handleEscape();
        break;
      case '\x1b[A': // Up arrow
        this.emit('navigate', 'up');
        break;
      case '\x1b[B': // Down arrow
        this.emit('navigate', 'down');
        break;
      case '\r': // Enter
        this.emit('select');
        break;
      case '\x03': // Ctrl+C
        this.handleExit();
        break;
      case 'q': // Quick quit
        this.handleQuit();
        break;
      case '?': // Help
        this.showHelp();
        break;
    }
  }

  private handleEscape() {
    if (this.navigationStack.length > 0) {
      // Go back one level
      this.currentState = this.navigationStack.pop()!;
      this.emit('back', this.currentState);
    } else {
      // At root level - show confirmation
      this.emit('confirm-exit');
    }
  }

  private setupSignalHandling() {
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  private cleanup() {
    // Restore terminal state
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    console.log('\n👋 Goodbye!');
  }

  pushState(state: NavigationState) {
    this.navigationStack.push(this.currentState);
    this.currentState = state;
    this.emit('state-change', state);
  }

  popState(): NavigationState | null {
    if (this.navigationStack.length === 0) return null;

    this.currentState = this.navigationStack.pop()!;
    this.emit('state-change', this.currentState);
    return this.currentState;
  }
}

interface NavigationState {
  screen: string;
  title: string;
  breadcrumbs: string[];
  selectedIndex: number;
  data?: any;
}
```

### 2. Enhanced Menu System

#### Menu with Escape Support

```typescript
// src/cli/interactive/escape-aware-menu.ts
import chalk from 'chalk';
import { NavigationManager } from './navigation-manager';

export class EscapeAwareMenu {
  private navigator: NavigationManager;
  private options: MenuOption[] = [];
  private selectedIndex = 0;

  constructor(options: MenuOption[]) {
    this.options = options;
    this.navigator = new NavigationManager();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.navigator.on('navigate', (direction: string) => {
      if (direction === 'up') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      } else if (direction === 'down') {
        this.selectedIndex = Math.min(
          this.options.length - 1,
          this.selectedIndex + 1
        );
      }
      this.render();
    });

    this.navigator.on('select', () => {
      const selected = this.options[this.selectedIndex];

      if (selected.submenu) {
        this.navigateToSubmenu(selected);
      } else if (selected.action) {
        this.executeAction(selected);
      }
    });

    this.navigator.on('back', (state: NavigationState) => {
      this.restoreState(state);
      this.render();
    });

    this.navigator.on('confirm-exit', () => {
      this.showExitConfirmation();
    });
  }

  private render() {
    console.clear();

    // Show breadcrumbs
    const breadcrumbs = this.getBreadcrumbs();
    if (breadcrumbs.length > 0) {
      console.log(chalk.gray(`📍 ${breadcrumbs.join(' > ')}\n`));
    }

    // Show title
    console.log(chalk.bold.cyan('OAuth Client - Interactive Mode\n'));

    // Render menu options
    this.options.forEach((option, index) => {
      const isSelected = index === this.selectedIndex;
      const prefix = isSelected ? chalk.cyan('→') : ' ';
      const icon = option.submenu ? '📁' : '📄';
      const text = isSelected
        ? chalk.bold(option.label)
        : option.label;

      console.log(`${prefix} ${icon} ${text}`);

      if (isSelected && option.description) {
        console.log(chalk.gray(`   ${option.description}`));
      }
    });

    // Show keyboard shortcuts
    this.showKeyboardHints();
  }

  private showKeyboardHints() {
    console.log('\n' + chalk.gray('─'.repeat(50)));
    console.log(chalk.gray(
      '↑/↓: Navigate  ' +
      'Enter: Select  ' +
      'ESC: Back  ' +
      'q: Quit  ' +
      '?: Help'
    ));

    // Show context-specific hints
    if (this.navigationStack.length > 0) {
      console.log(chalk.yellow('Press ESC to go back to previous menu'));
    }
  }

  private navigateToSubmenu(option: MenuOption) {
    this.navigator.pushState({
      screen: option.value,
      title: option.label,
      breadcrumbs: [...this.getBreadcrumbs(), option.label],
      selectedIndex: 0,
      data: { options: option.submenu }
    });

    this.options = option.submenu!;
    this.selectedIndex = 0;
    this.render();
  }

  private async executeAction(option: MenuOption) {
    try {
      console.clear();
      console.log(chalk.cyan(`Executing: ${option.label}...\n`));

      if (option.action) {
        await option.action();
      }

      console.log(chalk.green('\n✅ Action completed!'));
      console.log(chalk.gray('\nPress any key to continue...'));

      // Wait for keypress
      await this.waitForKeypress();
      this.render();
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      console.log(chalk.gray('\nPress any key to continue...'));
      await this.waitForKeypress();
      this.render();
    }
  }

  private showExitConfirmation() {
    console.log('\n' + chalk.yellow('Are you sure you want to exit? (y/n)'));

    process.stdin.once('data', (data) => {
      const key = data.toString().toLowerCase();
      if (key === 'y' || key === '\r') {
        this.navigator.cleanup();
        process.exit(0);
      } else {
        this.render();
      }
    });
  }
}

interface MenuOption {
  label: string;
  value: string;
  description?: string;
  action?: () => void | Promise<void>;
  submenu?: MenuOption[];
}
```

### 3. Integration with Current OAuth Client

#### Updated Interactive Command

```typescript
// src/cli/commands/interactive-improved.ts
import { Command } from 'commander';
import { EscapeAwareMenu } from '../interactive/escape-aware-menu';
import { OAuthService } from '../../services/oauth-service';

export function createInteractiveCommand(program: Command) {
  program
    .command('interactive')
    .alias('i')
    .description('Start improved interactive mode with escape navigation')
    .action(async () => {
      const menu = new EscapeAwareMenu([
        {
          label: 'OAuth Configuration',
          value: 'oauth',
          description: 'Configure OAuth providers and credentials',
          submenu: [
            {
              label: 'Add Provider',
              value: 'add-provider',
              description: 'Add a new OAuth provider configuration',
              action: async () => {
                // Implementation
              }
            },
            {
              label: 'List Providers',
              value: 'list-providers',
              action: async () => {
                // Implementation
              }
            },
            {
              label: 'Test Provider',
              value: 'test-provider',
              submenu: [
                {
                  label: 'ServiceNow',
                  value: 'servicenow',
                  action: async () => {
                    // Test ServiceNow OAuth
                  }
                },
                {
                  label: 'Custom Provider',
                  value: 'custom',
                  action: async () => {
                    // Test custom provider
                  }
                }
              ]
            }
          ]
        },
        {
          label: 'Token Management',
          value: 'tokens',
          description: 'Manage stored OAuth tokens',
          submenu: [
            {
              label: 'List Tokens',
              value: 'list',
              action: async () => {
                const service = new OAuthService();
                const tokens = await service.listTokens();
                console.table(tokens);
              }
            },
            {
              label: 'Clear Tokens',
              value: 'clear',
              action: async () => {
                const service = new OAuthService();
                await service.clearTokens();
                console.log('✅ All tokens cleared');
              }
            },
            {
              label: 'Refresh Token',
              value: 'refresh',
              action: async () => {
                // Implementation
              }
            }
          ]
        },
        {
          label: 'Grant Types',
          value: 'grants',
          submenu: [
            {
              label: 'Client Credentials',
              value: 'client-credentials',
              action: async () => {
                // Implementation
              }
            },
            {
              label: 'Authorization Code',
              value: 'auth-code',
              action: async () => {
                // Implementation
              }
            },
            {
              label: 'Device Flow',
              value: 'device',
              action: async () => {
                // Implementation
              }
            }
          ]
        },
        {
          label: 'Settings',
          value: 'settings',
          submenu: [
            {
              label: 'Log Level',
              value: 'log-level',
              submenu: [
                { label: 'Error', value: 'error' },
                { label: 'Warn', value: 'warn' },
                { label: 'Info', value: 'info' },
                { label: 'Debug', value: 'debug' }
              ]
            },
            {
              label: 'Clear Cache',
              value: 'clear-cache',
              action: async () => {
                // Implementation
              }
            }
          ]
        },
        {
          label: 'Help',
          value: 'help',
          action: async () => {
            showHelp();
          }
        },
        {
          label: 'Exit',
          value: 'exit',
          action: () => {
            process.exit(0);
          }
        }
      ]);

      await menu.show();
    });
}
```

## Implementation Checklist

### Phase 1: Core Navigation (Priority: HIGH)

- [ ] Implement NavigationManager class with escape key handling
- [ ] Add navigation stack for menu hierarchy tracking
- [ ] Implement proper signal handling (SIGINT, SIGTERM)
- [ ] Add terminal state restoration on exit
- [ ] Create unit tests for navigation logic

### Phase 2: Enhanced Menu System (Priority: HIGH)

- [ ] Create EscapeAwareMenu class
- [ ] Add breadcrumb navigation display
- [ ] Implement keyboard shortcuts (ESC, arrows, Enter, q, ?)
- [ ] Add visual feedback for selected items
- [ ] Implement submenu navigation

### Phase 3: User Experience (Priority: MEDIUM)

- [ ] Add colorized output with chalk
- [ ] Implement loading spinners for async operations
- [ ] Add progress bars for long operations
- [ ] Create contextual help system
- [ ] Add undo/redo functionality where applicable

### Phase 4: Accessibility (Priority: MEDIUM)

- [ ] Add screen reader compatible output
- [ ] Implement high contrast mode
- [ ] Add keyboard-only navigation support
- [ ] Create accessible error messages
- [ ] Test with NVDA/JAWS screen readers

### Phase 5: Advanced Features (Priority: LOW)

- [ ] Add search/filter functionality in menus
- [ ] Implement command history
- [ ] Add autocomplete for text inputs
- [ ] Create customizable keyboard shortcuts
- [ ] Add theme support

## Testing Strategy

### Unit Tests

```typescript
// src/cli/interactive/__tests__/navigation-manager.test.ts
describe('NavigationManager', () => {
  it('should handle escape key to go back', () => {
    const manager = new NavigationManager();
    manager.pushState({ screen: 'submenu' });

    // Simulate ESC key
    process.stdin.emit('data', Buffer.from('\x1b'));

    expect(manager.getCurrentState().screen).toBe('main');
  });

  it('should cleanup terminal on exit', () => {
    const manager = new NavigationManager();
    const setRawModeSpy = jest.spyOn(process.stdin, 'setRawMode');

    manager.cleanup();

    expect(setRawModeSpy).toHaveBeenCalledWith(false);
  });
});
```

### Integration Tests

```typescript
// src/cli/interactive/__tests__/menu.integration.test.ts
describe('EscapeAwareMenu Integration', () => {
  it('should navigate through menu hierarchy', async () => {
    const menu = new EscapeAwareMenu(testMenuOptions);

    // Navigate to submenu
    await menu.simulateKeypress('\x1b[B'); // Down arrow
    await menu.simulateKeypress('\r'); // Enter

    expect(menu.getCurrentLevel()).toBe(2);

    // Go back with ESC
    await menu.simulateKeypress('\x1b');

    expect(menu.getCurrentLevel()).toBe(1);
  });
});
```

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "chalk": "^5.3.0",        // Terminal colors
    "ora": "^7.0.1",          // Loading spinners
    "cli-progress": "^3.12.0", // Progress bars
    "keypress": "^0.2.1"      // Keyboard event handling
  },
  "devDependencies": {
    "@types/keypress": "^2.0.30"
  }
}
```

### Alternative Libraries to Consider

1. **inquirer.js** (35M weekly downloads)
   - Pros: Mature, extensive prompt types
   - Cons: Limited escape key customization

2. **blessed** (800K weekly downloads)
   - Pros: Full terminal UI framework
   - Cons: Heavier, more complex

3. **ink** (700K weekly downloads)
   - Pros: React-like components
   - Cons: Different paradigm

4. **enquirer** (20M weekly downloads)
   - Pros: Better escape handling than inquirer
   - Cons: Less documentation

## Migration Path

### Step 1: Parallel Implementation

- Keep existing interactive mode as `interactive-legacy`
- Implement new mode as `interactive` with feature flag

### Step 2: Gradual Migration

```typescript
// src/cli/index.ts
if (process.env.USE_NEW_INTERACTIVE === 'true') {
  createImprovedInteractiveCommand(program);
} else {
  createLegacyInteractiveCommand(program);
}
```

### Step 3: Testing Period

- Internal testing for 2 weeks
- Beta testing with select users
- Gather feedback and iterate

### Step 4: Full Release

- Make new interactive mode default
- Deprecate legacy mode
- Remove legacy code after 1 month

## Performance Considerations

1. **Debounce keyboard input** - Prevent rapid key events
2. **Lazy load submenus** - Only load when accessed
3. **Cache menu structures** - Avoid recreating on each render
4. **Minimize console clears** - Use partial updates when possible
5. **Async action handling** - Non-blocking operations

## Security Considerations

1. **Sanitize all user input** - Prevent injection attacks
2. **Mask sensitive data** - Hide tokens and secrets
3. **Secure credential storage** - Use system keychain
4. **Audit logging** - Track all actions in interactive mode
5. **Session timeouts** - Auto-logout after inactivity

## Conclusion

Implementing proper escape key handling and navigation in the OAuth client's interactive mode is essential for providing a professional, user-friendly CLI experience. The proposed architecture follows industry best practices and addresses all current limitations while maintaining backward compatibility and ensuring accessibility.

The implementation should prioritize core navigation features (Phase 1-2) to quickly resolve the immediate usability issues, then gradually enhance the experience with advanced features.

## References

- [Node.js Process Documentation](https://nodejs.org/api/process.html)
- [Inquirer.js GitHub Issues #454](https://github.com/SBoudrias/Inquirer.js/issues/454)
- [Blessed.js Documentation](https://github.com/chjj/blessed)
- [Node.js Best Practices 2024](https://github.com/goldbergyoni/nodebestpractices)
- [Building Terminal UIs](https://badacadabra.github.io/Building-a-visual-form-in-your-terminal-emulator-with-Blessed/)
- [Escape Sequences Reference](https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797)
