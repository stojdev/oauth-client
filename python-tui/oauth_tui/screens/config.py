"""Configuration screen for OAuth TUI."""

from typing import TYPE_CHECKING, Any, cast

from textual import on, work
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.reactive import reactive
from textual.screen import ModalScreen, Screen
from textual.validation import Length, ValidationResult, Validator
from textual.widgets import (
    Button,
    DataTable,
    Footer,
    Header,
    Input,
    Label,
    LoadingIndicator,
    Select,
    Static,
)

if TYPE_CHECKING:
    from ..app import OAuthTUI


class URLValidator(Validator):
    """Validator for URL fields."""

    def validate(self, value: str) -> ValidationResult:
        """Validate that the value is a proper URL."""
        if not value:
            return self.failure("URL cannot be empty")

        if not (value.startswith("http://") or value.startswith("https://")):
            return self.failure("URL must start with http:// or https://")

        return self.success()


class ProviderEditModal(ModalScreen):
    """Modal screen for editing provider configurations."""

    def __init__(self, provider_data: dict[str, Any] | None = None, is_edit: bool = False):
        super().__init__()
        self.provider_data = provider_data or {}
        self.is_edit = is_edit
        self._modal_title = "Edit Provider" if is_edit else "Add Provider"

    BINDINGS = [
        Binding("escape", "cancel", "Cancel"),
        Binding("ctrl+s", "save", "Save"),
    ]

    CSS = """
    ProviderEditModal {
        align: center middle;
    }

    #modal-container {
        width: 80;
        height: auto;
        background: $surface;
        border: thick $primary;
        padding: 2;
    }

    #modal-title {
        text-align: center;
        text-style: bold;
        color: $accent;
        margin-bottom: 2;
    }

    .form-field {
        margin-bottom: 1;
    }

    .form-label {
        color: $text;
        text-style: bold;
        margin-bottom: 1;
    }

    Input {
        width: 100%;
    }

    Select {
        width: 100%;
    }

    #button-bar {
        height: auto;
        margin-top: 2;
    }

    Button {
        margin-right: 1;
        width: 1fr;
    }
    """

    def compose(self) -> ComposeResult:
        with Container(id="modal-container"):
            yield Static(self._modal_title, id="modal-title")

            # Provider form fields
            yield Label("Provider Name:", classes="form-label")
            provider_input = Input(
                placeholder="e.g., my-oauth-provider",
                id="provider_name",
                validators=[Length(minimum=1)],
            )
            if self.provider_data.get("name"):
                provider_input.value = self.provider_data["name"]
            yield provider_input

            yield Label("Provider Type:", classes="form-label")
            type_select = Select(
                [
                    ("Generic OAuth 2.0", "generic"),
                    ("Google", "google"),
                    ("Microsoft", "microsoft"),
                    ("GitHub", "github"),
                    ("Auth0", "auth0"),
                    ("Okta", "okta"),
                ],
                id="provider_type",
            )
            yield type_select

            yield Label("Authorization URL:", classes="form-label")
            auth_url_input = Input(
                placeholder="https://example.com/oauth/authorize",
                id="auth_url",
                validators=[URLValidator()],
            )
            if self.provider_data.get("auth_url"):
                auth_url_input.value = self.provider_data["auth_url"]
            yield auth_url_input

            yield Label("Token URL:", classes="form-label")
            token_url_input = Input(
                placeholder="https://example.com/oauth/token",
                id="token_url",
                validators=[URLValidator()],
            )
            if self.provider_data.get("token_url"):
                token_url_input.value = self.provider_data["token_url"]
            yield token_url_input

            yield Label("Client ID:", classes="form-label")
            client_id_input = Input(
                placeholder="Your OAuth client ID", id="client_id", validators=[Length(minimum=1)]
            )
            if self.provider_data.get("client_id"):
                client_id_input.value = self.provider_data["client_id"]
            yield client_id_input

            yield Label("Client Secret:", classes="form-label")
            client_secret_input = Input(
                placeholder="Your OAuth client secret", password=True, id="client_secret"
            )
            if self.provider_data.get("client_secret"):
                client_secret_input.value = self.provider_data["client_secret"]
            yield client_secret_input

            yield Label("Default Scopes:", classes="form-label")
            scopes_input = Input(placeholder="read write admin (space-separated)", id="scopes")
            if self.provider_data.get("scopes"):
                scopes_input.value = self.provider_data["scopes"]
            yield scopes_input

            # Button bar
            with Horizontal(id="button-bar"):
                yield Button("Save", id="save", variant="primary")
                yield Button("Cancel", id="cancel")

    @on(Button.Pressed, "#save")
    def on_save_pressed(self) -> None:
        """Handle save button press."""
        self.action_save()

    @on(Button.Pressed, "#cancel")
    def on_cancel_pressed(self) -> None:
        """Handle cancel button press."""
        self.action_cancel()

    @on(Select.Changed, "#provider_type")
    def on_provider_type_changed(self, event: Select.Changed) -> None:
        """Handle provider type selection to populate default URLs."""
        provider_type = event.value

        # Set default URLs based on provider type
        auth_url_input = self.query_one("#auth_url", Input)
        token_url_input = self.query_one("#token_url", Input)

        if provider_type == "google":
            auth_url_input.value = "https://accounts.google.com/o/oauth2/v2/auth"
            token_url_input.value = "https://oauth2.googleapis.com/token"
        elif provider_type == "microsoft":
            auth_url_input.value = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
            token_url_input.value = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        elif provider_type == "github":
            auth_url_input.value = "https://github.com/login/oauth/authorize"
            token_url_input.value = "https://github.com/login/oauth/access_token"

    def get_form_data(self) -> dict[str, str] | None:
        """Get form data."""
        try:
            return {
                "name": self.query_one("#provider_name", Input).value.strip(),
                "type": str(self.query_one("#provider_type", Select).value or ""),
                "auth_url": self.query_one("#auth_url", Input).value.strip(),
                "token_url": self.query_one("#token_url", Input).value.strip(),
                "client_id": self.query_one("#client_id", Input).value.strip(),
                "client_secret": self.query_one("#client_secret", Input).value.strip(),
                "scopes": self.query_one("#scopes", Input).value.strip(),
            }
        except Exception:
            return None

    def validate_form_data(self, data: dict[str, str]) -> bool:
        """Validate the form data."""
        if not data.get("name"):
            self.notify("Provider name is required", severity="error")
            return False

        if not data.get("auth_url"):
            self.notify("Authorization URL is required", severity="error")
            return False

        if not data.get("token_url"):
            self.notify("Token URL is required", severity="error")
            return False

        if not data.get("client_id"):
            self.notify("Client ID is required", severity="error")
            return False

        return True

    def action_save(self) -> None:
        """Save the provider configuration."""
        data = self.get_form_data()
        if data and self.validate_form_data(data):
            self.dismiss(data)

    def action_cancel(self) -> None:
        """Cancel the operation."""
        self.dismiss(None)


