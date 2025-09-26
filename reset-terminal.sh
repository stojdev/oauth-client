#!/bin/bash
# Emergency terminal reset script
# Run this if your terminal gets stuck with mouse control sequences

echo "Resetting terminal..."

# Send terminal reset sequences (redirecting to prevent visible output)
{
    printf '\033[?1000l'  # Disable mouse tracking
    printf '\033[?1002l'  # Disable cell motion mouse tracking  
    printf '\033[?1003l'  # Disable all mouse tracking
    printf '\033[?1006l'  # Disable SGR mouse mode
    printf '\033[?1015l'  # Disable urxvt mouse mode
    printf '\033[?25h'    # Show cursor
    printf '\033[c'       # Reset terminal
    printf '\033[0m'      # Reset colors and attributes
    printf '\033[2J'      # Clear screen
    printf '\033[H'       # Move cursor to home position
} 2>/dev/null

echo ""
echo "Terminal has been reset."
echo "Mouse reporting and control sequences have been disabled."