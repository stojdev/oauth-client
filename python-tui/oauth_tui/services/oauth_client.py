"""OAuth client service for high-level operations."""

from typing import Any

from .cli_bridge import CLIBridge


class OAuthClient:
    """High-level interface to OAuth operations."""

    def __init__(self) -> None:
        """Initialize OAuth client with CLI bridge."""
        self.bridge = CLIBridge()

    async def get_tokens(self) -> list[dict[str, Any]]:
        """
        Get all stored tokens.

        Returns:
            List of token dictionaries
        """
        result = await self.bridge.list_tokens()
        if result["success"] and isinstance(result["data"], list):
            return result["data"]
        return []

    async def get_providers(self) -> list[dict[str, Any]]:
        """
        Get all configured providers.

        Returns:
            List of provider configuration dictionaries
        """
        result = await self.bridge.list_providers()
        if result["success"] and isinstance(result["data"], list):
            return result["data"]
        return []

    async def delete_token(self, provider: str) -> bool:
        """
        Delete token for a specific provider.

        Args:
            provider: Provider name

        Returns:
            True if successful
        """
        result = await self.bridge.clear_tokens(provider)
        return bool(result["success"])

    async def delete_all_tokens(self) -> bool:
        """
        Delete all stored tokens.

        Returns:
            True if successful
        """
        result = await self.bridge.clear_tokens()
        return bool(result["success"])

    async def authenticate_client_credentials(
        self,
        provider: str,
        client_id: str,
        client_secret: str,
        token_url: str,
        scopes: str | None = None,
    ) -> dict[str, Any]:
        """
        Authenticate using client credentials flow.

        Args:
            provider: Provider name
            client_id: OAuth client ID
            client_secret: OAuth client secret
            token_url: Token endpoint URL
            scopes: Optional space-separated scopes

        Returns:
            Result dictionary with token data
        """
        return await self.bridge.test_client_credentials(
            provider, client_id, client_secret, token_url, scopes
        )