class ConfigScreen(Screen):
    """Configuration screen for OAuth providers."""

    BINDINGS = [
        Binding("escape", "back", "Back"),
        ("a", "add_provider", "Add"),
        ("e", "edit_provider", "Edit"),
        ("d", "delete_provider", "Delete"),
        ("r", "refresh", "Refresh"),
    ]

    CSS = """
    ConfigScreen {
        background: $surface;
    }

    #config-container {
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

    .success {
        color: $success;
        text-style: bold;
    }

    .error {
        color: $error;
        text-style: bold;
    }
    """

    # Reactive attributes for state management
    loading: reactive[bool] = reactive(False)
    providers: reactive[list[dict[str, Any]]] = reactive([])
    selected_provider_index: reactive[int | None] = reactive(None)

    def compose(self) -> ComposeResult:
        """Compose the config screen layout."""
        yield Header(show_clock=True)

        with Container(id="config-container"):
            yield Static("⚙️ Provider Configuration", id="header-text")

            # Status bar
            with Horizontal(id="status-bar"):
                yield Static("", id="status-text")
                loading = LoadingIndicator(id="loading")
                loading.display = False
                yield loading

            # DataTable for providers
            table: DataTable = DataTable(id="providers-table")
            table.cursor_type = "row"
            table.zebra_stripes = True
            yield table

            # Button bar
            with Horizontal(id="button-bar"):
                yield Button("Add Provider", id="add", variant="primary")
                yield Button("Edit", id="edit")
                yield Button("Delete", id="delete", variant="error")
                yield Button("Refresh", id="refresh")
                yield Button("Back", id="back")

        yield Footer()

    def on_mount(self) -> None:
        """Load providers when screen is mounted."""
        self.load_providers()

    def watch_loading(self, loading: bool) -> None:
        """React to loading state changes."""
        loading_indicator = self.query_one("#loading", LoadingIndicator)
        loading_indicator.display = loading

        # Update status text
        status_text = self.query_one("#status-text", Static)
        if loading:
            status_text.update("Loading providers...")
        else:
            provider_count = len(self.providers)
            if provider_count == 0:
                status_text.update("No providers configured")
            else:
                status_text.update(
                    f"{provider_count} provider{'s' if provider_count != 1 else ''} configured"
                )

    def watch_providers(self, providers: list[dict[str, Any]]) -> None:
        """React to providers list changes."""
        self.update_table()

    def update_table(self) -> None:
        """Update the providers table display."""
        table = self.query_one("#providers-table", DataTable)
        table.clear(columns=True)

        # Add columns
        table.add_columns("Name", "Type", "Status", "Auth URL", "Token URL")

        if not self.providers:
            table.add_row("No providers configured", "-", "-", "-", "-")
            return

        for provider in self.providers:
            name = provider.get("name", "Unknown")
            provider_type = provider.get("type", "generic").title()

            # Determine status (simplified - could check if credentials are set)
            status = "Configured" if provider.get("client_id") else "Incomplete"

            auth_url = provider.get("auth_url", "N/A")
            token_url = provider.get("token_url", "N/A")

            # Truncate URLs for display
            if len(auth_url) > 40:
                auth_url = auth_url[:37] + "..."
            if len(token_url) > 40:
                token_url = token_url[:37] + "..."

            table.add_row(name, provider_type, status, auth_url, token_url)

    @work(exclusive=True)
    async def load_providers(self) -> None:
        """Load and display providers from the OAuth CLI."""
        self.loading = True
        try:
            oauth_client = cast("OAuthTUI", self.app).oauth_client
            providers = await oauth_client.get_providers()
            self.providers = providers
            self.notify(f"Loaded {len(providers)} providers", severity="information")
        except Exception as e:
            self.notify(f"Error loading providers: {str(e)}", severity="error")
            self.providers = []
        finally:
            self.loading = False

    @on(Button.Pressed, "#add")
    def on_add_pressed(self) -> None:
        """Handle add provider button press."""
        self.action_add_provider()

    @on(Button.Pressed, "#edit")
    def on_edit_pressed(self) -> None:
        """Handle edit provider button press."""
        self.action_edit_provider()

    @on(Button.Pressed, "#delete")
    def on_delete_pressed(self) -> None:
        """Handle delete provider button press."""
        self.action_delete_provider()

    @on(Button.Pressed, "#refresh")
    def on_refresh_pressed(self) -> None:
        """Handle refresh button press."""
        self.load_providers()

    @on(Button.Pressed, "#back")
    def on_back_pressed(self) -> None:
        """Handle back button press."""
        self.app.pop_screen()

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection in the providers table."""
        if self.providers and event.cursor_row < len(self.providers):
            self.selected_provider_index = event.cursor_row

    def get_selected_provider(self) -> dict[str, Any] | None:
        """Get the currently selected provider."""
        table = self.query_one("#providers-table", DataTable)
        if table.cursor_row is not None and self.providers:
            if 0 <= table.cursor_row < len(self.providers):
                return self.providers[table.cursor_row]
        return None

    def action_add_provider(self) -> None:
        """Add a new provider."""

        def handle_result(result: dict[str, Any] | None) -> None:
            if result:
                # In a real implementation, this would save to configuration
                # For now, we'll add to our local list and show success
                self.providers = self.providers + [result]
                self.notify(
                    f"Provider '{result['name']}' added successfully",
                    severity="information",
                )

        self.app.push_screen(ProviderEditModal(), handle_result)

    def action_edit_provider(self) -> None:
        """Edit the selected provider."""
        provider = self.get_selected_provider()
        if not provider:
            self.notify("No provider selected", severity="warning")
            return

        def handle_result(result: dict[str, Any] | None) -> None:
            if result:
                # Update the provider in our list
                if self.selected_provider_index is not None:
                    providers_copy = list(self.providers)
                    providers_copy[self.selected_provider_index] = result
                    self.providers = providers_copy
                    self.notify(
                        f"Provider '{result['name']}' updated successfully", severity="information"
                    )

        self.app.push_screen(ProviderEditModal(provider, is_edit=True), handle_result)

    def action_delete_provider(self) -> None:
        """Delete the selected provider."""
        provider = self.get_selected_provider()
        if not provider:
            self.notify("No provider selected", severity="warning")
            return

        provider_name = provider.get("name", "Unknown")

        def confirm_delete(result: bool | None) -> None:
            if result and self.selected_provider_index is not None:
                # Remove from our list
                providers_copy = list(self.providers)
                del providers_copy[self.selected_provider_index]
                self.providers = providers_copy
                self.notify(
                    f"Provider '{provider_name}' deleted successfully",
                    severity="information",
                )

        # Import the confirmation screen from tokens.py
        from .tokens import ConfirmationScreen

        self.app.push_screen(
            ConfirmationScreen(
                f"Delete provider '{provider_name}'?",
                "This action cannot be undone. All associated configurations will be lost.",
            ),
            confirm_delete,
        )

    def action_refresh(self) -> None:
        """Refresh the providers list."""
        self.load_providers()

    def action_back(self) -> None:
        """Go back to previous screen."""
        self.app.pop_screen()
