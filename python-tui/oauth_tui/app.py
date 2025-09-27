"""Main OAuth TUI application."""

import atexit
import signal
import sys

from textual.app import App
from textual.binding import Binding

from .screens.auth import AuthScreen
from .screens.config import ConfigScreen
from .screens.dashboard import DashboardScreen
from .screens.help import HelpScreen
from .screens.inspector import InspectorScreen
from .screens.menu import MenuScreen
from .screens.tokens import TokensScreen
from .services.oauth_client import OAuthClient


def _cleanup_terminal() -> None:
    """Clean up terminal state to prevent control sequence issues."""
    try:
        sys.stdout.write("\033[?1003l\033[?1002l\033[?1000l")
        sys.stdout.flush()
    except Exception:
        pass


atexit.register(_cleanup_terminal)


def _signal_handler(signum: int, frame) -> None:
    """Handle signals with terminal cleanup."""
    _cleanup_terminal()
    sys.exit(0)


signal.signal(signal.SIGINT, _signal_handler)
signal.signal(signal.SIGTERM, _signal_handler)


class OAuthTUI(App):
    """OAuth Terminal User Interface."""

    CSS_PATH = "styles.css"
    TITLE = "OAuth CLI"
    SUB_TITLE = "Terminal User Interface"

    BINDINGS = [
        Binding("ctrl+c", "quit", "Quit", priority=True, show=False),
    ]

    oauth_client: OAuthClient

    def __init__(self, initial_view: str = "menu"):
        """Initialize OAuth TUI.

        Args:
            initial_view: Initial screen to display
        """
        super().__init__()
        self.initial_view = initial_view
        self.oauth_client = OAuthClient()

    def on_mount(self) -> None:
        """Handle mount event."""
        # Install screens
        self.install_screen(MenuScreen(), name="menu")
        self.install_screen(TokensScreen(), name="tokens")
        self.install_screen(DashboardScreen(), name="dashboard")
        self.install_screen(AuthScreen(), name="auth")
        self.install_screen(ConfigScreen(), name="config")
        self.install_screen(InspectorScreen(), name="inspector")
        self.install_screen(HelpScreen(), name="help")

        # Push initial screen
        if self.initial_view == "tokens":
            self.push_screen("tokens")
        else:
            self.push_screen("menu")

    def on_unmount(self) -> None:
        """Handle unmount event with terminal cleanup."""
        _cleanup_terminal()

    def on_exit(self) -> None:
        """Handle app exit and ensure terminal is properly restored."""
        _cleanup_terminal()


def main() -> None:
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="OAuth Terminal User Interface")
    parser.add_argument(
        "--view",
        choices=["menu", "dashboard", "auth", "tokens", "config", "inspect"],
        default="menu",
        help="Initial view to display",
    )

    args = parser.parse_args()

    app = OAuthTUI(initial_view=args.view)
    try:
        app.run()
    finally:
        # Ensure terminal is always cleaned up
        sys.stdout.write("\033[?1003l\033[?1002l\033[?1000l")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
