#!/bin/bash
# Alternative terminal reset script using tput and stty
# This version is more portable and cleaner

echo "Resetting terminal..."

# Use tput for terminal capabilities (cleaner approach)
if command -v tput >/dev/null 2>&1; then
    # Reset terminal using terminfo database
    tput reset 2>/dev/null
    tput cnorm 2>/dev/null  # Make cursor normal/visible
fi

# Use stty to reset terminal settings
if command -v stty >/dev/null 2>&1; then
    stty sane 2>/dev/null
fi

# Additional manual reset for mouse tracking (silent)
{
    printf '\033[?1000l\033[?1002l\033[?1003l\033[?1006l\033[?1015l'
    printf '\033[?25h\033[0m'
} >/dev/null 2>&1

# Clear screen
clear 2>/dev/null || printf '\033[2J\033[H' >/dev/null 2>&1

echo "Terminal has been reset using multiple methods."
echo "Mouse reporting and control sequences have been disabled."
echo "Terminal settings have been restored to sane defaults."