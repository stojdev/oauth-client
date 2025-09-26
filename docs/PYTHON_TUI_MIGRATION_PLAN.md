# Python TUI Migration Plan: From Ink to Textual

## Executive Summary

Complete replacement of the problematic React/Ink TUI with a Python Textual implementation that interfaces with the existing Node.js OAuth core via CLI commands.

## Architecture Decision

### Hybrid Approach (Recommended)

- **Keep**: Node.js OAuth core, token management, security features
- **Replace**: Entire src/tui/ directory with Python implementation
- **Interface**: Python TUI calls Node.js CLI commands via subprocess
- **Data Exchange**: JSON for complex data, exit codes for status

### Why This Approach?

1. Preserves battle-tested OAuth implementation
2. Maintains AES-256-GCM encryption and security features
3. Clean separation of concerns
4. Minimal risk - TUI layer only
5. Can be developed and tested independently

## Implementation Steps

### Phase 1: Setup Python TUI Project (Day 1)

```bash
# Create Python TUI directory structure
oauth-client/
├── python-tui/
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── oauth_tui/
│   │   ├── __init__.py
│   │   ├── app.py              # Main Textual app
│   │   ├── screens/            # Different screens
│   │   │   ├── __init__.py
│   │   │   ├── menu.py         # Main menu
│   │   │   ├── auth.py         # Auth flows
│   │   │   ├── tokens.py       # Token management
│   │   │   ├── config.py       # Configuration
│   │   │   └── inspector.py    # JWT inspector
│   │   ├── widgets/            # Custom widgets
│   │   ├── services/           # Node.js CLI interface
│   │   │   ├── __init__.py
│   │   │   ├── cli_bridge.py   # Subprocess management
│   │   │   └── oauth_client.py # OAuth operations
│   │   └── utils/
│   └── tests/
```

### Phase 2: Core Infrastructure (Day 1-2)

#### CLI Bridge Service

```python
# oauth_tui/services/cli_bridge.py
import asyncio
import json
import subprocess
from typing import Any, Dict, Optional

class CLIBridge:
    """Bridge to Node.js OAuth CLI"""

    def __init__(self, cli_path: str = "node dist/cli/index.js"):
        self.cli_path = cli_path

    async def execute_command(self, command: str, args: list = None) -> Dict[str, Any]:
        """Execute CLI command and return JSON response"""
        cmd = [*self.cli_path.split(), command]
        if args:
            cmd.extend(args)

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        return {
            'success': proc.returncode == 0,
            'data': json.loads(stdout) if stdout else None,
            'error': stderr.decode() if stderr else None
        }
```

### Phase 3: Screen Implementation (Day 2-4)

#### Main Menu Screen

```python
# oauth_tui/screens/menu.py
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Button, Container
from textual.containers import Vertical, Horizontal

class MenuScreen(Screen):
    """Main menu screen"""

    BINDINGS = [
        ("d", "show_dashboard", "Dashboard"),
        ("a", "auth_flow", "Authenticate"),
        ("t", "view_tokens", "View Tokens"),
        ("c", "configure", "Configuration"),
        ("q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Vertical(
                Button("Dashboard", id="dashboard", variant="primary"),
                Button("Authenticate", id="auth"),
                Button("View Tokens", id="tokens"),
                Button("Configuration", id="config"),
                Button("Exit", id="exit", variant="error"),
            ),
            id="menu-container"
        )
        yield Footer()
```

### Phase 4: OAuth Integration (Day 4-5)

#### OAuth Service Interface

```python
# oauth_tui/services/oauth_client.py
class OAuthService:
    """Interface to Node.js OAuth implementation"""

    def __init__(self, bridge: CLIBridge):
        self.bridge = bridge

    async def list_providers(self):
        """Get configured OAuth providers"""
        return await self.bridge.execute_command("list-providers")

    async def authenticate(self, provider: str, flow: str):
        """Start OAuth flow"""
        return await self.bridge.execute_command(
            "authenticate",
            ["--provider", provider, "--flow", flow]
        )

    async def get_tokens(self):
        """Get stored tokens"""
        return await self.bridge.execute_command("list-tokens")

    async def refresh_token(self, provider: str):
        """Refresh token for provider"""
        return await self.bridge.execute_command(
            "refresh-token",
            ["--provider", provider]
        )
```

### Phase 5: Testing (Day 5-6)

#### Test Infrastructure

