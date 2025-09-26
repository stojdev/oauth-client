"""Tokens management screen."""

from datetime import datetime
from typing import TYPE_CHECKING, Any, cast

from textual import on, work
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.reactive import reactive
from textual.screen import Screen
from textual.widgets import Button, DataTable, Footer, Header, LoadingIndicator, Static

if TYPE_CHECKING:
    from ..app import OAuthTUI


class TokensScreen(Screen):
    """Screen for viewing and managing OAuth tokens."""

    BINDINGS = [
        Binding("escape", "app.pop_screen", "Back"),
        ("r", "refresh", "Refresh"),
        ("d", "delete_token", "Delete"),
        ("c", "copy_token", "Copy"),
        ("v", "view_details", "View Details"),
    ]

    CSS = """
    TokensScreen {
        background: $surface;
    }

    #tokens-container {
        width: 100%;
        height: 100%;
        padding: 1;
    }

    #header-text {
        text-align: center;
        text-style: bold;
        color: $accent;
        margin-bottom: 1;
    }

    #status-bar {
        height: auto;
        margin-bottom: 1;
        padding: 0 1;
    }

    #status-text {
        color: $text-muted;
    }

    #loading-container {
        height: auto;
        text-align: center;
        margin: 2;
    }

    #no-tokens {
        text-align: center;
        color: $text-muted;
        margin: 2;
    }

    DataTable {
        height: 1fr;
        margin-bottom: 1;
    }

    #button-bar {
        height: auto;
        padding: 1;
    }

    Button {
        margin-right: 1;
    }

    .error {
        color: $error;
        text-style: bold;
    }

    .success {
        color: $success;
        text-style: bold;
    }
    """

    # Reactive attributes for state management
    loading: reactive[bool] = reactive(False)
    tokens: reactive[list[dict[str, Any]]] = reactive([])
    selected_token_index: reactive[int | None] = reactive(None)

    def compose(self) -> ComposeResult:
        """Compose the tokens screen layout."""
        yield Header(show_clock=True)

        with Container(id="tokens-container"):
            yield Static("🎫 Stored OAuth Tokens", id="header-text")

            # Status bar
            with Horizontal(id="status-bar"):
                yield Static("", id="status-text")
                loading = LoadingIndicator(id="loading")
                loading.display = False
                yield loading

            # DataTable for tokens
            table: DataTable = DataTable(id="tokens-table")
            table.cursor_type = "row"
            table.zebra_stripes = True
            yield table

            # Button bar
            with Horizontal(id="button-bar"):
                yield Button("Refresh", id="refresh", variant="primary")
                yield Button("View Details", id="details")
                yield Button("Copy Token", id="copy")
                yield Button("Delete", id="delete", variant="error")
                yield Button("Back", id="back")

        yield Footer()

    def on_mount(self) -> None:
        """Load tokens when screen is mounted."""
        self.load_tokens()

    def watch_loading(self, loading: bool) -> None:
        """React to loading state changes."""
        loading_indicator = self.query_one("#loading", LoadingIndicator)
        loading_indicator.display = loading

        # Update status text
        status_text = self.query_one("#status-text", Static)
        if loading:
            status_text.update("Loading tokens...")
        else:
            token_count = len(self.tokens)
            if token_count == 0:
                status_text.update("No tokens found")
            else:
                status_text.update(f"{token_count} token{'s' if token_count != 1 else ''} loaded")

    def watch_tokens(self, tokens: list[dict[str, Any]]) -> None:
        """React to tokens list changes."""
        self.update_table()

    def update_table(self) -> None:
        """Update the tokens table display."""
        table = self.query_one("#tokens-table", DataTable)
        table.clear(columns=True)

        # Add columns
        table.add_columns("Provider", "Type", "Status", "Expires", "Scopes")

        if not self.tokens:
            table.add_row("No tokens stored", "-", "-", "-", "-")
            return

        for _i, token in enumerate(self.tokens):
            provider = token.get("provider", "Unknown")
            token_type = token.get("token_type", "Bearer")

            # Determine token status
            expires_at = token.get("expires_at")
            status = "Active"
            expires_display = "N/A"

            if expires_at:
                try:
                    # Parse expiration time
                    if isinstance(expires_at, (int, float)):
                        # Unix timestamp
                        exp_time = datetime.fromtimestamp(expires_at)
                    else:
                        # ISO string
                        exp_time = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))

                    now = datetime.now(exp_time.tzinfo) if exp_time.tzinfo else datetime.now()

                    if exp_time <= now:
                        status = "Expired"
                    else:
                        # Calculate remaining time
                        remaining = exp_time - now
                        if remaining.days > 0:
                            expires_display = f"{remaining.days}d {remaining.seconds // 3600}h"
                        elif remaining.seconds > 3600:
                            expires_display = (
                                f"{remaining.seconds // 3600}h {(remaining.seconds % 3600) // 60}m"
                            )
                        else:
                            expires_display = f"{remaining.seconds // 60}m"

                except (ValueError, OSError):
                    expires_display = str(expires_at)

            scopes = token.get("scope", "N/A")
            if isinstance(scopes, list):
                scopes = " ".join(scopes)

            table.add_row(provider, token_type, status, expires_display, str(scopes))

    @work(exclusive=True)
    async def load_tokens(self) -> None:
        """Load and display tokens from the OAuth CLI."""
        self.loading = True
        try:
            oauth_client = cast("OAuthTUI", self.app).oauth_client
            tokens = await oauth_client.get_tokens()
            self.tokens = tokens
            self.notify(f"Loaded {len(tokens)} tokens", severity="information")
        except Exception as e:
            self.notify(f"Error loading tokens: {str(e)}", severity="error")
            self.tokens = []
        finally:
            self.loading = False

    @on(Button.Pressed, "#refresh")
    def on_refresh_pressed(self) -> None:
        """Handle refresh button press."""
        self.load_tokens()

    @on(Button.Pressed, "#back")
    def on_back_pressed(self) -> None:
        """Handle back button press."""
        self.app.pop_screen()

    @on(Button.Pressed, "#details")
    def on_details_pressed(self) -> None:
        """Handle view details button press."""
        self.action_view_details()

    @on(Button.Pressed, "#copy")
    def on_copy_pressed(self) -> None:
        """Handle copy button press."""
        self.action_copy_token()

    @on(Button.Pressed, "#delete")
    def on_delete_pressed(self) -> None:
        """Handle delete button press."""
        self.action_delete_token()

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection in the tokens table."""
        if self.tokens and event.cursor_row < len(self.tokens):
            self.selected_token_index = event.cursor_row

    def get_selected_token(self) -> dict[str, Any] | None:
        """Get the currently selected token."""
        table = self.query_one("#tokens-table", DataTable)
        if table.cursor_row is not None and self.tokens:
            if 0 <= table.cursor_row < len(self.tokens):
                return self.tokens[table.cursor_row]
        return None

    def action_refresh(self) -> None:
        """Refresh the tokens list."""
        self.load_tokens()

    def action_view_details(self) -> None:
        """View details of the selected token."""
        token = self.get_selected_token()
        if not token:
            self.notify("No token selected", severity="warning")
            return

        # Format token details for display
        details = []
        details.append(f"Provider: {token.get('provider', 'Unknown')}")
        details.append(f"Token Type: {token.get('token_type', 'Bearer')}")

        if "access_token" in token:
            access_token = token["access_token"]
            # Show truncated token for security
            if len(access_token) > 20:
                details.append(f"Access Token: {access_token[:10]}...{access_token[-10:]}")
            else:
                details.append(f"Access Token: {access_token}")

        if "refresh_token" in token:
            refresh_token = token["refresh_token"]
            if len(refresh_token) > 20:
                details.append(f"Refresh Token: {refresh_token[:10]}...{refresh_token[-10:]}")
            else:
                details.append(f"Refresh Token: {refresh_token}")

        if "expires_at" in token:
            details.append(f"Expires At: {token['expires_at']}")

        if "scope" in token:
            details.append(f"Scopes: {token['scope']}")

        # Show additional fields
        for key, value in token.items():
            if key not in [
                "provider",
                "token_type",
                "access_token",
                "refresh_token",
                "expires_at",
                "scope",
            ]:
                details.append(f"{key.title()}: {value}")

        details_text = "\n".join(details)
        self.notify(f"Token Details:\n{details_text}", timeout=10)

    def action_copy_token(self) -> None:
        """Copy the selected token to clipboard."""
        token = self.get_selected_token()
        if not token:
            self.notify("No token selected", severity="warning")
            return

        access_token = token.get("access_token")
        if not access_token:
            self.notify("No access token found", severity="warning")
            return

        # In a real implementation, this would copy to clipboard
        # For now, just show a notification
        self.notify("Token copied to clipboard (simulated)", severity="information")

    @work(exclusive=True)
    async def delete_selected_token(self) -> None:
        """Delete the selected token."""
        token = self.get_selected_token()
        if not token:
            self.notify("No token selected", severity="warning")
            return

        provider = token.get("provider", "Unknown")

        try:
            oauth_client = cast("OAuthTUI", self.app).oauth_client
            success = await oauth_client.delete_token(provider)

            if success:
                self.notify(f"Token for {provider} deleted successfully", severity="information")
                self.load_tokens()  # Reload the tokens list
            else:
                self.notify(f"Failed to delete token for {provider}", severity="error")
        except Exception as e:
            self.notify(f"Error deleting token: {str(e)}", severity="error")

    def action_delete_token(self) -> None:
        """Delete the selected token."""
        token = self.get_selected_token()
        if not token:
            self.notify("No token selected", severity="warning")
            return

        provider = token.get("provider", "Unknown")

        # Show confirmation
        def confirm_delete(result: bool | None) -> None:
            if result:
                self.delete_selected_token()

        self.app.push_screen(
            ConfirmationScreen(f"Delete token for {provider}?", "This action cannot be undone."),
            confirm_delete,
        )


class ConfirmationScreen(Screen):
    """Simple confirmation dialog screen."""

    def __init__(self, title: str, message: str) -> None:
        super().__init__()
        self._dialog_title = title
        self.message = message

    BINDINGS = [
        Binding("escape", "cancel", "Cancel"),
        Binding("y", "confirm", "Yes"),
        Binding("n", "cancel", "No"),
    ]

    CSS = """
    ConfirmationScreen {
        align: center middle;
    }

    #dialog {
        width: 50;
        height: auto;
        background: $surface;
        border: thick $primary;
        padding: 2;
    }

    #title {
        text-align: center;
        text-style: bold;
        color: $warning;
        margin-bottom: 1;
    }

    #message {
        text-align: center;
        margin-bottom: 2;
    }

    #buttons {
        width: 100%;
        height: auto;
    }

    Button {
        width: 1fr;
        margin-right: 1;
    }
    """

    def compose(self) -> ComposeResult:
        with Container(id="dialog"):
            yield Static(self._dialog_title, id="title")
            yield Static(self.message, id="message")
            with Horizontal(id="buttons"):
                yield Button("Yes", id="yes", variant="error")
                yield Button("No", id="no", variant="primary")

    @on(Button.Pressed, "#yes")
    def on_yes_pressed(self) -> None:
        self.dismiss(True)

    @on(Button.Pressed, "#no")
    def on_no_pressed(self) -> None:
        self.dismiss(False)

    def action_confirm(self) -> None:
        self.dismiss(True)

    def action_cancel(self) -> None:
        self.dismiss(False)
