#!/bin/bash

echo "Testing OAuth with oauth.user credentials"
echo "=========================================="

# Test basic auth to verify user credentials work
echo -e "\n1. Testing basic auth to ServiceNow API..."
curl -X GET "https://dev267474.service-now.com/api/now/table/incident?sysparm_limit=1" \
  -H "Authorization: Basic b2F1dGgudXNlcjpwOXdMNnNtN0VXS0VXQGtYa0U=" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n2. Testing password grant with OAuth Test 2..."
curl -X POST https://dev267474.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=34c9baf9dd6a463b99ab4fdd36666e65c" \
  --data-urlencode "client_secret=E;t#d0POBa" \
  --data-urlencode "username=oauth.user" \
  --data-urlencode "password=p9wL6sm7EWKEW@kXkE" \
  --data-urlencode "scope=useraccount" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n3. Now testing client_credentials after password attempt..."
curl -X POST https://dev267474.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "client_id=34c9baf9dd6a463b99ab4fdd36666e65c" \
  -d "client_secret=E;t#d0POBa" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s