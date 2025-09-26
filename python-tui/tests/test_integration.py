"""Integration tests for OAuth TUI application workflow."""

from typing import TYPE_CHECKING, Any
from unittest.mock import patch

import pytest  # type: ignore

if TYPE_CHECKING:
    from oauth_tui.app import OAuthTUI


class TestOAuthTUIIntegration:
    """Integration tests for complete OAuth TUI workflow."""

    @pytest.mark.integration  # type: ignore
    async def test_complete_token_workflow(self, app: "OAuthTUI", mock_oauth_service: Any) -> None:
        """Test complete token management workflow."""
        async with app.run_test() as pilot:  # type: ignore
            # Start at menu
            assert "menu" in pilot.app._installed_screens  # type: ignore

            # Navigate to tokens screen
            await pilot.press("t")  # Assuming 't' goes to tokens  # type: ignore

            # Wait for tokens to load
            await pilot.pause()  # type: ignore

            # Test token list interaction
            await pilot.press("down")  # Navigate token list  # type: ignore
            await pilot.press("enter")  # Select token  # type: ignore

    @pytest.mark.integration  # type: ignore
    async def test_error_handling_workflow(self, app: "OAuthTUI") -> None:
        """Test error handling in various scenarios."""
        with patch('oauth_tui.services.oauth_client.OAuthClient') as mock_service:
            # Mock service to raise an exception
            mock_service.side_effect = Exception("Network error")
            
            async with app.run_test() as pilot:  # type: ignore
                # Navigate to a screen that would trigger the service
                await pilot.press("t")  # type: ignore
                await pilot.pause()  # type: ignore
                
                # Verify error is handled gracefully
                # (Add specific error handling assertions)

    @pytest.mark.integration  # type: ignore
    async def test_keyboard_navigation(self, app: "OAuthTUI") -> None:
        """Test comprehensive keyboard navigation."""
        async with app.run_test() as pilot:  # type: ignore
            # Test various key combinations
            navigation_keys = [
                "tab",      # Focus next
                "shift+tab", # Focus previous  
                "enter",    # Activate
                "escape",   # Go back
                "down",     # Navigate down
                "up",       # Navigate up
            ]
            
            for key in navigation_keys:
                await pilot.press(key)  # type: ignore
                await pilot.pause(0.1)  # Small pause between keys  # type: ignore
                
                # Verify app doesn't crash
                assert pilot.app.is_running  # type: ignore

    @pytest.mark.integration  # type: ignore
    async def test_screen_transitions(self, app: "OAuthTUI") -> None:
        """Test transitions between different screens."""
        async with app.run_test() as pilot:  # type: ignore
            # Define expected screen flow
            screen_flow = [
                ("menu", "t", "tokens"),      # menu -> tokens
                ("tokens", "escape", "menu"), # tokens -> menu
                # Add more screen transitions as needed
            ]
            
            for _from_screen, key, _to_screen in screen_flow:
                # Verify current screen
                # Note: Adjust based on how your app tracks screens
                
                await pilot.press(key)  # type: ignore
                await pilot.pause()  # type: ignore
                
                # Verify transition occurred
                # Add specific assertions based on your screen logic