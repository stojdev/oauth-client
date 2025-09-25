#!/bin/bash

# Example: Get an access token from ServiceNow OAuth endpoint
# This script demonstrates how to use the oauth CLI tool

# ServiceNow OAuth Configuration
TOKEN_URL="https://dev267474.service-now.com/oauth_token.do"
CLIENT_ID="59fa6cf2dec24031afa3d7f800185112"
CLIENT_SECRET="+-pri~-v[~"

echo "Getting OAuth access token from ServiceNow..."

# Get the token (suppress logs with 2>/dev/null, take only last line which is the token)
TOKEN=$(oauth token client-credentials \
  --token-url "$TOKEN_URL" \
  --client-id "$CLIENT_ID" \
  --client-secret "$CLIENT_SECRET" \
  --output raw 2>/dev/null | tail -n 1)

if [ $? -eq 0 ]; then
  echo "✅ Successfully retrieved access token!"
  echo "Token (first 50 chars): ${TOKEN:0:50}..."

  # Example: Use the token with curl
  # curl -H "Authorization: Bearer $TOKEN" https://api.example.com/data
else
  echo "❌ Failed to retrieve token"
  exit 1
fi