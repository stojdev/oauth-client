"""Main menu screen for OAuth TUI."""

from textual.app import ComposeResult
from textual.containers import Container, Vertical
from textual.screen import Screen
from textual.widgets import Button, Footer, Header, Static


class MenuScreen(Screen):
    """Main menu screen with navigation options."""

    BINDINGS = [
        ("t", "view_tokens", "Tokens"),
        ("a", "authenticate", "Auth"),
        ("c", "configure", "Config"),
        ("q", "quit_app", "Quit"),
    ]

    CSS = """
    MenuScreen {
        align: center middle;
    }

    #menu-container {
        width: 60;
        height: auto;
        border: solid $primary;
        background: $surface;
        padding: 2;
    }

    #title {
        text-align: center;
        color: $accent;
        text-style: bold;
        margin-bottom: 2;
    }

    #subtitle {
        text-align: center;
        color: $text-muted;
        margin-bottom: 3;
    }

    Button {
        width: 100%;
        margin-bottom: 1;
    }
    """

    def compose(self) -> ComposeResult:
        """Compose the menu screen layout."""
        yield Header(show_clock=True)

        with Container(id="menu-container"):
            yield Static("🔐 OAuth CLI", id="title")
            yield Static("Terminal User Interface", id="subtitle")

            with Vertical():
                yield Button("📊 Dashboard", id="dashboard", variant="primary")
                yield Button("🔐 Authenticate", id="auth")
                yield Button("🎫 View Tokens", id="tokens")
                yield Button("⚙️  Configuration", id="config")
                yield Button("🔍 Inspect Token", id="inspect")
                yield Button("❓ Help", id="help")
                yield Button("❌ Exit", id="exit", variant="error")

        yield Footer()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press events."""
        button_id = event.button.id

        if button_id == "exit":
            self.app.exit()
        elif button_id == "tokens":
            self.app.push_screen("tokens")
        elif button_id == "auth":
            self.app.push_screen("auth")
        elif button_id == "config":
            self.app.push_screen("config")
        elif button_id == "inspect":
            self.app.push_screen("inspector")
        elif button_id == "dashboard":
            self.app.push_screen("dashboard")
        elif button_id == "help":
            self.app.push_screen("help")

    def action_view_tokens(self) -> None:
        """Navigate to tokens screen."""
        self.app.push_screen("tokens")

    def action_authenticate(self) -> None:
        """Navigate to auth screen."""
        self.app.push_screen("auth")

    def action_configure(self) -> None:
        """Navigate to config screen."""
        self.app.push_screen("config")

    def action_quit_app(self) -> None:
        """Exit the application."""
        self.app.exit()
