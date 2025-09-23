#!/bin/bash

# ServiceNow OAuth Testing Script
# Using the credentials from the screenshot

CLIENT_ID="5051cfd32fb664108e8a54c006a49865"
CLIENT_SECRET="fdbef6df1bfa6490c7b90c25464bcbad"
SCOPE="useraccount"

echo "======================================"
echo "ServiceNow OAuth Token Retrieval Test"
echo "======================================"
echo ""
echo "Client ID: $CLIENT_ID"
echo "Scope: $SCOPE"
echo ""

# Check if instance name is provided
if [ -z "$1" ]; then
    echo "❌ Error: ServiceNow instance name required!"
    echo ""
    echo "Usage: ./test-servicenow.sh <instance-name>"
    echo ""
    echo "Example:"
    echo "  ./test-servicenow.sh mycompany"
    echo ""
    echo "This will test: https://mycompany.service-now.com/oauth_token.do"
    exit 1
fi

INSTANCE_NAME=$1
TOKEN_URL="https://${INSTANCE_NAME}.service-now.com/oauth_token.do"

echo "Testing instance: $TOKEN_URL"
echo ""
echo "======================================"
echo "Test 1: Client Credentials Grant"
echo "======================================"

# Test with our CLI
node dist/cli.cjs token client_credentials \
    --client-id "$CLIENT_ID" \
    --client-secret "$CLIENT_SECRET" \
    --token-url "$TOKEN_URL" \
    --scope "$SCOPE" \
    --output json

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS: Access token retrieved from ServiceNow!"
    echo ""
    echo "You can now:"
    echo "1. List tokens: node dist/cli.cjs tokens:list"
    echo "2. Inspect token: node dist/cli.cjs inspect <token>"
    echo "3. Use token to call ServiceNow REST APIs"
else
    echo ""
    echo "❌ Failed to retrieve token."
    echo ""
    echo "Possible issues:"
    echo "1. Wrong instance name (should be the subdomain of your ServiceNow URL)"
    echo "2. Client credentials may have been rotated"
    echo "3. OAuth might not be enabled on this instance"
    echo "4. Network/firewall blocking the request"
    echo ""
    echo "Try with debug logging:"
    echo "LOG_LEVEL=debug ./test-servicenow.sh $INSTANCE_NAME"
fi

echo ""
echo "======================================"
echo "Alternative ServiceNow OAuth endpoints to try:"
echo "======================================"
echo ""
echo "1. OAuth 2.0 endpoint: https://${INSTANCE_NAME}.service-now.com/oauth_token.do"
echo "2. Token endpoint: https://${INSTANCE_NAME}.service-now.com/oauth/oauth_token"
echo "3. API namespace: https://${INSTANCE_NAME}.service-now.com/api/now/oauth/token"
echo ""