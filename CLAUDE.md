# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an OAuth 2.0 test client for testing and verifying Access Token retrieval from OAuth providers. The project is in early development phase with the core implementation yet to be built.

## Technology Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Package Manager**: pnpm (v10.17.1)
- **Planned Dependencies**: Axios (HTTP client), Jest (testing)

## Commands

### Development Commands
```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm typecheck

# Quality gate checks (runs all quality checks)
pnpm quality-gate        # Full check: typecheck, lint, format, test, build
pnpm quality-gate:quick  # Quick check: typecheck, lint only

# CLI commands (after building)
node dist/cli/index.js --help
node dist/cli/index.js test-client-credentials --help
node dist/cli/index.js list-tokens
node dist/cli/index.js clear-tokens
```

## Architecture Goals

The client will implement all standard OAuth 2.0 grant types:

1. **Authorization Code Grant** - Web applications with server-side code
2. **Client Credentials Grant** - Machine-to-machine authentication
3. **Resource Owner Password Credentials** - Legacy trusted applications
4. **Implicit Grant** - Deprecated, for backward compatibility
5. **Device Authorization Grant** - IoT devices and limited input devices
6. **Refresh Token Grant** - Token renewal

## Implementation Structure (Planned)

```
src/
├── core/           # Core OAuth client logic
├── grants/         # Grant type implementations
├── providers/      # Provider-specific configurations
├── utils/          # Utilities (logging, token management)
├── cli/            # CLI interface
└── config/         # Configuration management
```

## Key Implementation Considerations

### Security Features
- PKCE (Proof Key for Code Exchange) support for Authorization Code flow
- Secure token storage mechanism
- Comprehensive error handling for OAuth errors

### Configuration
- Support for multiple OAuth providers
- Configuration via JSON/YAML files
- Environment variable support for sensitive credentials

### Testing Requirements
- Unit tests for each grant type
- Integration tests with mock OAuth servers
- CLI command testing

## Current Status

The project is in initial setup phase. The following need to be implemented:
- TypeScript configuration
- Core OAuth client class
- Grant type implementations
- CLI interface
- Testing framework setup
- Linting and formatting configuration