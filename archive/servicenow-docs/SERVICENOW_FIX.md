# ServiceNow OAuth Client Credentials Fix

## The Issue
Client Type is set to "-- None --" which prevents client_credentials grant from working.

## The Solution
In the OAuth Application Registry for "ojeste":
1. Change **Client Type** from "-- None --" to **"Integration as a Service"**
2. Save the record
3. The client_credentials grant should then work

## Why This Works
- "Integration as a Service" is ServiceNow's term for what OAuth 2.0 calls a "Confidential Client"
- This type is designed for system-to-system integrations
- It allows the OAuth client to authenticate using only client_id and client_secret

## Test Command
Once Client Type is set to "Integration as a Service", this should work:

```bash
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "client_id=0d08b5c2bed86dd05132321f2ba1dc3e" \
  -d "client_secret=b7QWIjmkXI" \
  -d "scope=useraccount"
```

## Expected Result
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "scope": "useraccount"
}
```