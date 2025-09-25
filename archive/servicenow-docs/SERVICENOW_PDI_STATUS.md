# ServiceNow OAuth Testing Status

## PDI Configuration Status
✅ System property `glide.oauth.inbound.client.credential.grant_type.enabled` = true
✅ OAuth Applications created with "Integration as a Service" client type
✅ OAuth Application User configured (Stefan Ojebom for OAuth Test 1)

## Test Results
Both OAuth Test 1 and OAuth Test 2 return: **401 Unauthorized - access_denied**

## Missing Configuration - OAuth Entity Profile

Based on the screenshots, you need to configure the **OAuth Entity Profiles** for each OAuth application:

### Steps to Fix:

1. **For OAuth Test 1:**
   - Click on the "OAuth Entity Profiles" tab at the bottom
   - Open the default profile (or create one if missing)
   - Ensure:
     - **Grant type** includes "Client Credentials"
     - **Is default** is checked
     - Profile is **Active**

2. **Configure OAuth Entity Scopes:**
   - In the OAuth Entity Profile, go to "OAuth Entity Scopes" tab
   - Create a new scope:
     - **Name**: useraccount
     - **OAuth scope**: useraccount
   - Save

3. **For OAuth Test 2:**
   - Repeat the same steps

## The Critical Issue

ServiceNow requires THREE layers of configuration for client_credentials:
1. ✅ OAuth Application Registry (you've done this)
2. ❌ **OAuth Entity Profile** (needs grant type = Client Credentials)
3. ❌ **OAuth Entity Scopes** (needs scope mapping)

Without the OAuth Entity Profile properly configured with "Client Credentials" grant type and the OAuth Entity Scopes mapped, ServiceNow returns "access_denied" even with valid credentials.

## Test Commands (will work after configuration)

```bash
# OAuth Test 1
curl -X POST https://dev267474.service-now.com/oauth_token.do \
  -d "grant_type=client_credentials" \
  -d "client_id=59fadc6d0c24031afa3d7f800185112" \
  -d "client_secret=+-pri~-v[~"

# OAuth Test 2
curl -X POST https://dev267474.service-now.com/oauth_token.do \
  -d "grant_type=client_credentials" \
  -d "client_id=34c9baf9dd6a463b99ab4fdd36666e65c" \
  -d "client_secret=E;t#d0POBa"
```

## ServiceNow's Non-Standard OAuth Implementation

This confirms ServiceNow's OAuth is non-standard:
- Standard OAuth 2.0: client_id + client_secret = token ✅
- ServiceNow OAuth: client_id + client_secret + Entity Profile + Entity Scopes + User = token 😤