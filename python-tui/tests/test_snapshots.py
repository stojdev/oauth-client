"""Snapshot tests for OAuth TUI screens."""

from typing import TYPE_CHECKING, Any

import pytest  # type: ignore

# These tests require pytest-textual-snapshot plugin
# Run: pip install pytest-textual-snapshot

if TYPE_CHECKING:
    pass  # Import types here if needed


@pytest.mark.snapshot  # type: ignore
def test_menu_screen_snapshot(snap_compare: Any) -> None:
    """Test the menu screen appearance."""
    from oauth_tui.app import OAuthTUI
    
    app = OAuthTUI(initial_view="menu")
    assert snap_compare(app, terminal_size=(80, 24))


@pytest.mark.snapshot  # type: ignore  
def test_tokens_screen_snapshot(snap_compare: Any) -> None:
    """Test the tokens screen appearance."""
    from oauth_tui.app import OAuthTUI
    
    app = OAuthTUI(initial_view="tokens")
    assert snap_compare(app, terminal_size=(80, 24))


@pytest.mark.snapshot  # type: ignore  
def test_menu_screen_with_interaction(snap_compare: Any) -> None:
    """Test menu screen after key presses."""
    from oauth_tui.app import OAuthTUI
    
    app = OAuthTUI(initial_view="menu")
    # Test with arrow key navigation
    assert snap_compare(app, press=["down", "up"], terminal_size=(80, 24))


@pytest.mark.snapshot  # type: ignore
def test_app_help_state(snap_compare: Any) -> None:
    """Test app in help state."""
    from oauth_tui.app import OAuthTUI
    
    app = OAuthTUI()
    # Press '?' to show help
    assert snap_compare(app, press=["question_mark"], terminal_size=(80, 30))


@pytest.mark.snapshot  # type: ignore
def test_custom_setup_before_snapshot(snap_compare: Any) -> None:
    """Test with custom setup before screenshot."""
    from oauth_tui.app import OAuthTUI
    
    app = OAuthTUI()

    async def setup_app(pilot: Any) -> None:
        """Custom setup before taking snapshot."""
        await pilot.press("tab")  # Focus next element  # type: ignore
        # Could add more custom setup here

    assert snap_compare(app, run_before=setup_app, terminal_size=(80, 24))