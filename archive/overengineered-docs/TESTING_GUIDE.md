# OAuth 2.0 Test Client - Testing Guide

## Purpose
This is an OAuth 2.0 test client for **testing and verifying Access Token retrieval** from OAuth providers.

## Quick Start Testing

### 1. Build the Client
```bash
pnpm install
pnpm build
```

### 2. Test Token Retrieval

#### Option A: Client Credentials (Machine-to-Machine)
The simplest test - no user interaction required:

```bash
# Using real credentials
node dist/cli.cjs token client_credentials \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url https://oauth.provider.com/token \
  --scope "read write"
```

#### Option B: Authorization Code (User Login)
Test with user authentication:

```bash
# Configure provider first
node dist/cli.cjs auth google \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET
```

### 3. Verify Token Retrieval
```bash
# List retrieved tokens
node dist/cli.cjs tokens:list

# Inspect a token
node dist/cli.cjs inspect YOUR_TOKEN

# Test refresh
node dist/cli.cjs refresh google
```

## Testing with Popular Providers

### Google
```bash
# 1. Get credentials from: https://console.cloud.google.com/
# 2. Test discovery
node dist/cli.cjs discover https://accounts.google.com

# 3. Test authentication
node dist/cli.cjs auth google \
  --client-id YOUR_GOOGLE_CLIENT_ID \
  --client-secret YOUR_GOOGLE_CLIENT_SECRET
```

### GitHub
```bash
# 1. Get credentials from: https://github.com/settings/developers
# 2. Test with device flow (no redirect needed)
node dist/cli.cjs token device_code \
  --client-id YOUR_GITHUB_CLIENT_ID \
  --device-authorization-url https://github.com/login/device/code
```

### Microsoft
```bash
# 1. Get credentials from: https://portal.azure.com/
# 2. Test discovery
node dist/cli.cjs discover https://login.microsoftonline.com/common/v2.0

# 3. Test authentication
node dist/cli.cjs auth microsoft \
  --client-id YOUR_AZURE_CLIENT_ID \
  --client-secret YOUR_AZURE_CLIENT_SECRET
```

## Core Test Cases

### ✅ What This Client Tests

1. **Token Retrieval** - Can we get an access token?
2. **Token Validation** - Is the token properly formatted?
3. **Token Refresh** - Can we refresh expired tokens?
4. **Token Revocation** - Can we revoke tokens?
5. **Grant Types** - Do all OAuth 2.0 flows work?
6. **Provider Discovery** - Can we auto-configure from discovery?
7. **Security Features** - PKCE, state validation, secure storage

### 📊 Success Metrics

- **Token Retrieved**: `access_token` present in response
- **Valid Format**: Token follows OAuth 2.0 spec
- **Refresh Works**: New token obtained with refresh_token
- **Secure**: PKCE used, state validated, tokens encrypted

## Automated Testing

### Run Provider Tests
```bash
# Test specific provider
node dist/cli.cjs test google --client-id ID --client-secret SECRET

# Test all configured providers
node dist/cli.cjs test all --config oauth-config.json
```

### Check Token Operations
```bash
# Simple retrieval test
./test-cli.sh

# Full token lifecycle
node test-token-retrieval.js
```

## Troubleshooting

### Token Retrieval Fails
1. Check credentials are correct
2. Verify redirect URI matches registration
3. Check scopes are valid for provider
4. Enable debug logging: `LOG_LEVEL=debug`

### Common Issues
- **"Invalid client"** - Wrong client ID/secret
- **"Invalid grant"** - Token expired or revoked
- **"Invalid scope"** - Provider doesn't support requested scope
- **"Redirect URI mismatch"** - URI doesn't match app registration

## What This Is NOT

This is a **test client**, not a production OAuth library. It's designed to:
- ✅ Test OAuth provider implementations
- ✅ Verify token retrieval works
- ✅ Debug OAuth configuration issues
- ❌ NOT for production authentication
- ❌ NOT a complete OAuth server
- ❌ NOT an identity management system

## The Bottom Line

**Does it retrieve access tokens?** If yes, it's working. That's the core purpose.