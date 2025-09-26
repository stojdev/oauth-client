#!/bin/bash
# Test script to verify terminal cleanup after TUI crash

echo "Testing terminal cleanup after TUI app exit..."
echo ""
echo "This script will:"
echo "1. Launch the TUI app"
echo "2. Automatically send Ctrl+C after 2 seconds"
echo "3. Check if mouse tracking is disabled"
echo ""
echo "Press Enter to start the test..."
read -r

# Launch TUI and send Ctrl+C after 2 seconds
(sleep 2 && pkill -INT -f "python.*oauth-tui") &
cd python-tui && ./venv/bin/python -m oauth_tui

echo ""
echo "Test complete. Move your mouse - it should NOT generate escape sequences."
echo "If you see escape sequences when moving the mouse, the cleanup failed."
echo "Otherwise, the cleanup is working correctly!"