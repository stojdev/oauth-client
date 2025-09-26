"""Dashboard screen for OAuth TUI."""

from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, cast

from textual import on, work
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.reactive import reactive
from textual.screen import Screen
from textual.widgets import (
    Button,
    DataTable,
    Footer,
    Header,
    LoadingIndicator,
    Static,
    TabbedContent,
    TabPane,
)

if TYPE_CHECKING:
    from ..app import OAuthTUI


class StatCard(Container):
    """A card widget for displaying statistics."""

    def __init__(self, title: str, value: str, subtitle: str = "", color: str = "primary"):
        super().__init__()
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.color = color

    CSS = """
    StatCard {
        width: 1fr;
        height: 6;
        border: solid $primary;
        padding: 1;
        margin: 0 1 1 0;
        background: $surface-lighten-1;
    }

    .stat-title {
        text-style: bold;
        color: $text-muted;
        text-align: center;
    }

    .stat-value {
        text-style: bold;
        text-align: center;
        color: $accent;
        margin: 1 0;
    }

    .stat-subtitle {
        text-align: center;
        color: $text-muted;
    }
    """

    def compose(self) -> ComposeResult:
        yield Static(self.title, classes="stat-title")
        yield Static(self.value, classes="stat-value")
        if self.subtitle:
            yield Static(self.subtitle, classes="stat-subtitle")


