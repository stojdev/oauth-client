# OAuth Client - Simple OAuth Testing Tool

A command-line tool for testing OAuth 2.0 configurations and retrieving access tokens.

## What It Does

This is a simple CLI tool for developers to:

- Test OAuth 2.0 endpoint configurations
- Retrieve access tokens for API testing
- Decode and inspect JWT tokens
- Store tokens locally for convenience

Think of it as `curl` for OAuth - quick, simple, effective.

## Installation

```bash
npm install -g oauth-client
# or
pnpm add -g oauth-client
```

## Quick Start

### Test ServiceNow OAuth (Client Credentials)

```bash
# Get an access token
oauth token client-credentials \
  --token-url https://dev267474.service-now.com/oauth_token.do \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET

# Test with a config file
oauth test servicenow
```

### Authorization Code Flow

```bash
# Start auth code flow
oauth auth google \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --redirect-uri http://localhost:8080/callback
```

### Decode a JWT Token

```bash
# Decode and inspect a token
oauth inspect eyJhbGciOiJSUzI1NiIs...

# Decode from clipboard
oauth inspect
```

### Token Management

```bash
# List stored tokens
oauth list-tokens

# Clear all tokens
oauth clear-tokens

# Refresh a token
oauth refresh google
```

## Configuration

Create a `.oauth-client.json` file:

```json
{
  "providers": {
    "servicenow": {
      "tokenEndpoint": "https://dev267474.service-now.com/oauth_token.do",
      "clientId": "YOUR_CLIENT_ID",
      "clientSecret": "YOUR_CLIENT_SECRET",
      "grantType": "client_credentials"
    }
  }
}
```

Then use:

```bash
oauth test servicenow
```

## Environment Variables

```bash
# Encryption key for token storage
export TOKEN_ENCRYPTION_KEY="your-32-char-key"

# Log level
export LOG_LEVEL="debug"
```

## Common Use Cases

### 1. Test OAuth Configuration

```bash
oauth test-client-credentials \
  --token-url https://api.example.com/oauth/token \
  --client-id test_id \
  --client-secret test_secret
```

### 2. Get Token for API Testing

```bash
TOKEN=$(oauth token client-credentials \
  --token-url $OAUTH_URL \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET \
  --output raw)

curl -H "Authorization: Bearer $TOKEN" https://api.example.com/data
```

### 3. Debug JWT Contents

```bash
oauth inspect $TOKEN --verbose
```

## Features

✅ **Simple** - One command to get a token
✅ **Fast** - No complex setup required
✅ **Secure** - Encrypted local token storage
✅ **Practical** - Built for real-world OAuth testing

## What This Tool Is NOT

- ❌ Not an OAuth server
- ❌ Not a production OAuth library
- ❌ Not an enterprise OAuth platform
- ❌ Not a complex security framework

This is a simple testing tool. Use it to verify your OAuth configs work.

## Support

Currently tested with:

- ServiceNow
- Google OAuth
- Microsoft Azure AD
- Generic OAuth 2.0 providers

## License

ISC
