# OAuth Test Providers for Testing

## Quick Setup Options (No Account Needed)

### 1. **OAuth Playground by OAuth.com**

- URL: <https://www.oauth.com/playground/>
- Features: Interactive OAuth testing
- Grant Types: Authorization Code, Client Credentials
- Setup: Instant, no registration

### 2. **Mocklab OAuth Mock Server**

- URL: <https://oauth.mocklab.io/>
- Features: Mock OAuth server for testing
- Grant Types: All standard types
- Setup: Free tier available

## Real Providers (Free Account Required)

### 3. **Auth0 (Recommended)**

```bash
# Sign up at: https://auth0.com (free tier)
# Quick setup - you'll get:
# - Domain: your-tenant.auth0.com
# - Client ID & Secret from dashboard

# Test with our CLI:
node dist/cli.cjs token client_credentials \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url https://YOUR_TENANT.auth0.com/oauth/token \
  --scope "read:users"
```

### 4. **GitHub OAuth**

```bash
# Create OAuth App at: https://github.com/settings/developers
# Note: GitHub doesn't support client_credentials, use authorization_code

# For testing device flow (easiest):
node dist/cli.cjs token device \
  --client-id YOUR_GITHUB_CLIENT_ID \
  --device-authorization-url https://github.com/login/device/code \
  --token-url https://github.com/login/oauth/access_token
```

### 5. **Google OAuth**

```bash
# Setup at: https://console.cloud.google.com/
# Create credentials > OAuth 2.0 Client ID

# Test with service account (client_credentials equivalent):
node dist/cli.cjs token client_credentials \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url https://oauth2.googleapis.com/token
```

### 6. **Microsoft Azure AD**

```bash
# Setup at: https://portal.azure.com/
# App registrations > New registration

# Test client credentials:
node dist/cli.cjs token client_credentials \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token \
  --scope "https://graph.microsoft.com/.default"
```

## Quick Test Without Setup

### Using a Mock Server

Let's create a simple mock OAuth server for testing:

```javascript
// mock-oauth-server.js
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

app.post('/token', (req, res) => {
  if (req.body.grant_type === 'client_credentials' &&
      req.body.client_id === 'test_client' &&
      req.body.client_secret === 'test_secret') {
    res.json({
      access_token: 'mock_token_' + Date.now(),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: req.body.scope || 'read write'
    });
  } else {
    res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid credentials'
    });
  }
});

app.listen(3000, () => {
  console.log('Mock OAuth server running on http://localhost:3000');
});
```

## Recommended: Start with Auth0

Auth0 is the easiest to set up:

1. Go to <https://auth0.com> and sign up (free)
2. Create a new API in the dashboard
3. Create a Machine-to-Machine application
4. You'll get credentials immediately
5. Test with our CLI:

```bash
node dist/cli.cjs token client_credentials \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url https://YOUR_TENANT.auth0.com/oauth/token \
  --scope "read:users" \
  --output json
```

This will give you a real OAuth token that actually works!
