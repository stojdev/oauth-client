"""Help screen for OAuth TUI."""

from textual.app import ComposeResult
from textual.containers import Container, Vertical
from textual.screen import Screen
from textual.widgets import Button, Footer, Header, Static


class HelpScreen(Screen):
    """Help screen with usage information."""

    BINDINGS = [
        ("escape", "back", "Back"),
    ]

    def compose(self) -> ComposeResult:
        """Compose the help screen layout."""
        yield Header(show_clock=True)

        with Container():
            yield Static("❓ Help", classes="screen-title")

            with Vertical():
                yield Static("\nKeyboard Shortcuts:")
                yield Static("  • Arrow keys - Navigate menu items")
                yield Static("  • Enter - Select item")
                yield Static("  • Escape - Go back")
                yield Static("  • Ctrl+Q or Ctrl+C - Quit application")
                yield Static("  • ? - Show this help screen")
                yield Static("\nNavigation:")
                yield Static("  • Use the menu to access different features")
                yield Static("  • Press Escape to return to the main menu")

            yield Button("← Back to Menu", id="back", variant="primary")

        yield Footer()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press events."""
        if event.button.id == "back":
            self.app.pop_screen()

    def action_back(self) -> None:
        """Go back to previous screen."""
        self.app.pop_screen()
