# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULES for Claude Code when working with this repository

### The GOLDEN RULE that governs all other rules: ALWAYS prioritize code quality, security, ZERO mock functionality, TODO:s (except where mock functionality makes sense in test cases etc.) and adherence to best practices above all else

The codebase must be of the highest quality, secure, production ready and free of mock implementations and TODOs. Any code that does not meet these standards must be refactored or removed.

### The Number ONE rule that cannot, ever, be broken: Frequently run the pnpm quality-gate command to ensure code quality and consistency

There are NO, NONE, ZERO exceptions to this rule. Code that does not pass the quality gate is dead code and MUST be fixed or DELETED.

### Rule Nuber TWO: Always use any suitable installed Claude Code Agents to assist in code generation, refactoring, and analysis as well as MCP Servers to ALWAYS use current best practices

### Rule Number THREE Always adhere to the established coding standards and project structure as defined in the IMPLEMENTATION_PLAN.md file. Consistency is key to maintainability

There are NO exceptions to this rule. Any deviation from the established standards must be corrected immediately.

### Rule Number FOUR: Prioritize security and best practices in all implementations. Never compromise on security features

Security is paramount. Any code that introduces vulnerabilities or deviates from best practices must be flagged and
corrected immediately.

### Rule Number FIVE: Ensure all code is well-documented and includes comprehensive comments explaining the purpose and functionality of complex sections

Documentation is essential for maintainability. Any complex logic must be clearly explained in comments.

### Rule Number SIX: Do not use console.log/warn/error for logging. Use the established logging utility in src/utils/logger.ts

### RULE Number SEVEN: ZERO tolerance for mock implementations. All code must be fully implemented and functional. Except for tests, which may use mocks as appropriate

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

# Lint code (TypeScript)
pnpm lint
pnpm lint:fix

# Lint markdown
pnpm lint:md
pnpm lint:md:fix

# Format code (TypeScript)
pnpm format

# Type check (TypeScript)
pnpm typecheck

# Python linting and formatting
pnpm python:lint
pnpm python:lint:fix

# Python type checking
pnpm python:typecheck

# Quality gate checks (runs all quality checks)
pnpm quality-gate        # Full check: typecheck, lint, format, python checks, build
pnpm quality-gate:quick  # Quick check: typecheck, lint only (TS + Python)

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

```plain
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
- Secure token storage mechanism with AES-256-GCM encryption
- Environment-based encryption key management (TOKEN_ENCRYPTION_KEY)
- Key derivation function (KDF) support for password-based keys
- Comprehensive error handling for OAuth errors

### Configuration

- Support for multiple OAuth providers
- Configuration via JSON/YAML files
- Environment variable support for sensitive credentials
- **IMPORTANT**: Set TOKEN_ENCRYPTION_KEY environment variable for production deployments

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
