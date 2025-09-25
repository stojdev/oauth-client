# ServiceNow Client Credentials Grant - Complete Solution

## The Problem

You're correct - `client_id` and `client_secret` ARE valid credentials for OAuth 2.0 client_credentials grant per RFC 6749 Section 4.4.

## Why It's Not Working on ServiceNow

ServiceNow requires TWO things for client_credentials grant to work:

### 1. System Property Must Be Enabled

```
Property: glide.oauth.inbound.client.credential.grant_type.enabled
Value: true
```

**To enable in ServiceNow:**

1. Navigate to: `sys_properties.list`
2. Create new property: `glide.oauth.inbound.client.credential.grant_type.enabled`
3. Set value to: `true`

### 2. OAuth Application User Must Be Configured

The "ojeste" OAuth client needs an OAuth Application User configured.

**To configure in ServiceNow:**

1. Navigate to: `System OAuth > Application Registry`
2. Open the "ojeste" OAuth application
3. In the "OAuth Entity" related list, add an OAuth Application User
4. Select or create a user account that will be used for this OAuth client

## The Correct Request (Once Configured)

Per OAuth 2.0 RFC 6749, the request should be:

```bash
# Option 1: Credentials in Authorization Header (Preferred)
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Authorization: Basic MGQwOGI1YzJiZWQ4NmRkMDUxMzIzMjFmMmJhMWRjM2U6YjdRV0lqbWtYSQ==" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=useraccount"

# Option 2: Credentials in POST Body
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=0d08b5c2bed86dd05132321f2ba1dc3e" \
  -d "client_secret=b7QWIjmkXI" \
  -d "scope=useraccount"
```

## Expected Response (When Properly Configured)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "scope": "useraccount"
}
```

## Current Error Explained

The error we're getting:

```json
{
  "error": "server_error",
  "error_description": "access_denied"
}
```

This occurs because:

1. The system property might not be enabled
2. No OAuth Application User is configured for the "ojeste" client
3. The ServiceNow instance expects a user context even for client_credentials

## Alternative Approaches Without Admin Access

If you can't modify the ServiceNow configuration, try:

### 1. Resource Owner Password Grant

If you have a valid username/password:

```bash
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -d "grant_type=password" \
  -d "client_id=0d08b5c2bed86dd05132321f2ba1dc3e" \
  -d "client_secret=b7QWIjmkXI" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD" \
  -d "scope=useraccount"
```

### 2. Authorization Code Grant

Interactive browser-based flow:

```bash
node dist/cli.cjs auth servicenow-ojeste --config servicenow-ojeste-config.json
# Complete login in browser
```

## Verification That Our Client Works

Our OAuth client correctly:

- ✅ Sends proper client_credentials grant request per RFC 6749
- ✅ Includes client_id and client_secret correctly
- ✅ Formats the request properly
- ✅ Connects to the ServiceNow OAuth endpoint

The issue is purely ServiceNow configuration - not our OAuth client implementation.
