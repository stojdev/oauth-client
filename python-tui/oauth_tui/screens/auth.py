"""Authentication screen for OAuth TUI."""

from typing import TYPE_CHECKING, cast

from textual import on, work
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.reactive import reactive
from textual.screen import Screen
from textual.validation import Length, ValidationResult, Validator
from textual.widgets import (
    Button,
    Footer,
    Header,
    Input,
    Label,
    LoadingIndicator,
    Static,
    TabbedContent,
    TabPane,
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


class AuthScreen(Screen):
    """Authentication screen for OAuth flows."""

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("ctrl+s", "submit_form", "Submit"),
        Binding("tab", "focus_next", "Next Field"),
        Binding("shift+tab", "focus_previous", "Previous Field"),
    ]

    CSS = """
    AuthScreen {
        background: $surface;
    }

    #auth-container {
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

    TabbedContent {
        height: 1fr;
    }

    .form-container {
        height: 100%;
        padding: 1;
    }

    .form-field {
        margin-bottom: 1;
    }

    .form-label {
        margin-bottom: 1;
        color: $text;
        text-style: bold;
    }

    Input {
        width: 100%;
    }

    Select {
        width: 100%;
    }

    #button-bar {
        height: auto;
        padding: 1;
        margin-top: 1;
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

    .warning {
        color: $warning;
        text-style: bold;
    }

    LoadingIndicator {
        margin: 0 1;
    }
    """

    # Reactive attributes for state management
    loading: reactive[bool] = reactive(False)
    current_flow: reactive[str] = reactive("client_credentials")

    def compose(self) -> ComposeResult:
        """Compose the auth screen layout."""
        yield Header(show_clock=True)

        with Container(id="auth-container"):
            yield Static("🔐 OAuth Authentication", id="header-text")

            # Status bar
            with Horizontal(id="status-bar"):
                yield Static("Select an OAuth flow and fill in the details", id="status-text")
                loading = LoadingIndicator(id="loading")
                loading.display = False
                yield loading

            # Tabbed content for different OAuth flows
            with TabbedContent():
                with TabPane("Client Credentials", id="client_credentials"):
                    yield self.create_client_credentials_form()

                with TabPane("Authorization Code", id="authorization_code"):
                    yield self.create_authorization_code_form()

                with TabPane("Device Flow", id="device_flow"):
                    yield self.create_device_flow_form()

            # Button bar
            with Horizontal(id="button-bar"):
                yield Button("Authenticate", id="submit", variant="primary")
                yield Button("Clear Form", id="clear")
                yield Button("Test Connection", id="test")
                yield Button("Back", id="back")

        yield Footer()

    def create_client_credentials_form(self) -> Container:
        """Create the client credentials flow form."""
        return Container(
            Label("Provider Name:", classes="form-label"),
            Input(
                placeholder="e.g., my-oauth-provider",
                id="cc_provider",
                validators=[Length(minimum=1)],
            ),
            Label("Client ID:", classes="form-label"),
            Input(
                placeholder="Your OAuth client ID",
                id="cc_client_id",
                validators=[Length(minimum=1)],
            ),
            Label("Client Secret:", classes="form-label"),
            Input(
                placeholder="Your OAuth client secret",
                password=True,
                id="cc_client_secret",
                validators=[Length(minimum=1)],
            ),
            Label("Token URL:", classes="form-label"),
            Input(
                placeholder="https://example.com/oauth/token",
                id="cc_token_url",
                validators=[URLValidator()],
            ),
            Label("Scopes (optional):", classes="form-label"),
            Input(placeholder="read write admin (space-separated)", id="cc_scopes"),
            classes="form-container",
        )

    def create_authorization_code_form(self) -> Container:
        """Create the authorization code flow form."""
        return Container(
            Label("Provider Name:", classes="form-label"),
            Input(
                placeholder="e.g., my-oauth-provider",
                id="ac_provider",
                validators=[Length(minimum=1)],
            ),
            Label("Client ID:", classes="form-label"),
            Input(
                placeholder="Your OAuth client ID",
                id="ac_client_id",
                validators=[Length(minimum=1)],
            ),
            Label("Authorization URL:", classes="form-label"),
            Input(
                placeholder="https://example.com/oauth/authorize",
                id="ac_auth_url",
                validators=[URLValidator()],
            ),
            Label("Token URL:", classes="form-label"),
            Input(
                placeholder="https://example.com/oauth/token",
                id="ac_token_url",
                validators=[URLValidator()],
            ),
            Label("Redirect URI:", classes="form-label"),
            Input(
                placeholder="http://localhost:3000/callback",
                id="ac_redirect_uri",
                validators=[URLValidator()],
            ),
            Label("Scopes (optional):", classes="form-label"),
            Input(placeholder="read write admin (space-separated)", id="ac_scopes"),
            Static("Note: Authorization Code flow will open a browser window", classes="warning"),
            classes="form-container",
        )

    def create_device_flow_form(self) -> Container:
        """Create the device flow form."""
        return Container(
            Label("Provider Name:", classes="form-label"),
            Input(
                placeholder="e.g., my-oauth-provider",
                id="df_provider",
                validators=[Length(minimum=1)],
            ),
            Label("Client ID:", classes="form-label"),
            Input(
                placeholder="Your OAuth client ID",
                id="df_client_id",
                validators=[Length(minimum=1)],
            ),
            Label("Device Authorization URL:", classes="form-label"),
            Input(
                placeholder="https://example.com/oauth/device/code",
                id="df_device_url",
                validators=[URLValidator()],
            ),
            Label("Token URL:", classes="form-label"),
            Input(
                placeholder="https://example.com/oauth/token",
                id="df_token_url",
                validators=[URLValidator()],
            ),
            Label("Scopes (optional):", classes="form-label"),
            Input(placeholder="read write admin (space-separated)", id="df_scopes"),
            Static(
                "Note: Device flow will display a user code for manual entry", classes="warning"
            ),
            classes="form-container",
        )

    def watch_loading(self, loading: bool) -> None:
        """React to loading state changes."""
        loading_indicator = self.query_one("#loading", LoadingIndicator)
        loading_indicator.display = loading

        # Disable/enable form controls
        submit_button = self.query_one("#submit", Button)
        submit_button.disabled = loading

    @on(TabbedContent.TabActivated)
    def on_tab_activated(self, event: TabbedContent.TabActivated) -> None:
        """Handle tab changes to update current flow."""
        self.current_flow = event.tab.id or "client_credentials"

    @on(Button.Pressed, "#submit")
    def on_submit_pressed(self) -> None:
        """Handle submit button press."""
        self.submit_form()

    @on(Button.Pressed, "#clear")
    def on_clear_pressed(self) -> None:
        """Handle clear form button press."""
        self.clear_current_form()

    @on(Button.Pressed, "#test")
    def on_test_pressed(self) -> None:
        """Handle test connection button press."""
        self.test_connection()

    @on(Button.Pressed, "#back")
    def on_back_pressed(self) -> None:
        """Handle back button press."""
        self.app.pop_screen()

    def get_form_data(self) -> dict[str, str] | None:
        """Get form data for the current flow."""
        try:
            if self.current_flow == "client_credentials":
                return {
                    "provider": self.query_one("#cc_provider", Input).value.strip(),
                    "client_id": self.query_one("#cc_client_id", Input).value.strip(),
                    "client_secret": self.query_one("#cc_client_secret", Input).value.strip(),
                    "token_url": self.query_one("#cc_token_url", Input).value.strip(),
                    "scopes": self.query_one("#cc_scopes", Input).value.strip(),
                }
            if self.current_flow == "authorization_code":
                return {
                    "provider": self.query_one("#ac_provider", Input).value.strip(),
                    "client_id": self.query_one("#ac_client_id", Input).value.strip(),
                    "auth_url": self.query_one("#ac_auth_url", Input).value.strip(),
                    "token_url": self.query_one("#ac_token_url", Input).value.strip(),
                    "redirect_uri": self.query_one("#ac_redirect_uri", Input).value.strip(),
                    "scopes": self.query_one("#ac_scopes", Input).value.strip(),
                }
            if self.current_flow == "device_flow":
                return {
                    "provider": self.query_one("#df_provider", Input).value.strip(),
                    "client_id": self.query_one("#df_client_id", Input).value.strip(),
                    "device_url": self.query_one("#df_device_url", Input).value.strip(),
                    "token_url": self.query_one("#df_token_url", Input).value.strip(),
                    "scopes": self.query_one("#df_scopes", Input).value.strip(),
                }
        except Exception as e:
            self.notify(f"Error reading form data: {str(e)}", severity="error")

        return None

    def validate_form_data(self, data: dict[str, str]) -> bool:
        """Validate the form data for the current flow."""
        if not data.get("provider"):
            self.notify("Provider name is required", severity="error")
            return False

        if not data.get("client_id"):
            self.notify("Client ID is required", severity="error")
            return False

        if self.current_flow == "client_credentials":
            if not data.get("client_secret"):
                self.notify(
                    "Client secret is required for Client Credentials flow", severity="error"
                )
                return False
            if not data.get("token_url"):
                self.notify("Token URL is required", severity="error")
                return False

        elif self.current_flow == "authorization_code":
            if not data.get("auth_url"):
                self.notify("Authorization URL is required", severity="error")
                return False
            if not data.get("token_url"):
                self.notify("Token URL is required", severity="error")
                return False
            if not data.get("redirect_uri"):
                self.notify("Redirect URI is required", severity="error")
                return False

        elif self.current_flow == "device_flow":
            if not data.get("device_url"):
                self.notify("Device authorization URL is required", severity="error")
                return False
            if not data.get("token_url"):
                self.notify("Token URL is required", severity="error")
                return False

        return True

    def clear_current_form(self) -> None:
        """Clear the current form."""
        try:
            if self.current_flow == "client_credentials":
                self.query_one("#cc_provider", Input).value = ""
                self.query_one("#cc_client_id", Input).value = ""
                self.query_one("#cc_client_secret", Input).value = ""
                self.query_one("#cc_token_url", Input).value = ""
                self.query_one("#cc_scopes", Input).value = ""
            elif self.current_flow == "authorization_code":
                self.query_one("#ac_provider", Input).value = ""
                self.query_one("#ac_client_id", Input).value = ""
                self.query_one("#ac_auth_url", Input).value = ""
                self.query_one("#ac_token_url", Input).value = ""
                self.query_one("#ac_redirect_uri", Input).value = ""
                self.query_one("#ac_scopes", Input).value = ""
            elif self.current_flow == "device_flow":
                self.query_one("#df_provider", Input).value = ""
                self.query_one("#df_client_id", Input).value = ""
                self.query_one("#df_device_url", Input).value = ""
                self.query_one("#df_token_url", Input).value = ""
                self.query_one("#df_scopes", Input).value = ""

            self.notify("Form cleared", severity="information")
        except Exception as e:
            self.notify(f"Error clearing form: {str(e)}", severity="error")

    @work(exclusive=True)
    async def submit_form(self) -> None:
        """Submit the authentication form."""
        data = self.get_form_data()
        if not data or not self.validate_form_data(data):
            return

        self.loading = True

        try:
            oauth_client = cast("OAuthTUI", self.app).oauth_client

            if self.current_flow == "client_credentials":
                result = await oauth_client.authenticate_client_credentials(
                    provider=data["provider"],
                    client_id=data["client_id"],
                    client_secret=data["client_secret"],
                    token_url=data["token_url"],
                    scopes=data["scopes"] if data["scopes"] else None,
                )

                if result.get("success"):
                    self.notify(
                        f"Successfully authenticated with {data['provider']}",
                        severity="information",
                    )
                    # Optionally navigate back or to tokens screen
                    self.app.pop_screen()
                else:
                    error_msg = result.get("error", "Authentication failed")
                    self.notify(f"Authentication failed: {error_msg}", severity="error")

            else:
                # For other flows, show a message that they're not implemented yet
                self.notify(
                    f"{self.current_flow.replace('_', ' ').title()} flow not yet implemented",
                    severity="warning",
                )

        except Exception as e:
            self.notify(f"Authentication error: {str(e)}", severity="error")

        finally:
            self.loading = False

    @work(exclusive=True)
    async def test_connection(self) -> None:
        """Test connection to the OAuth endpoints."""
        data = self.get_form_data()
        if not data:
            return

        # Basic validation for test
        if not data.get("token_url"):
            self.notify("Token URL is required for connection test", severity="error")
            return

        self.loading = True

        try:
            # For now, just validate URL format and show success
            # In a real implementation, this would ping the endpoint
            if data["token_url"].startswith(("http://", "https://")):
                self.notify("Connection test passed (URL format valid)", severity="information")
            else:
                self.notify("Invalid URL format", severity="error")

        except Exception as e:
            self.notify(f"Connection test failed: {str(e)}", severity="error")

        finally:
            self.loading = False

    def action_back(self) -> None:
        """Go back to previous screen."""
        self.app.pop_screen()

    def action_submit_form(self) -> None:
        """Submit the form via keyboard shortcut."""
        self.submit_form()
