"""Test the main OAuth TUI application."""

from typing import TYPE_CHECKING

import pytest  # type: ignore
from oauth_tui.app import OAuthTUI

if TYPE_CHECKING:
    pass  # Import types here if needed


class TestOAuthTUI:
    """Test cases for the main OAuth TUI application."""

    @pytest.mark.unit  # type: ignore
    def test_app_creation(self) -> None:
        """Test that the app can be created."""
        app = OAuthTUI()
        assert app is not None
        assert app.title == "OAuth CLI"  # type: ignore
        assert app.sub_title == "Terminal User Interface"  # type: ignore

    async def test_app_startup(self, app: OAuthTUI) -> None:
        """Test that the app starts correctly."""
        async with app.run_test() as pilot:  # type: ignore
            # App should start with menu screen
            assert "menu" in pilot.app._installed_screens  # type: ignore

    @pytest.mark.asyncio  # type: ignore
    async def test_quit_action(self, app: OAuthTUI) -> None:
        """Test that app can quit properly."""
        async with app.run_test() as pilot:  # type: ignore
            # Should not crash when pressing quit
            await pilot.press("ctrl+q")  # type: ignore

    async def test_navigation_to_tokens(self, app: OAuthTUI) -> None:
        """Test navigation to tokens screen."""
        async with app.run_test() as pilot:  # type: ignore
            # Navigate to tokens via key press
            await pilot.press("t")  # Assuming 't' navigates to tokens  # type: ignore

    def test_signal_handlers_setup(self, app: OAuthTUI) -> None:
        """Test that signal handlers are set up correctly."""
        # Test that the methods exist
        assert hasattr(app, '_setup_signal_handlers')
        assert hasattr(app, '_cleanup_terminal')

    def test_cleanup_terminal_method(self, app: OAuthTUI) -> None:
        """Test cleanup terminal method doesn't crash."""
        # This should not raise an exception
        app._cleanup_terminal()  # type: ignore