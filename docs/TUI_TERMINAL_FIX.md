# TUI Terminal Control Sequence Fix

## Problem

When working with the OAuth TUI application, moving the mouse after running the TUI causes strange control sequences to appear in the terminal prompt. This happens because:

1. **Mouse Reporting**: Textual/TUI applications enable mouse reporting in the terminal
2. **Incomplete Cleanup**: When the TUI exits (normally or abnormally), terminal state isn't always properly restored
3. **Persistent State**: Mouse tracking and other terminal features remain active after TUI exit

## Symptoms

- Strange codes appearing in terminal after using the TUI
- Mouse movements causing characters to appear in command prompt
- Terminal behaves abnormally after TUI usage

## Solution

### 1. Enhanced TUI Application

Modified `python-tui/oauth_tui/app.py` and `python-tui/oauth_tui/__main__.py` to include:

- **Signal Handlers**: Proper cleanup on SIGINT/SIGTERM
- **Terminal Reset**: Disable mouse tracking and reset terminal state
- **Exit Hooks**: Cleanup on both normal and abnormal exit

### 2. Emergency Reset Scripts

Created reset scripts to restore terminal state:

**Python script:**

```bash
python3 python-tui/reset-terminal.py
```

**Shell script (faster):**

```bash
./reset-terminal.sh
```

Both scripts will reset the terminal and disable mouse tracking.

### 3. Manual Reset Commands

If the script doesn't work, you can manually reset your terminal:

```bash
# Reset terminal sequences
printf '\033[?1000l\033[?1002l\033[?1003l\033[?1006l\033[?1015l\033[?25h\033[c\033[0m'

# Or use the reset command
reset

# Or start a new shell
exec zsh
```

## ANSI Escape Sequences Used

| Sequence | Purpose |
|----------|---------|
| `\033[?1000l` | Disable mouse tracking |
| `\033[?1002l` | Disable cell motion mouse tracking |
| `\033[?1003l` | Disable all mouse tracking |
| `\033[?1006l` | Disable SGR mouse mode |
| `\033[?1015l` | Disable urxvt mouse mode |
| `\033[?25h` | Show cursor |
| `\033[c` | Reset terminal |
| `\033[0m` | Reset colors and attributes |

## Prevention

The modifications ensure:

1. **Graceful Exit**: Terminal is reset on normal exit
2. **Signal Handling**: Terminal is reset on Ctrl+C, kill signals
3. **Exception Handling**: Terminal is reset even if TUI crashes
4. **Automatic Cleanup**: `atexit` handlers ensure cleanup runs

## Testing

Test the fix by:

1. Running the TUI application
2. Exiting normally (or abnormally with Ctrl+C)
3. Moving mouse in terminal - should not produce strange characters
4. If issues persist, run the reset script

## Files Modified

- `python-tui/oauth_tui/app.py` - Added terminal cleanup methods
- `python-tui/oauth_tui/__main__.py` - Added exit handlers  
- `python-tui/reset-terminal.py` - Emergency reset script (new file)
- `reset-terminal.sh` - Shell reset script (new file)
- `TUI_TERMINAL_FIX.md` - This documentation (new file)
