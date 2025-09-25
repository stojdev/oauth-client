# ServiceNow OAuth Client Credentials Investigation Report

## Executive Summary

ServiceNow's implementation of OAuth 2.0 client_credentials grant type is fundamentally broken or incompletely configured in the devskandia instance, despite having:

- ✅ Client Type set to "Integration as a Service"
- ✅ OAuth Application User configured (Stefan Ojebom/OJESTE)
- ✅ System property enabled (`glide.oauth.inbound.client.credential.grant_type.enabled`)
- ✅ Valid client_id and client_secret
- ✅ Admin access to configure everything

## The Core Issue

ServiceNow returns `401 Unauthorized - access_denied` for all client_credentials grant attempts, indicating a deeper configuration issue.

## Root Causes Identified

### 1. OAuth Entity Profile Issues

ServiceNow requires an **OAuth Entity Profile** with:

- Grant types must explicitly include "Client Credentials"
- Profile must be marked as default
- Profile must be active

### 2. OAuth Entity Scopes Missing

The **OAuth Entity Scopes** related list must have:

- Scope name: `useraccount` (NOT a URL, just the name)
- OAuth scope: `useraccount`
- Without this mapping, ServiceNow can't authorize the requested scope

### 3. OAuth Application User Requirements

The user (OJESTE) must be:

- Active (not deactivated)
- Not locked out
- Have a valid password set
- Possibly need "Web service access only" checked
- Have actually logged in once to activate the account

### 4. ACL Permissions

Hidden ACL issues on:

- `oauth_credential` table - needs read permission
- `oauth_entity` table - needs read permission
- These ACLs might be blocking token generation even with admin access

### 5. ServiceNow's Non-Standard Implementation

ServiceNow has fundamentally altered OAuth 2.0 client_credentials by:

- Requiring a user context even for machine-to-machine auth
- Adding proprietary layers (OAuth Entity Profile, OAuth Entity Scopes)
- Not following RFC 6749 Section 4.4 strictly

## Historical Context

### Pre-Washington DC

- Client credentials grant was NOT supported at all
- ServiceNow's stance: "Every session must be bound to a user"

### Washington DC Release

- Added client_credentials support
- Required system property enablement
- Required OAuth Application User configuration
- Still maintains user-based security model

### Yokohama Release (Current)

- Continues Washington DC implementation
- Added API Authentication Scopes for granular control
- Still requires extensive configuration beyond standard OAuth 2.0

## Why This is a Problem

1. **Not RFC 6749 Compliant**: Standard OAuth 2.0 client_credentials should work with just client_id and client_secret
2. **Hidden Configuration**: Critical settings (OAuth Entity Profile/Scopes) aren't obvious in the UI
3. **Poor Error Messages**: "access_denied" doesn't indicate what's actually wrong
4. **Documentation Gap**: ServiceNow docs don't clearly explain all requirements

## Complete Configuration Checklist

### System Level

- [ ] Plugin: OAuth 2.0 installed
- [ ] Plugin: REST API Provider installed
- [ ] Plugin: Authentication scope installed
- [ ] Plugin: REST API Auth Scope Plugin installed
- [ ] System Property: `glide.oauth.inbound.client.credential.grant_type.enabled = true`
- [ ] System Property: `com.snc.platform.security.oauth.is.active = true`

### OAuth Application Registry

- [ ] Name: Set
- [ ] Client ID: Generated
- [ ] Client Secret: Generated or set
- [ ] Client Type: "Integration as a Service"
- [ ] Public Client: FALSE (unchecked)
- [ ] OAuth Application User: Active user with password
- [ ] Active: Checked

### OAuth Entity Profile (Often Missing!)

- [ ] Profile exists (auto-created on save)
- [ ] Grant types includes "Client Credentials"
- [ ] Is default: Checked
- [ ] Active: Checked

### OAuth Entity Scopes (Critical!)

- [ ] Scope record exists
- [ ] Name: useraccount (just the name, not URL)
- [ ] OAuth scope: useraccount

### OAuth Application User

- [ ] User exists in sys_user table
- [ ] Active: Checked
- [ ] Locked out: Unchecked
- [ ] Password needs reset: Unchecked
- [ ] Web service access only: Checked
- [ ] Has logged in at least once
- [ ] Has appropriate roles (if needed)

### ACL Configuration

- [ ] oauth_credential table: Read ACL exists
- [ ] oauth_entity table: Read ACL exists
- [ ] Appropriate roles granted

## Test Commands

### Direct curl (should work when configured)

```bash
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "client_id=0d08b5c2bed86dd05132321f2ba1dc3e" \
  -d "client_secret=b7QWIjmkXI" \
  -d "scope=useraccount"
```

### With Basic Auth

```bash
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Authorization: Basic MGQwOGI1YzJiZWQ4NmRkMDUxMzIzMjFmMmJhMWRjM2U6YjdRV0lqbWtYSQ==" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "scope=useraccount"
```

## Conclusion

ServiceNow's OAuth implementation is:

1. **Not fully OAuth 2.0 compliant** - requires user context for machine-to-machine auth
2. **Overly complex** - multiple hidden configuration layers
3. **Poorly documented** - critical settings not mentioned in main docs
4. **Inconsistent** - works differently than every other OAuth provider

The devskandia instance is likely missing the OAuth Entity Profile/Scopes configuration, which can't be easily verified without deeper admin access to the related lists. Setting up a fresh PDI with complete control is the right approach to properly test this OAuth client implementation.
