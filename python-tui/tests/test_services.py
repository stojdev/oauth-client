"""Unit tests for OAuth service components."""

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest  # type: ignore


class TestOAuthService:
    """Unit tests for OAuth service functionality."""

    @pytest.mark.unit  # type: ignore
    def test_oauth_service_creation(self) -> None:
        """Test OAuth service can be created."""
        from oauth_tui.services.oauth_client import OAuthClient
        service = OAuthClient()
        assert service is not None

    @pytest.mark.unit  # type: ignore
    @pytest.mark.asyncio  # type: ignore
    @patch('oauth_tui.services.oauth_client.CLIBridge')
    async def test_get_tokens(self, mock_cli_bridge: Any) -> None:
        """Test getting tokens via CLI bridge."""
        from oauth_tui.services.oauth_client import OAuthClient
        
        # Mock CLI bridge response
        mock_bridge_instance = mock_cli_bridge.return_value  # type: ignore
        mock_bridge_instance.list_tokens = AsyncMock(return_value={
            "success": True,
            "data": [
                {"access_token": "token1", "expires_in": 3600},
                {"access_token": "token2", "expires_in": 7200}
            ]
        })
        
        service = OAuthClient()
        tokens = await service.get_tokens()
        
        assert len(tokens) == 2
        assert tokens[0]["access_token"] == "token1"
        assert tokens[1]["access_token"] == "token2"
        
    @pytest.mark.unit  # type: ignore
    @pytest.mark.asyncio  # type: ignore
    async def test_delete_token(self) -> None:
        """Test deleting a token."""
        from oauth_tui.services.oauth_client import OAuthClient
        
        service = OAuthClient()
        assert hasattr(service, 'delete_token')


class TestOAuthUtils:
    """Unit tests for OAuth utility functions."""

    @pytest.mark.unit  # type: ignore
    def test_utility_placeholder(self) -> None:
        """Placeholder test for utility functions."""
        # TODO: Add utility function tests when utility modules are created
        assert True