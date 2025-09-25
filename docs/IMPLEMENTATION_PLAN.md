# OAuth Client - SIMPLIFIED Implementation Plan

## Purpose

A simple CLI tool to test OAuth 2.0 endpoints and retrieve access tokens for debugging and verification purposes.

## Core Functionality ONLY

### What This Tool Does

1. **Test OAuth Endpoints** - Verify OAuth configuration works
2. **Get Access Tokens** - Retrieve tokens for testing APIs
3. **Support Common Grant Types** - Client credentials, auth code, device flow
4. **Store Tokens** - Simple encrypted local storage for convenience
5. **Show Token Info** - Decode and display token contents

### What This Tool DOES NOT Do

- Production OAuth infrastructure
- Enterprise security features (mTLS, DPoP, certificate pinning, etc.)
- Complex rate limiting and circuit breakers
- Multi-provider management systems
- Token introspection servers
- FAPI compliance
- WebAuthn integration
- And 90% of the other bloat in the original plan

## Implementation (1-2 weeks MAX)

### Week 1: Core Features

1. **Basic OAuth Client** (2 days)
   - Client credentials grant
   - Authorization code grant with PKCE
   - Simple token refresh

2. **CLI Interface** (1 day)
   - `oauth token` - Get a token
   - `oauth test` - Test OAuth config
   - `oauth decode` - Decode JWT token
   - `oauth list` - List stored tokens
   - `oauth clear` - Clear stored tokens

3. **Token Storage** (1 day)
   - Encrypted local file storage
   - Simple key management

4. **ServiceNow Testing** (1 day)
   - Ensure it works with ServiceNow
   - Add any ServiceNow-specific quirks if needed

### Week 2: Polish & Documentation

1. **Error Handling** - Clear, helpful error messages
2. **Documentation** - Simple README with examples
3. **Tests** - Basic tests for core functionality
4. **Release** - npm package, GitHub release

## File Structure (SIMPLE)

```plain
src/
├── cli/
│   └── index.ts          # CLI commands
├── oauth/
│   ├── client.ts         # Core OAuth client
│   └── grants/           # Grant type implementations
├── storage/
│   └── token-store.ts    # Token storage
└── utils/
    └── logger.ts         # Simple logging
```

## Dependencies (MINIMAL)

- axios - HTTP requests
- commander - CLI framework
- jose - JWT handling
- chalk - Terminal colors
- dotenv - Environment variables

## Success Criteria

1. Can test ServiceNow OAuth in < 30 seconds
2. Can get access token with one command
3. Clear error messages when things fail
4. Works reliably for testing purposes

## What We're REMOVING

- ❌ 17 provider-specific implementations
- ❌ Complex state machines
- ❌ Enterprise security features (mTLS, DPoP, etc.)
- ❌ Rate limiting infrastructure
- ❌ Circuit breakers
- ❌ Token introspection servers
- ❌ Multi-environment management
- ❌ Complex interactive modes
- ❌ Provider registry systems
- ❌ Advanced monitoring
- ❌ FAPI compliance
- ❌ WebAuthn
- ❌ Device authorization grant (unless actually needed)
- ❌ Implicit grant (deprecated)
- ❌ Resource owner password (legacy)

## Keep It Simple

This is a developer utility tool, not an OAuth framework. Think `curl` for OAuth, not "enterprise OAuth platform".

The entire implementation should be < 1000 lines of actual code.
