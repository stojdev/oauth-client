#!/usr/bin/env python3
"""
Emergency terminal reset script.
Run this if your terminal gets stuck with mouse control sequences.
"""

import sys


def reset_terminal():
    """Reset terminal to normal state."""
    try:
        # Send terminal reset sequences
        sequences = [
            "\033[?1000l",  # Disable mouse tracking
            "\033[?1002l",  # Disable cell motion mouse tracking
            "\033[?1003l",  # Disable all mouse tracking
            "\033[?1006l",  # Disable SGR mouse mode
            "\033[?1015l",  # Disable urxvt mouse mode
            "\033[?25h",  # Show cursor
            "\033[c",  # Reset terminal
            "\033[0m",  # Reset colors and attributes
            "\033[2J",  # Clear screen
            "\033[H",  # Move cursor to home position
        ]

        for _seq in sequences:
            pass

        sys.stdout.flush()

    except Exception:
        sys.exit(1)


if __name__ == "__main__":
    reset_terminal()
