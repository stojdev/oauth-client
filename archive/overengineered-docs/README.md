# OAuth Test Client

A Node.js and TypeScript-based OAuth 2.0 test client for testing and verifying Access Token retrieval from OAuth providers using all standard grant types.

## Project Goal

This project aims to create a comprehensive OAuth 2.0 test client that can authenticate with various OAuth providers and retrieve Access Tokens using all standard OAuth 2.0 grant types. The primary purpose is to provide a reliable testing tool for validating OAuth implementations and provider configurations.

## Purpose

The OAuth test client serves as a verification tool to:

- **Test OAuth Provider Configurations**: Validate that OAuth providers are correctly configured and responding to authentication requests
- **Verify Grant Type Support**: Ensure that all standard OAuth 2.0 grant types are working as expected
- **Debug Authentication Flows**: Provide detailed logging and error reporting for troubleshooting OAuth issues
- **Development Testing**: Support development teams in testing their applications against various OAuth providers

## Supported OAuth 2.0 Grant Types

This client will support all standard OAuth 2.0 grant types:

### 1. Authorization Code Grant

- **Use Case**: Web applications with server-side code
- **Flow**: Redirect user to authorization server → receive authorization code → exchange code for access token
- **Security**: Most secure grant type with PKCE support

### 2. Client Credentials Grant

- **Use Case**: Machine-to-machine authentication
- **Flow**: Direct token request using client credentials
- **Security**: Suitable for trusted clients with secure credential storage

### 3. Resource Owner Password Credentials Grant

- **Use Case**: Trusted applications (legacy support)
- **Flow**: Direct authentication using username/password
- **Security**: Less secure, recommended only for migration scenarios

### 4. Implicit Grant (Legacy)

- **Use Case**: Single-page applications (deprecated in OAuth 2.1)
- **Flow**: Direct token response without authorization code
- **Security**: Less secure, replaced by Authorization Code + PKCE

### 5. Device Authorization Grant (RFC 8628)

- **Use Case**: Devices with limited input capabilities
- **Flow**: Device displays user code → user authorizes on another device
- **Security**: Suitable for IoT devices and smart TVs

### 6. Refresh Token Grant

- **Use Case**: Token renewal without user interaction
- **Flow**: Exchange refresh token for new access token
- **Security**: Enables long-term access with short-lived tokens

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm
- **HTTP Client**: Axios (planned)
- **Testing**: Jest (planned)
- **Code Quality**: ESLint + Prettier (planned)

## Features (Planned)

- ✅ **Multi-Provider Support**: Configure multiple OAuth providers
- ✅ **Comprehensive Logging**: Detailed request/response logging for debugging
- ✅ **Token Management**: Secure storage and management of tokens
- ✅ **PKCE Support**: Proof Key for Code Exchange for enhanced security
- ✅ **Configuration Management**: Easy provider configuration via JSON/YAML
- ✅ **CLI Interface**: Command-line interface for easy testing
- ✅ **Error Handling**: Comprehensive error reporting and handling
- ✅ **Token Validation**: Validate token format and expiration
- ✅ **Scope Testing**: Test different OAuth scopes

## Getting Started

> **Note**: This project is currently in development. Setup instructions will be updated as the project progresses.

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd oauth-client

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run the client
pnpm start
```

## Configuration

The client will support configuration through environment variables and configuration files to specify:

- OAuth provider endpoints
- Client credentials
- Redirect URIs
- Scopes
- Grant types to test

## Usage Examples

> **Note**: Usage examples will be added as the implementation progresses.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Roadmap

- [ ] Core OAuth client implementation
- [ ] Authorization Code Grant support
- [ ] Client Credentials Grant support
- [ ] PKCE implementation
- [ ] Configuration management
- [ ] CLI interface
- [ ] Token storage and management
- [ ] Comprehensive testing suite
- [ ] Documentation and examples
- [ ] Additional grant types support

---

**Disclaimer**: This tool is intended for testing and development purposes only. Ensure proper security practices when using with production OAuth providers.