class DashboardScreen(Screen):
    """Dashboard screen showing OAuth status and statistics."""

    BINDINGS = [
        Binding("escape", "back", "Back"),
        ("r", "refresh", "Refresh"),
        ("t", "show_tokens", "View Tokens"),
        ("a", "show_auth", "Authenticate"),
        ("c", "show_config", "Configure"),
    ]

    CSS = """
    DashboardScreen {
        background: $surface;
    }

    #dashboard-container {
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

    #stats-grid {
        height: auto;
        margin-bottom: 2;
    }

    #stats-row {
        height: auto;
        width: 100%;
    }

    #main-content {
        height: 1fr;
    }

    TabbedContent {
        height: 1fr;
    }

    .content-container {
        height: 100%;
        padding: 1;
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

    .quick-action {
        width: 1fr;
        margin-bottom: 1;
    }

    .info-text {
        color: $text-muted;
        text-align: center;
        margin: 2;
    }

    .success-text {
        color: $success;
        text-style: bold;
    }

    .warning-text {
        color: $warning;
        text-style: bold;
    }

    .error-text {
        color: $error;
        text-style: bold;
    }

    ProgressBar {
        margin: 1 0;
    }
    """

    # Reactive attributes for state management
    loading: reactive[bool] = reactive(False)
    stats: reactive[dict[str, Any]] = reactive({})
    tokens: reactive[list[dict[str, Any]]] = reactive([])
    providers: reactive[list[dict[str, Any]]] = reactive([])

    def compose(self) -> ComposeResult:
        """Compose the dashboard screen layout."""
        yield Header(show_clock=True)

        with Container(id="dashboard-container"):
            yield Static("📊 OAuth Dashboard", id="header-text")

            # Status bar
            with Horizontal(id="status-bar"):
                yield Static("", id="status-text")
                loading = LoadingIndicator(id="loading")
                loading.display = False
                yield loading

            # Statistics cards
            with Container(id="stats-grid"), Horizontal(id="stats-row"):
                yield StatCard("Total Tokens", "0", "Active tokens")
                yield StatCard("Providers", "0", "Configured")
                yield StatCard("Expired", "0", "Need refresh")
                yield StatCard("Status", "Ready", "System status")

            # Main content with tabs
            with Container(id="main-content"), TabbedContent():
                with TabPane("Quick Actions", id="actions_tab"):
                    yield self.create_quick_actions_panel()

                with TabPane("Recent Tokens", id="tokens_tab"):
                    yield self.create_recent_tokens_panel()

                with TabPane("System Info", id="system_tab"):
                    yield self.create_system_info_panel()

            # Button bar
            with Horizontal(id="button-bar"):
                yield Button("Refresh", id="refresh", variant="primary")
                yield Button("View All Tokens", id="tokens")
                yield Button("Authenticate", id="auth")
                yield Button("Configure", id="config")
                yield Button("Back", id="back")

        yield Footer()

    def create_quick_actions_panel(self) -> Container:
        """Create the quick actions panel."""
        return Container(
            Static("Quick Actions", classes="info-text"),
            Button(
                "🔐 Client Credentials Auth",
                id="quick_auth_cc",
                classes="quick-action",
                variant="primary",
            ),
            Button("🎫 View All Tokens", id="quick_tokens", classes="quick-action"),
            Button("⚙️ Manage Providers", id="quick_config", classes="quick-action"),
            Button("🔍 Inspect JWT Token", id="quick_inspector", classes="quick-action"),
            Button("❓ Help & Documentation", id="quick_help", classes="quick-action"),
            Static("\nTip: Use keyboard shortcuts for faster navigation", classes="info-text"),
            classes="content-container",
        )

    def create_recent_tokens_panel(self) -> Container:
        """Create the recent tokens panel."""
        container = Container(classes="content-container")

        # Add table for recent tokens
        table: DataTable = DataTable(id="recent-tokens-table")
        table.cursor_type = "row"
        table.zebra_stripes = True
        container.mount(table)

        return container

    def create_system_info_panel(self) -> Container:
        """Create the system information panel."""
        return Container(
            Static("System Information", classes="info-text"),
            Static("OAuth Client Status:", classes="warning-text"),
            Static("✅ CLI Bridge: Connected", classes="success-text"),
            Static("✅ Node.js Backend: Available", classes="success-text"),
            Static("✅ Configuration: Loaded", classes="success-text"),
            Static("\nCapabilities:", classes="warning-text"),
            Static("• Client Credentials Flow", classes="info-text"),
            Static("• Authorization Code Flow (Planned)", classes="info-text"),
            Static("• Device Flow (Planned)", classes="info-text"),
            Static("• JWT Token Inspection", classes="info-text"),
            Static("• Provider Management", classes="info-text"),
            Static("\nKeyboard Shortcuts:", classes="warning-text"),
            Static("• R: Refresh data", classes="info-text"),
            Static("• T: View tokens", classes="info-text"),
            Static("• A: Authenticate", classes="info-text"),
            Static("• C: Configure providers", classes="info-text"),
            Static("• Escape: Back to menu", classes="info-text"),
            classes="content-container",
        )

    def on_mount(self) -> None:
        """Load dashboard data when screen is mounted."""
        self.load_dashboard_data()

    def watch_loading(self, loading: bool) -> None:
        """React to loading state changes."""
        loading_indicator = self.query_one("#loading", LoadingIndicator)
        loading_indicator.display = loading

        # Update status text
        status_text = self.query_one("#status-text", Static)
        if loading:
            status_text.update("Loading dashboard data...")
        else:
            last_update = datetime.now().strftime("%H:%M:%S")
            status_text.update(f"Last updated: {last_update}")

    def watch_stats(self, stats: dict[str, Any]) -> None:
        """React to stats changes."""
        self.update_stat_cards()

    def watch_tokens(self, tokens: list[dict[str, Any]]) -> None:
        """React to tokens changes."""
        self.update_recent_tokens_table()

    def update_stat_cards(self) -> None:
        """Update the statistics cards."""
        try:
            # Calculate statistics
            total_tokens = len(self.tokens)
            total_providers = len(self.providers)
            expired_tokens = self.count_expired_tokens()
            system_status = self.get_system_status()

            # Update the cards by removing and re-adding them
            stats_row = self.query_one("#stats-row", Horizontal)
            stats_row.remove_children()

            # Add updated cards
            stats_row.mount(
                StatCard("Total Tokens", str(total_tokens), "Active tokens"),
                StatCard("Providers", str(total_providers), "Configured"),
                StatCard("Expired", str(expired_tokens), "Need refresh"),
                StatCard("Status", system_status, "System status"),
            )
        except Exception as e:
            self.notify(f"Error updating stats: {str(e)}", severity="error")

    def update_recent_tokens_table(self) -> None:
        """Update the recent tokens table."""
        try:
            table = self.query_one("#recent-tokens-table", DataTable)
            table.clear(columns=True)

            # Add columns
            table.add_columns("Provider", "Type", "Status", "Expires", "Issued")

            if not self.tokens:
                table.add_row("No tokens found", "-", "-", "-", "-")
                return

            # Sort tokens by most recent first and take top 10
            sorted_tokens = sorted(self.tokens, key=lambda t: t.get("issued_at", 0), reverse=True)[
                :10
            ]

            for token in sorted_tokens:
                provider = token.get("provider", "Unknown")
                token_type = token.get("token_type", "Bearer")

                # Determine status
                status = self.get_token_status(token)

                # Format expiration
                expires_display = self.format_expiration(token)

                # Format issued time
                issued_display = self.format_issued_time(token)

                table.add_row(provider, token_type, status, expires_display, issued_display)

        except Exception as e:
            self.notify(f"Error updating tokens table: {str(e)}", severity="error")

    def count_expired_tokens(self) -> int:
        """Count the number of expired tokens."""
        expired_count = 0
        now = datetime.now()

        for token in self.tokens:
            expires_at = token.get("expires_at")
            if expires_at:
                try:
                    if isinstance(expires_at, (int, float)):
                        exp_time = datetime.fromtimestamp(expires_at)
                    else:
                        exp_time = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))

                    if exp_time <= now:
                        expired_count += 1
                except (ValueError, OSError):
                    pass  # Invalid timestamp format

        return expired_count

    def get_system_status(self) -> str:
        """Get the overall system status."""
        if self.loading:
            return "Loading..."

        expired_tokens = self.count_expired_tokens()
        if expired_tokens > 0:
            return "Warning"

        if len(self.tokens) == 0 and len(self.providers) == 0:
            return "Setup"

        return "Ready"

    def get_token_status(self, token: dict[str, Any]) -> str:
        """Get the status of a token."""
        expires_at = token.get("expires_at")
        if not expires_at:
            return "Active"

        try:
            if isinstance(expires_at, (int, float)):
                exp_time = datetime.fromtimestamp(expires_at)
            else:
                exp_time = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))

            now = datetime.now(exp_time.tzinfo) if exp_time.tzinfo else datetime.now()

            if exp_time <= now:
                return "Expired"
            if exp_time <= now + timedelta(hours=1):
                return "Expiring"
            return "Active"
        except (ValueError, OSError):
            return "Unknown"

    def format_expiration(self, token: dict[str, Any]) -> str:
        """Format token expiration time."""
        expires_at = token.get("expires_at")
        if not expires_at:
            return "Never"

        try:
            if isinstance(expires_at, (int, float)):
                exp_time = datetime.fromtimestamp(expires_at)
            else:
                exp_time = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))

            now = datetime.now(exp_time.tzinfo) if exp_time.tzinfo else datetime.now()

            if exp_time <= now:
                return "Expired"

            # Calculate remaining time
            remaining = exp_time - now
            if remaining.days > 0:
                return f"{remaining.days}d {remaining.seconds // 3600}h"
            if remaining.seconds > 3600:
                return f"{remaining.seconds // 3600}h {(remaining.seconds % 3600) // 60}m"
            return f"{remaining.seconds // 60}m"

        except (ValueError, OSError):
            return str(expires_at)

    def format_issued_time(self, token: dict[str, Any]) -> str:
        """Format token issued time."""
        issued_at = token.get("issued_at")
        if not issued_at:
            return "Unknown"

        try:
            if isinstance(issued_at, (int, float)):
                issued_time = datetime.fromtimestamp(issued_at)
            else:
                issued_time = datetime.fromisoformat(str(issued_at).replace("Z", "+00:00"))

            now = datetime.now(issued_time.tzinfo) if issued_time.tzinfo else datetime.now()
            diff = now - issued_time

            if diff.days > 0:
                return f"{diff.days}d ago"
            if diff.seconds > 3600:
                return f"{diff.seconds // 3600}h ago"
            return f"{diff.seconds // 60}m ago"

        except (ValueError, OSError):
            return str(issued_at)

    @work(exclusive=True)
    async def load_dashboard_data(self) -> None:
        """Load dashboard data from the OAuth CLI."""
        self.loading = True
        try:
            oauth_client = cast("OAuthTUI", self.app).oauth_client

            # Load tokens and providers in parallel
            tokens, providers = await oauth_client.get_tokens(), await oauth_client.get_providers()

            self.tokens = tokens
            self.providers = providers

            # Update stats
            self.stats = {
                "total_tokens": len(tokens),
                "total_providers": len(providers),
                "expired_tokens": self.count_expired_tokens(),
                "system_status": self.get_system_status(),
            }

            self.notify("Dashboard data loaded", severity="information")

        except Exception as e:
            self.notify(f"Error loading dashboard data: {str(e)}", severity="error")
            self.tokens = []
            self.providers = []
            self.stats = {}
        finally:
            self.loading = False

    # Button event handlers
    @on(Button.Pressed, "#refresh")
    def on_refresh_pressed(self) -> None:
        """Handle refresh button press."""
        self.load_dashboard_data()

    @on(Button.Pressed, "#tokens")
    @on(Button.Pressed, "#quick_tokens")
    def on_tokens_pressed(self) -> None:
        """Handle tokens button press."""
        self.action_show_tokens()

    @on(Button.Pressed, "#auth")
    @on(Button.Pressed, "#quick_auth_cc")
    def on_auth_pressed(self) -> None:
        """Handle auth button press."""
        self.action_show_auth()

    @on(Button.Pressed, "#config")
    @on(Button.Pressed, "#quick_config")
    def on_config_pressed(self) -> None:
        """Handle config button press."""
        self.action_show_config()

    @on(Button.Pressed, "#quick_inspector")
    def on_inspector_pressed(self) -> None:
        """Handle inspector button press."""
        self.action_show_inspector()

    @on(Button.Pressed, "#quick_help")
    def on_help_pressed(self) -> None:
        """Handle help button press."""
        self.action_show_help()

    @on(Button.Pressed, "#back")
    def on_back_pressed(self) -> None:
        """Handle back button press."""
        self.app.pop_screen()

    # Action methods
    def action_refresh(self) -> None:
        """Refresh dashboard data."""
        self.load_dashboard_data()

    def action_show_tokens(self) -> None:
        """Show the tokens screen."""
        from .tokens import TokensScreen

        self.app.push_screen(TokensScreen())

    def action_show_auth(self) -> None:
        """Show the authentication screen."""
        from .auth import AuthScreen

        self.app.push_screen(AuthScreen())

    def action_show_config(self) -> None:
        """Show the configuration screen."""
        from .config import ConfigScreen

        self.app.push_screen(ConfigScreen())

    def action_show_inspector(self) -> None:
        """Show the token inspector screen."""
        from .inspector import InspectorScreen

        self.app.push_screen(InspectorScreen())

    def action_show_help(self) -> None:
        """Show the help screen."""
        from .help import HelpScreen

        self.app.push_screen(HelpScreen())

    def action_back(self) -> None:
        """Go back to previous screen."""
        self.app.pop_screen()