```python
# tests/test_screens.py
import pytest
from textual.testing import AppTest
from oauth_tui.app import OAuthTUI

@pytest.mark.asyncio
async def test_main_menu():
    """Test main menu navigation"""
    async with AppTest(app=OAuthTUI()) as pilot:
        # Test initial state
        assert pilot.app.screen.name == "menu"

        # Test navigation
        await pilot.press("a")
        assert pilot.app.screen.name == "auth"

        # Test back navigation
        await pilot.press("escape")
        assert pilot.app.screen.name == "menu"
```

### Phase 6: Node.js CLI Modification (Day 6)

#### Update TUI Command

```typescript
// src/cli/commands/tui.ts
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export async function tuiCommand(): Promise<void> {
  // Check if Python TUI is available
  const pythonTuiPath = join(__dirname, '../../python-tui');

  if (existsSync(pythonTuiPath)) {
    // Launch Python TUI
    const child = spawn('python', ['-m', 'oauth_tui'], {
      cwd: pythonTuiPath,
      stdio: 'inherit'
    });

    return new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`TUI exited with code ${code}`));
      });
    });
  } else {
    console.error('Python TUI not found. Please install it first.');
    process.exit(1);
  }
}
```

### Phase 7: Cleanup (Day 7)

1. **Remove all Ink/React TUI code**:

```bash
# Remove old TUI
rm -rf src/tui/
rm -rf src/tui/__tests__/

# Remove Ink dependencies
npm uninstall ink ink-gradient ink-select-input ink-spinner ink-text-input ink-testing-library

# Update package.json scripts
```

1. **Update build process**:

```json
// package.json
{
  "scripts": {
    "build": "pnpm build:cli && pnpm build:python-tui",
    "build:python-tui": "cd python-tui && pip install -e .",
    "tui": "cd python-tui && python -m oauth_tui"
  }
}
```

## File Removal List

### Delete Completely

- `src/tui/**/*` - All React/Ink TUI code
- `TUI_COMPREHENSIVE_TEST_SUITE.md` - Old test documentation
- `TUI_IMPLEMENTATION_PLAN.md` - Old implementation plan

### Keep

- All `src/core/**/*` - OAuth implementation
- All `src/grants/**/*` - Grant types
- All `src/services/**/*` - Services
- All `src/cli/**/*` except `tui.ts` (modify)
- All `src/utils/**/*` - Utilities
- All `src/config/**/*` - Configuration

## Python Dependencies

```toml
# python-tui/pyproject.toml
[project]
name = "oauth-tui"
version = "1.0.0"
dependencies = [
    "textual>=0.47.0",
    "rich>=13.7.0",
    "aiofiles>=23.2.1",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.3",
    "pytest-asyncio>=0.21.1",
    "pytest-textual>=0.1.0",
    "black>=23.11.0",
    "mypy>=1.7.0",
]
```

## Testing Strategy

### Unit Tests

- Test each screen independently
- Mock CLI bridge for isolated testing
- Test keyboard navigation
- Test form validation

### Integration Tests

- Test full workflows with real CLI
- Test error handling
- Test data persistence
- Test concurrent operations

### Performance Tests

- Large token list rendering
- Rapid navigation
- Memory usage monitoring
- Response time validation

## Success Criteria

1. ✅ All current TUI features working in Python
2. ✅ No header duplication or rendering issues
3. ✅ Faster and more responsive than Ink version
4. ✅ Comprehensive test coverage (>80%)
5. ✅ Clean separation from Node.js core
6. ✅ Easy to maintain and extend

## Timeline

- **Day 1**: Project setup and infrastructure
- **Day 2-4**: Core screens implementation
- **Day 4-5**: OAuth integration and services
- **Day 5-6**: Testing and debugging
- **Day 6**: Node.js integration
- **Day 7**: Cleanup and documentation
- **Day 8**: Final testing and deployment

## Next Steps

1. Create Python project structure
2. Implement CLI bridge service
3. Create main menu screen
4. Test integration with Node.js CLI
5. Implement remaining screens
6. Complete testing suite
7. Remove old TUI code
8. Update documentation

## Benefits of Migration

1. **Stability**: No more rendering issues
2. **Performance**: Native Python performance in terminal
3. **Testing**: Better testing framework with Textual
4. **Maintenance**: Cleaner codebase, easier to maintain
5. **Features**: Access to rich Textual widget library
6. **Community**: Larger Python TUI community support

This plan provides a clear, actionable path to completely replace the problematic Ink TUI with a robust Python Textual implementation while preserving all the OAuth functionality.
