"""Entry point for OAuth TUI."""

import atexit
import sys

from .app import OAuthTUI


def cleanup_terminal() -> None:
    """Ensure terminal is properly reset on exit."""
    try:
        # Reset terminal state
        sys.stdout.flush()
    except Exception:
        pass


def main() -> None:
    """Run the OAuth TUI application."""
    # Register cleanup function to run on exit
    atexit.register(cleanup_terminal)

    try:
        app = OAuthTUI()
        app.run()
    except KeyboardInterrupt:
        cleanup_terminal()
        sys.exit(0)
    except Exception:
        cleanup_terminal()
        sys.exit(1)
    finally:
        cleanup_terminal()


if __name__ == "__main__":
    main()
