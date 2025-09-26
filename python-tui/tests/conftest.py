"""Test configuration and fixtures for OAuth TUI tests."""

from typing import Any, Dict
from pathlib import Path
from unittest.mock import Mock

import pytest  # type: ignore

from oauth_tui.app import OAuthTUI
from oauth_tui.services.oauth_client import OAuthClient


@pytest.fixture  # type: ignore
def mock_oauth_service():
    """Mock OAuth service for testing."""
    service = Mock(spec=OAuthClient)
    service.get_tokens.return_value = []
    service.get_providers.return_value = []
    service.delete_token.return_value = True
    return service


@pytest.fixture  # type: ignore
def app() -> OAuthTUI:
    """Create a test OAuth TUI app instance."""
    return OAuthTUI()


@pytest.fixture  # type: ignore
def test_data_dir() -> Path:
    """Path to test data directory."""
    return Path(__file__).parent / "data"


@pytest.fixture  # type: ignore
def sample_token() -> Dict[str, Any]:
    """Sample token data for testing."""
    return {
        "access_token": "sample_access_token",
        "token_type": "bearer",
        "expires_in": 3600,
        "scope": "read write"
    }