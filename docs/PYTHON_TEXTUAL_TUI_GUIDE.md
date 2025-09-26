# Python Textual TUI Guide for OAuth Client Application

This comprehensive guide covers implementing a Terminal User Interface (TUI) for an OAuth client application using Python Textual framework.

## 1. Textual Fundamentals

### App Structure and Lifecycle

Textual apps follow a structured pattern with clear lifecycle methods:

```python
from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Label
from textual.screen import Screen

class OAuthClientApp(App[None]):
    """Main OAuth client TUI application."""

    # App metadata
    TITLE = "OAuth Client TUI"
    SUB_TITLE = "Test OAuth 2.0 Flows"

    # CSS styling
    CSS_PATH = "oauth_client.tcss"

    # Key bindings
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("d", "toggle_dark", "Toggle dark mode"),
        ("h", "help", "Help")
    ]

    # Available screens
    SCREENS = {
        "main": MainScreen,
        "config": ConfigScreen,
        "tokens": TokenScreen,
        "jwt": JWTInspectorScreen
    }

    def compose(self) -> ComposeResult:
        """Create the initial widget structure."""
        yield Header()
        yield Footer()
        yield Label("Welcome to OAuth Client TUI")

    def on_mount(self) -> None:
        """Called when app starts - setup initialization."""
        # Don't perform heavy operations here
        self.push_screen("main")

    def action_toggle_dark(self) -> None:
        """Toggle between dark and light mode."""
        self.dark = not self.dark

    def action_help(self) -> None:
        """Show help screen."""
        self.push_screen("help")
```

### Screens and Navigation

Screens are the main UI containers in Textual:

```python
from textual.screen import Screen, ModalScreen
from textual.containers import Container, VerticalScroll, Horizontal
from textual.widgets import Button, Static, ListView, ListItem

class MainScreen(Screen):
    """Main menu screen."""

    BINDINGS = [
        ("1", "show_config", "Configuration"),
        ("2", "show_tokens", "Tokens"),
        ("3", "test_flow", "Test OAuth Flow"),
        ("4", "jwt_inspector", "JWT Inspector")
    ]

    def compose(self) -> ComposeResult:
        """Compose the main screen layout."""
        yield Container(
            Static("OAuth Client Main Menu", classes="title"),
            ListView(
                ListItem(Label("⚙️  Configuration Management")),
                ListItem(Label("🔑 Token Management")),
                ListItem(Label("🔄 Test OAuth Flows")),
                ListItem(Label("🔍 JWT Inspector")),
                ListItem(Label("📊 Command History")),
                ListItem(Label("❓ Help & Documentation"))
            ),
            id="main-menu"
        )

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """Handle menu selection."""
        index = event.list_view.index
        if index == 0:
            self.app.push_screen("config")
        elif index == 1:
            self.app.push_screen("tokens")
        elif index == 2:
            self.action_test_flow()
        elif index == 3:
            self.app.push_screen("jwt")

    def action_show_config(self) -> None:
        """Navigate to configuration screen."""
        self.app.push_screen("config")

# Modal screen for confirmations
class ConfirmDialog(ModalScreen[bool]):
    """Modal dialog for confirmations."""

    def __init__(self, message: str, title: str = "Confirm"):
        super().__init__()
        self.message = message
        self.title = title

    def compose(self) -> ComposeResult:
        yield Container(
            Static(self.title, classes="dialog-title"),
            Static(self.message, classes="dialog-message"),
            Horizontal(
                Button("Yes", id="yes", variant="success"),
                Button("No", id="no", variant="error"),
                classes="dialog-buttons"
            ),
            id="confirm-dialog"
        )

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press."""
        if event.button.id == "yes":
            self.dismiss(True)
        else:
            self.dismiss(False)
```

### Widgets and Layouts

Textual provides many built-in widgets and flexible layout options:

```python
from textual.widgets import (
    Input, Button, DataTable, Tree, ProgressBar,
    SelectionList, TabbedContent, TabPane
)
from textual.containers import Grid, Vertical, Horizontal

class ConfigScreen(Screen):
    """OAuth provider configuration screen."""

    def compose(self) -> ComposeResult:
        """Layout with form fields and buttons."""
        yield Container(
            Static("OAuth Provider Configuration", classes="screen-title"),

            # Form section
            Vertical(
                Horizontal(
                    Static("Provider:", classes="label"),
                    Input(placeholder="e.g., google, github", id="provider"),
                    classes="form-row"
                ),
                Horizontal(
                    Static("Client ID:", classes="label"),
                    Input(placeholder="Your client ID", id="client_id"),
                    classes="form-row"
                ),
                Horizontal(
                    Static("Client Secret:", classes="label"),
                    Input(password=True, placeholder="Your client secret", id="client_secret"),
                    classes="form-row"
                ),
                Horizontal(
                    Static("Scope:", classes="label"),
                    Input(placeholder="openid profile email", id="scope"),
                    classes="form-row"
                ),
                classes="form-container"
            ),

            # Action buttons
            Horizontal(
                Button("Save", id="save", variant="success"),
                Button("Test Connection", id="test", variant="primary"),
                Button("Cancel", id="cancel", variant="error"),
                classes="button-row"
            ),

            # Status area
            Static("", id="status", classes="status"),

            classes="config-screen"
        )

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button presses."""
        if event.button.id == "save":
            self.save_config()
        elif event.button.id == "test":
            self.test_connection()
        elif event.button.id == "cancel":
            self.app.pop_screen()

class TokenScreen(Screen):
    """Token management screen with data table."""

    def compose(self) -> ComposeResult:
        """Token display with table and actions."""
        yield Container(
            Static("Token Management", classes="screen-title"),

            # Token table
            DataTable(
                show_header=True,
                show_row_labels=False,
                zebra_stripes=True,
                id="token-table"
            ),

            # Action buttons
            Horizontal(
                Button("Refresh", id="refresh", variant="primary"),
                Button("Clear All", id="clear", variant="error"),
                Button("Export", id="export", variant="success"),
                classes="button-row"
            ),

            classes="token-screen"
        )

    def on_mount(self) -> None:
        """Setup table headers and load data."""
        table = self.query_one("#token-table", DataTable)
        table.add_columns("Provider", "Type", "Expires", "Scopes", "Status")
        self.load_tokens()

    async def load_tokens(self) -> None:
        """Load tokens from storage."""
        table = self.query_one("#token-table", DataTable)
        # Clear existing rows
        table.clear()

        # Load tokens via subprocess call
        tokens = await self.call_oauth_cli("list-tokens")

        for token in tokens:
            table.add_row(
                token["provider"],
                token["type"],
                token["expires_at"],
                token["scope"],
                "✅ Valid" if token["valid"] else "❌ Expired"
            )
```

### Event Handling and Keyboard Shortcuts

Textual provides powerful event handling mechanisms:

```python
from textual.events import Key, Click, Mount
from textual import on

class InteractiveScreen(Screen):
    """Screen demonstrating event handling."""

    # Class-level key bindings
    BINDINGS = [
        ("ctrl+s", "save", "Save"),
        ("ctrl+r", "refresh", "Refresh"),
        ("escape", "back", "Back"),
        ("f1", "help", "Help"),
        ("f5", "refresh_tokens", "Refresh Tokens")
    ]

    def on_mount(self, event: Mount) -> None:
        """Called when screen is mounted."""
        self.log.info("Screen mounted")
        self.load_initial_data()

    def on_key(self, event: Key) -> None:
        """Handle raw key events."""
        if event.key == "ctrl+d":
            # Custom debug shortcut
            self.toggle_debug_mode()
        elif event.key.isdigit():
            # Quick navigation with numbers
            self.navigate_to_item(int(event.key))

    @on(Input.Submitted)
    def handle_input_submit(self, event: Input.Submitted) -> None:
        """Handle input field submissions."""
        input_id = event.input.id
        value = event.input.value

        if input_id == "search":
            self.perform_search(value)
        elif input_id == "command":
            self.execute_command(value)

    @on(Button.Pressed, "#save-config")
    def save_config_button(self, event: Button.Pressed) -> None:
        """Handle specific button press with selector."""
        self.save_current_config()

    def action_save(self) -> None:
        """Action handler for save shortcut."""
        self.save_current_config()

    def action_refresh(self) -> None:
        """Action handler for refresh shortcut."""
        self.refresh_data()
```

### Styling with CSS

Textual uses CSS-like styling with TCSS (Textual CSS):

```css
/* oauth_client.tcss */

/* Screen-level styles */
Screen {
    background: $surface;
    color: $text;
}

/* Header and Footer */
Header {
    background: $primary;
    color: $text;
    height: 3;
    dock: top;
}

Footer {
    background: $primary-darken-1;
    color: $text;
    height: 3;
    dock: bottom;
}

/* Layout containers */
.config-screen {
    padding: 1;
    height: 100%;
    layout: vertical;
}

.form-container {
    border: solid $accent;
    padding: 1 2;
    margin-bottom: 1;
    height: auto;
}

.form-row {
    height: 3;
    margin-bottom: 1;
    align-items: center;
}

.label {
    width: 15;
    text-align: right;
    padding-right: 2;
    color: $text-muted;
}

/* Button styling */
.button-row {
    height: 3;
    align: center;
    padding: 1;
}

Button {
    margin: 0 1;
    min-width: 12;
}

Button:focus {
    border: thick $accent;
}

/* Table styling */
DataTable {
    height: 1fr;
    margin: 1 0;
    border: solid $accent;
}

DataTable > .datatable--header {
    background: $primary-lighten-1;
    color: $text;
    text-style: bold;
}

DataTable > .datatable--even-row {
    background: $surface-lighten-1;
}

DataTable > .datatable--odd-row {
    background: $surface;
}

DataTable > .datatable--cursor {
    background: $accent;
    color: $text;
}

/* Status and feedback */
.status {
    height: 3;
    padding: 1;
    background: $boost;
    border-left: thick $accent;
    margin: 1 0;
}

.status.success {
    background: $success;
    border-left-color: $success-darken-1;
}

.status.error {
    background: $error;
    border-left-color: $error-darken-1;
}

/* Modal dialogs */
#confirm-dialog {
    width: 50;
    height: 15;
    background: $panel;
    border: thick $primary;
    padding: 1;
    layout: vertical;
}

.dialog-title {
    height: 3;
    text-align: center;
    text-style: bold;
    color: $primary;
}

.dialog-message {
    height: 1fr;
    text-align: center;
    padding: 1;
}

.dialog-buttons {
    height: 3;
    align: center;
}

/* Progress indicators */
ProgressBar {
    margin: 1 0;
    height: 3;
}

ProgressBar > .bar--complete {
    background: $success;
}

ProgressBar > .bar--indeterminate {
    background: $warning;
}

/* List views */
ListView {
    border: solid $accent;
    height: 1fr;
}

ListItem {
    height: 3;
    padding: 0 2;
}

ListItem:hover {
    background: $accent-lighten-3;
}

ListItem.--highlight {
    background: $accent;
    color: $text;
}

/* Tree views for hierarchical data */
Tree {
    border: solid $accent;
    background: $surface;
}

Tree > .tree--guides {
    color: $accent-darken-1;
}

Tree > .tree--guides-hover {
    color: $accent;
}

Tree > .tree--cursor {
    background: $accent;
    color: $text;
}

/* Input fields */
Input {
    border: solid $accent-darken-1;
    background: $surface-lighten-1;
    height: 3;
}

Input:focus {
    border: solid $accent;
}

Input.-invalid {
    border: solid $error;
}

Input.-valid {
    border: solid $success;
}

/* Tabbed content */
TabbedContent {
    height: 1fr;
}

Tabs {
    height: 3;
    background: $panel;
}

Tab {
    padding: 0 2;
    margin: 0 1;
    background: $surface;
    border: solid $accent-darken-2;
}

Tab.-active {
    background: $accent;
    color: $text;
    border: solid $accent;
}

TabPane {
    padding: 1;
    background: $surface;
}

/* Responsive design */
Screen.--small-terminal {
    /* Styles for terminals < 80 columns */
}

Screen.--large-terminal {
    /* Styles for terminals > 120 columns */
}

/* Dark/Light mode specific */
App.-dark-mode {
    /* Dark mode overrides */
}

App.-light-mode {
    /* Light mode overrides */
}
```

## 2. OAuth TUI Implementation Patterns

### Menu/Navigation System

Create a hierarchical navigation system similar to your current React TUI:

```python
from textual.widgets import Tree, TreeNode
from textual.containers import Container, Vertical, Horizontal
from textual import on

class NavigationTree(Tree):
    """Custom navigation tree widget."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.setup_navigation()

    def setup_navigation(self) -> None:
        """Setup the navigation tree structure."""
        root = self.root

        # OAuth Flows
        flows_node = root.add("🔄 OAuth Flows")
        flows_node.add_leaf("Authorization Code")
        flows_node.add_leaf("Client Credentials")
        flows_node.add_leaf("Device Authorization")
        flows_node.add_leaf("Refresh Token")

        # Configuration
        config_node = root.add("⚙️ Configuration")
        config_node.add_leaf("OAuth Providers")
        config_node.add_leaf("Application Settings")
        config_node.add_leaf("Environment Variables")

        # Token Management
        tokens_node = root.add("🔑 Tokens")
        tokens_node.add_leaf("View Active Tokens")
        tokens_node.add_leaf("Clear Expired")
        tokens_node.add_leaf("Export Tokens")

        # Tools
        tools_node = root.add("🔧 Tools")
        tools_node.add_leaf("JWT Inspector")
        tools_node.add_leaf("HTTP Inspector")
        tools_node.add_leaf("Command History")

    @on(Tree.NodeSelected)
    def handle_tree_selection(self, event: Tree.NodeSelected) -> None:
        """Handle navigation tree selections."""
        node = event.node
        label = node.label

        if isinstance(node, TreeNode) and node.is_leaf:
            # Navigate based on selected item
            self.navigate_to_screen(label)

    def navigate_to_screen(self, label: str) -> None:
        """Navigate to the appropriate screen."""
        navigation_map = {
            "Authorization Code": "auth_code_flow",
            "Client Credentials": "client_credentials_flow",
            "OAuth Providers": "provider_config",
            "JWT Inspector": "jwt_inspector",
            "View Active Tokens": "token_list"
        }

        screen_name = navigation_map.get(label)
        if screen_name:
            self.app.push_screen(screen_name)

class MainMenuScreen(Screen):
    """Main menu with navigation tree and quick actions."""

    def compose(self) -> ComposeResult:
        yield Container(
            Horizontal(
                # Left panel - Navigation tree
                Container(
                    Static("Navigation", classes="panel-title"),
                    NavigationTree(id="nav-tree"),
                    classes="nav-panel"
                ),

                # Right panel - Quick actions and status
                Vertical(
                    Static("Quick Actions", classes="panel-title"),
                    Button("🚀 Test Auth Code Flow", id="quick-auth-code"),
                    Button("🔑 Generate Client Credentials Token", id="quick-client-creds"),
                    Button("🔍 Inspect Last Token", id="quick-inspect"),
                    Button("📋 View Command History", id="quick-history"),

                    Static("System Status", classes="panel-title"),
                    Static("Node.js CLI: ✅ Available", id="cli-status"),
                    Static("Config: ✅ Loaded", id="config-status"),
                    Static("Tokens: 3 active", id="token-status"),

                    classes="status-panel"
                ),

                classes="main-layout"
            )
        )

    @on(Button.Pressed, "#quick-auth-code")
    def quick_auth_code(self, event: Button.Pressed) -> None:
        """Quick start authorization code flow."""
        self.app.push_screen("auth_code_flow")
```

### Forms for OAuth Configuration

Create comprehensive forms for OAuth provider setup:

```python
from textual.widgets import Input, Select, Checkbox, RadioSet, RadioButton
from textual.validation import ValidationResult, Validator
from textual.message import Message
from typing import Dict, Any
import re

class URLValidator(Validator):
    """Validator for URL fields."""

    def validate(self, value: str) -> ValidationResult:
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)

        if not value:
            return ValidationResult.error("URL is required")
        if not url_pattern.match(value):
            return ValidationResult.error("Invalid URL format")
        return ValidationResult.success()

class ClientIdValidator(Validator):
    """Validator for OAuth client IDs."""

    def validate(self, value: str) -> ValidationResult:
        if not value:
            return ValidationResult.error("Client ID is required")
        if len(value) < 8:
            return ValidationResult.error("Client ID too short")
        return ValidationResult.success()

class ProviderConfigForm(Container):
    """Form for configuring OAuth providers."""

    class FormSubmitted(Message):
        """Message sent when form is submitted."""

        def __init__(self, data: Dict[str, Any]) -> None:
            self.data = data
            super().__init__()

    def compose(self) -> ComposeResult:
        """Create form layout."""
        yield Vertical(
            Static("OAuth Provider Configuration", classes="form-title"),

            # Basic provider info
            Horizontal(
                Static("Provider Name:", classes="form-label"),
                Input(
                    placeholder="e.g., google, github, azure",
                    id="provider_name",
                    validators=[self.name_validator]
                ),
                classes="form-row"
            ),

            # Provider type selection
            Horizontal(
                Static("Provider Type:", classes="form-label"),
                Select([
                    ("Google", "google"),
                    ("GitHub", "github"),
                    ("Microsoft Azure", "azure"),
                    ("Auth0", "auth0"),
                    ("Custom", "custom")
                ], id="provider_type"),
                classes="form-row"
            ),

            # OAuth endpoints
            Static("OAuth Endpoints", classes="section-title"),
            Horizontal(
                Static("Authorization URL:", classes="form-label"),
                Input(
                    placeholder="https://accounts.google.com/o/oauth2/auth",
                    id="auth_url",
                    validators=[URLValidator()]
                ),
                classes="form-row"
            ),

            Horizontal(
                Static("Token URL:", classes="form-label"),
                Input(
                    placeholder="https://oauth2.googleapis.com/token",
                    id="token_url",
                    validators=[URLValidator()]
                ),
                classes="form-row"
            ),

            # Client credentials
            Static("Client Configuration", classes="section-title"),
            Horizontal(
                Static("Client ID:", classes="form-label"),
                Input(
                    placeholder="Your OAuth client ID",
                    id="client_id",
                    validators=[ClientIdValidator()]
                ),
                classes="form-row"
            ),

            Horizontal(
                Static("Client Secret:", classes="form-label"),
                Input(
                    placeholder="Your OAuth client secret",
                    password=True,
                    id="client_secret"
                ),
                classes="form-row"
            ),

            # Scopes and options
            Horizontal(
                Static("Default Scopes:", classes="form-label"),
                Input(
                    placeholder="openid profile email",
                    id="default_scopes"
                ),
                classes="form-row"
            ),

            # Advanced options
            Static("Advanced Options", classes="section-title"),
            Checkbox("Use PKCE (recommended)", value=True, id="use_pkce"),
            Checkbox("Include state parameter", value=True, id="use_state"),

            RadioSet(
                "Grant Type Support:",
                RadioButton("Authorization Code", value=True),
                RadioButton("Client Credentials"),
                RadioButton("Device Authorization"),
                id="grant_types"
            ),

            # Form actions
            Horizontal(
                Button("Save Configuration", id="save", variant="success"),
                Button("Test Connection", id="test", variant="primary"),
                Button("Load Template", id="template", variant="default"),
                Button("Cancel", id="cancel", variant="error"),
                classes="form-actions"
            ),

            # Status area
            Static("", id="form-status", classes="form-status"),

            classes="provider-form"
        )

    @staticmethod
    def name_validator(value: str) -> ValidationResult:
        """Validate provider name."""
        if not value:
            return ValidationResult.error("Provider name is required")
        if not re.match(r'^[a-zA-Z0-9_-]+$', value):
            return ValidationResult.error("Invalid characters in provider name")
        return ValidationResult.success()

    @on(Button.Pressed, "#save")
    def handle_save(self, event: Button.Pressed) -> None:
        """Handle form save."""
        if self.validate_form():
            data = self.collect_form_data()
            self.post_message(self.FormSubmitted(data))

    @on(Button.Pressed, "#test")
    async def handle_test(self, event: Button.Pressed) -> None:
        """Test the OAuth configuration."""
        status = self.query_one("#form-status")
        status.update("Testing connection...")
        status.add_class("loading")

        # Collect current form data
        data = self.collect_form_data()

        try:
            # Test via subprocess call
            result = await self.test_oauth_config(data)
            if result["success"]:
                status.update("✅ Connection successful!")
                status.remove_class("loading")
                status.add_class("success")
            else:
                status.update(f"❌ Connection failed: {result['error']}")
                status.remove_class("loading")
                status.add_class("error")
        except Exception as e:
            status.update(f"❌ Test error: {str(e)}")
            status.remove_class("loading")
            status.add_class("error")

    def validate_form(self) -> bool:
        """Validate all form fields."""
        all_inputs = self.query(Input)
        valid = True

        for input_widget in all_inputs:
            if not input_widget.is_valid:
                valid = False

        return valid

    def collect_form_data(self) -> Dict[str, Any]:
        """Collect all form data."""
        return {
            "provider_name": self.query_one("#provider_name").value,
            "provider_type": self.query_one("#provider_type").value,
            "auth_url": self.query_one("#auth_url").value,
            "token_url": self.query_one("#token_url").value,
            "client_id": self.query_one("#client_id").value,
            "client_secret": self.query_one("#client_secret").value,
            "default_scopes": self.query_one("#default_scopes").value,
            "use_pkce": self.query_one("#use_pkce").value,
            "use_state": self.query_one("#use_state").value,
            "grant_types": [rb.label for rb in self.query(RadioButton) if rb.value]
        }
```

### Token Display Tables

Create sophisticated tables for displaying tokens:

```python
from textual.widgets import DataTable
from textual.coordinate import Coordinate
from datetime import datetime, timezone
from typing import List, Dict, Any
import json

class TokenTable(DataTable):
    """Enhanced token display table."""

    def __init__(self, **kwargs):
        super().__init__(
            show_header=True,
            show_row_labels=False,
            zebra_stripes=True,
            cursor_type="row",
            **kwargs
        )
        self.setup_columns()

    def setup_columns(self) -> None:
        """Setup table columns."""
        self.add_columns(
            "Provider",
            "Type",
            "Status",
            "Expires",
            "Scopes",
            "Subject",
            "Actions"
        )

    def load_tokens(self, tokens: List[Dict[str, Any]]) -> None:
        """Load tokens into the table."""
        self.clear()

        for token in tokens:
            # Format expiration
            expires_at = token.get("expires_at")
            if expires_at:
                exp_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                now = datetime.now(timezone.utc)

                if exp_date > now:
                    time_left = exp_date - now
                    if time_left.days > 0:
                        expires_str = f"{time_left.days}d {time_left.seconds//3600}h"
                    else:
                        expires_str = f"{time_left.seconds//3600}h {(time_left.seconds%3600)//60}m"
                    status = "🟢 Valid"
                else:
                    expires_str = "Expired"
                    status = "🔴 Expired"
            else:
                expires_str = "No expiry"
                status = "🟡 Unknown"

            # Format scopes
            scopes = token.get("scope", "")
            if len(scopes) > 20:
                scopes = scopes[:20] + "..."

            # Add row
            self.add_row(
                token.get("provider", "Unknown"),
                token.get("token_type", "Bearer"),
                status,
                expires_str,
                scopes,
                token.get("sub", "N/A"),
                "🔍 👁️ 🗑️",  # Inspect, View, Delete actions
                key=token.get("id", "")
            )

    def on_data_table_cell_selected(self, event: DataTable.CellSelected) -> None:
        """Handle cell selection for actions."""
        if event.coordinate.column == 6:  # Actions column
            row_key = self.get_row_key_from_coordinate(event.coordinate)
            self.handle_action_click(row_key, event.coordinate)

    def handle_action_click(self, row_key: str, coordinate: Coordinate) -> None:
        """Handle action button clicks in table."""
        # Determine which action was clicked based on cursor position
        # This is a simplified approach - in practice you'd want more sophisticated action handling
        self.app.push_screen("token_detail", row_key)

class TokenDetailScreen(Screen):
    """Detailed token view screen."""

    def __init__(self, token_id: str):
        super().__init__()
        self.token_id = token_id

    def compose(self) -> ComposeResult:
        """Token detail layout."""
        yield Container(
            Static("Token Details", classes="screen-title"),

            TabbedContent(
                TabPane("Overview", Static("Token overview content"), id="overview"),
                TabPane("Claims", Static("JWT claims content"), id="claims"),
                TabPane("Headers", Static("JWT headers content"), id="headers"),
                TabPane("Raw", Static("Raw token content"), id="raw"),
                id="token-tabs"
            ),

            Horizontal(
                Button("Copy Token", id="copy"),
                Button("Refresh", id="refresh"),
                Button("Delete", id="delete", variant="error"),
                Button("Back", id="back"),
                classes="action-bar"
            )
        )

    async def on_mount(self) -> None:
        """Load token details."""
        await self.load_token_details()

    async def load_token_details(self) -> None:
        """Load and display token information."""
        # Call OAuth CLI to get token details
        token_data = await self.call_oauth_cli("get-token", self.token_id)

        # Update tabs with token information
        overview_tab = self.query_one("#overview")
        overview_tab.update(self.format_token_overview(token_data))

        if token_data.get("type") == "jwt":
            claims_tab = self.query_one("#claims")
            claims_tab.update(self.format_jwt_claims(token_data))
```

### JWT Decoding and Display

Implement a comprehensive JWT inspector:

```python
from textual.widgets import Pretty, Tree, Input
from textual.containers import Vertical, Horizontal
import json
import base64
from typing import Optional, Dict, Any

class JWTInspector(Container):
    """JWT token inspector widget."""

    def compose(self) -> ComposeResult:
        """JWT inspector layout."""
        yield Vertical(
            Static("JWT Inspector", classes="widget-title"),

            # Token input
            Horizontal(
                Static("JWT Token:", classes="input-label"),
                Input(placeholder="Paste JWT token here...", id="jwt-input"),
                Button("Decode", id="decode-btn", variant="primary"),
                classes="input-row"
            ),

            # Results area
            TabbedContent(
                TabPane("Header", Pretty({}), id="header-tab"),
                TabPane("Payload", Pretty({}), id="payload-tab"),
                TabPane("Signature", Static(""), id="signature-tab"),
                TabPane("Validation", Static(""), id="validation-tab"),
                id="jwt-results"
            ),

            classes="jwt-inspector"
        )

    @on(Button.Pressed, "#decode-btn")
    @on(Input.Submitted, "#jwt-input")
    async def decode_jwt(self, event) -> None:
        """Decode the JWT token."""
        token_input = self.query_one("#jwt-input")
        token = token_input.value.strip()

        if not token:
            self.show_error("Please enter a JWT token")
            return

        try:
            # Parse JWT manually for display
            parts = token.split('.')
            if len(parts) != 3:
                self.show_error("Invalid JWT format")
                return

            # Decode header and payload
            header = self.decode_jwt_part(parts[0])
            payload = self.decode_jwt_part(parts[1])
            signature = parts[2]

            # Update display
            self.query_one("#header-tab").update(header)
            self.query_one("#payload-tab").update(payload)
            self.query_one("#signature-tab").update(f"Signature: {signature}")

            # Validate token via CLI
            validation_result = await self.validate_jwt_token(token)
            self.query_one("#validation-tab").update(
                self.format_validation_result(validation_result)
            )

        except Exception as e:
            self.show_error(f"Error decoding JWT: {str(e)}")

    def decode_jwt_part(self, part: str) -> Dict[str, Any]:
        """Decode a JWT part (header or payload)."""
        # Add padding if necessary
        missing_padding = len(part) % 4
        if missing_padding:
            part += '=' * (4 - missing_padding)

        decoded_bytes = base64.urlsafe_b64decode(part)
        return json.loads(decoded_bytes.decode('utf-8'))

    async def validate_jwt_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT token via CLI."""
        return await self.call_oauth_cli("validate-jwt", {"token": token})

    def format_validation_result(self, result: Dict[str, Any]) -> str:
        """Format validation result for display."""
        if result.get("valid"):
            return "✅ Token is valid\n" + "\n".join([
                f"• Issuer: {result.get('iss', 'N/A')}",
                f"• Subject: {result.get('sub', 'N/A')}",
                f"• Audience: {result.get('aud', 'N/A')}",
                f"• Expires: {result.get('exp', 'N/A')}",
                f"• Issued At: {result.get('iat', 'N/A')}"
            ])
        else:
            return f"❌ Token is invalid\nReason: {result.get('error', 'Unknown error')}"

    def show_error(self, message: str) -> None:
        """Show error message."""
        # Clear all tabs and show error
        for tab_id in ["header-tab", "payload-tab", "signature-tab", "validation-tab"]:
            self.query_one(f"#{tab_id}").update(f"Error: {message}")
```

### Progress Indicators for Async Operations

Handle long-running OAuth operations with progress feedback:

```python
from textual.widgets import ProgressBar, Log
from textual.worker import work, Worker
from textual import on
import asyncio

class OAuthFlowScreen(Screen):
    """Screen for running OAuth flows with progress tracking."""

    def compose(self) -> ComposeResult:
        yield Container(
            Static("OAuth Authorization Flow", classes="screen-title"),

            # Flow configuration
            Horizontal(
                Static("Grant Type:", classes="label"),
                Select([
                    ("Authorization Code", "authorization_code"),
                    ("Client Credentials", "client_credentials"),
                    ("Device Authorization", "device_code")
                ], id="grant-type"),
                classes="config-row"
            ),

            # Progress section
            Static("Progress", classes="section-title"),
            ProgressBar(total=100, show_eta=True, id="flow-progress"),
            Static("Ready to start...", id="progress-status"),

            # Log output
            Static("Output Log", classes="section-title"),
            Log(id="flow-log", auto_scroll=True),

            # Control buttons
            Horizontal(
                Button("Start Flow", id="start", variant="success"),
                Button("Cancel", id="cancel", variant="error"),
                Button("Clear Log", id="clear-log"),
                classes="control-buttons"
            )
        )

    @on(Button.Pressed, "#start")
    def start_oauth_flow(self, event: Button.Pressed) -> None:
        """Start the OAuth flow."""
        grant_type = self.query_one("#grant-type").value
        self.run_oauth_flow(grant_type)

    @work(exclusive=True)
    async def run_oauth_flow(self, grant_type: str) -> None:
        """Run OAuth flow with progress tracking."""
        progress = self.query_one("#flow-progress")
        status = self.query_one("#progress-status")
        log = self.query_one("#flow-log")

        try:
            # Reset progress
            progress.update(progress=0)
            status.update("Initializing...")
            log.clear()

            # Step 1: Validate configuration
            log.write("🔧 Validating OAuth configuration...")
            await asyncio.sleep(1)  # Simulate work
            progress.update(progress=20)
            status.update("Configuration validated")

            # Step 2: Start authorization
            log.write("🚀 Starting authorization process...")
            auth_result = await self.call_oauth_cli("start-auth", {
                "grant_type": grant_type,
                "provider": "default"
            })
            progress.update(progress=40)
            status.update("Authorization started")

            if grant_type == "authorization_code":
                # Step 3: Wait for user interaction
                log.write("👤 Waiting for user authorization...")
                log.write(f"🔗 Please visit: {auth_result.get('auth_url', '')}")
                status.update("Waiting for user...")

                # Poll for completion
                for i in range(30):  # 30 second timeout
                    await asyncio.sleep(1)
                    result = await self.call_oauth_cli("check-auth-status")
                    if result.get("completed"):
                        break
                    progress.update(progress=40 + i * 2)

                if not result.get("completed"):
                    raise Exception("Authorization timed out")

            progress.update(progress=80)
            status.update("Exchanging code for token...")

            # Step 4: Get token
            log.write("🔄 Exchanging authorization code for access token...")
            token_result = await self.call_oauth_cli("get-token", {
                "grant_type": grant_type
            })

            progress.update(progress=100)
            status.update("✅ Flow completed successfully!")

            # Display results
            log.write("✅ OAuth flow completed successfully!")
            log.write(f"📋 Token Type: {token_result.get('token_type', 'Bearer')}")
            log.write(f"🔑 Access Token: {token_result.get('access_token', '')[:20]}...")
            if token_result.get('refresh_token'):
                log.write(f"🔄 Refresh Token: Available")
            log.write(f"⏰ Expires In: {token_result.get('expires_in', 'Unknown')} seconds")

        except Exception as e:
            log.write(f"❌ Error: {str(e)}")
            status.update(f"❌ Failed: {str(e)}")
            progress.update(progress=0)

    @on(Button.Pressed, "#cancel")
    def cancel_flow(self, event: Button.Pressed) -> None:
        """Cancel the running flow."""
        # Cancel any running workers
        for worker in self.workers:
            worker.cancel()

        self.query_one("#progress-status").update("❌ Cancelled")
        self.query_one("#flow-log").write("❌ OAuth flow cancelled by user")

class DeviceFlowScreen(Screen):
    """Specialized screen for device authorization flow."""

    def compose(self) -> ComposeResult:
        yield Container(
            Static("Device Authorization Flow", classes="screen-title"),

            # Device flow specific UI
            Container(
                Static("Step 1: Get Device Code", classes="step-title"),
                Button("Get Device Code", id="get-device-code", variant="primary"),
                Static("", id="device-code-status"),
                classes="device-step"
            ),

            Container(
                Static("Step 2: User Authorization", classes="step-title"),
                Static("", id="user-code-display", classes="code-display"),
                Static("", id="verification-url", classes="url-display"),
                Button("Open Browser", id="open-browser", variant="secondary"),
                classes="device-step"
            ),

            Container(
                Static("Step 3: Poll for Token", classes="step-title"),
                ProgressBar(total=100, id="polling-progress"),
                Static("", id="polling-status"),
                Button("Start Polling", id="start-polling", variant="success"),
                classes="device-step"
            )
        )

    @work(exclusive=True)
    async def poll_for_token(self) -> None:
        """Poll for device flow completion."""
        progress = self.query_one("#polling-progress")
        status = self.query_one("#polling-status")

        # Poll every 5 seconds for up to 10 minutes
        for i in range(120):  # 10 minutes
            try:
                result = await self.call_oauth_cli("poll-device-token")
                if result.get("access_token"):
                    status.update("✅ Token received!")
                    progress.update(progress=100)
                    return
                elif result.get("error") == "authorization_pending":
                    status.update(f"⏳ Waiting for user authorization... ({i*5}s)")
                    progress.update(progress=min(i * 0.8, 95))
                else:
                    status.update(f"❌ Error: {result.get('error', 'Unknown')}")
                    return

            except Exception as e:
                status.update(f"❌ Polling error: {str(e)}")
                return

            await asyncio.sleep(5)

        status.update("❌ Polling timeout - please try again")
```

### Modal Dialogs for Confirmations

Create reusable modal dialogs for user confirmations:

```python
from textual.screen import ModalScreen
from textual.widgets import Label, Button
from textual.containers import Grid, Container

class ConfirmDialog(ModalScreen[bool]):
    """A modal confirmation dialog."""

    def __init__(self, message: str, title: str = "Confirm Action"):
        super().__init__()
        self.message = message
        self.title_text = title

    def compose(self) -> ComposeResult:
        yield Container(
            Label(self.title_text, id="title"),
            Label(self.message, id="message"),
            Grid(
                Button("Yes", variant="error", id="yes"),
                Button("No", variant="default", id="no"),
                id="button-grid"
            ),
            id="dialog"
        )

    @on(Button.Pressed, "#yes")
    def handle_yes(self, event: Button.Pressed) -> None:
        self.dismiss(True)

    @on(Button.Pressed, "#no")
    def handle_no(self, event: Button.Pressed) -> None:
        self.dismiss(False)

class InputDialog(ModalScreen[str]):
    """A modal input dialog."""

    def __init__(self, prompt: str, title: str = "Input Required", default: str = ""):
        super().__init__()
        self.prompt = prompt
        self.title_text = title
        self.default_value = default

    def compose(self) -> ComposeResult:
        yield Container(
            Label(self.title_text, id="title"),
            Label(self.prompt, id="prompt"),
            Input(value=self.default_value, id="input"),
            Grid(
                Button("OK", variant="success", id="ok"),
                Button("Cancel", variant="default", id="cancel"),
                id="button-grid"
            ),
            id="input-dialog"
        )

    def on_mount(self) -> None:
        """Focus the input field."""
        self.query_one("#input").focus()

    @on(Button.Pressed, "#ok")
    @on(Input.Submitted, "#input")
    def handle_ok(self, event) -> None:
        input_value = self.query_one("#input").value
        self.dismiss(input_value)

    @on(Button.Pressed, "#cancel")
    def handle_cancel(self, event: Button.Pressed) -> None:
        self.dismiss("")

# Usage examples
class TokenManagementScreen(Screen):
    """Screen demonstrating modal usage."""

    @on(Button.Pressed, "#delete-token")
    async def delete_token(self, event: Button.Pressed) -> None:
        """Delete a token with confirmation."""
        confirmed = await self.app.push_screen_wait(
            ConfirmDialog(
                "Are you sure you want to delete this token? This action cannot be undone.",
                "Delete Token"
            )
        )

        if confirmed:
            # Perform deletion
            await self.perform_token_deletion()

    @on(Button.Pressed, "#rename-provider")
    async def rename_provider(self, event: Button.Pressed) -> None:
        """Rename a provider with input dialog."""
        new_name = await self.app.push_screen_wait(
            InputDialog(
                "Enter new provider name:",
                "Rename Provider",
                "current-provider-name"
            )
        )

        if new_name:
            # Perform rename
            await self.perform_provider_rename(new_name)
```

## 3. Integration with External Processes

### Best Way to Call Node.js CLI from Python

Use asyncio subprocess for non-blocking CLI integration:

```python
import asyncio
import json
import subprocess
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class OAuthCLIClient:
    """Client for interfacing with the Node.js OAuth CLI."""

    def __init__(self, cli_path: Optional[str] = None):
        """Initialize the CLI client."""
        # Auto-detect CLI path or use provided path
        if cli_path:
            self.cli_path = Path(cli_path)
        else:
            # Try common locations
            possible_paths = [
                Path("./dist/cli/index.js"),
                Path("./node_modules/.bin/oauth-client"),
                Path("/usr/local/bin/oauth-client")
            ]

            self.cli_path = None
            for path in possible_paths:
                if path.exists():
                    self.cli_path = path
                    break

            if not self.cli_path:
                raise RuntimeError("OAuth CLI not found. Please ensure it's built and available.")

    async def execute_command(
        self,
        command: str,
        args: Optional[List[str]] = None,
        input_data: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Execute a CLI command and return parsed JSON result."""
        cmd_args = ["node", str(self.cli_path), command]

        if args:
            cmd_args.extend(args)

        # Add JSON output flag for structured data
        if "--json" not in cmd_args:
            cmd_args.append("--json")

        logger.debug(f"Executing command: {' '.join(cmd_args)}")

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.cli_path.parent if self.cli_path.is_file() else None
            )

            # Send input data as JSON if provided
            stdin_data = None
            if input_data:
                stdin_data = json.dumps(input_data).encode()

            stdout, stderr = await asyncio.wait_for(
                process.communicate(input=stdin_data),
                timeout=timeout
            )

            if process.returncode == 0:
                try:
                    result = json.loads(stdout.decode())
                    logger.debug(f"Command successful: {result}")
                    return result
                except json.JSONDecodeError:
                    # Fallback for non-JSON output
                    return {"success": True, "output": stdout.decode().strip()}
            else:
                error_msg = stderr.decode().strip()
                logger.error(f"Command failed: {error_msg}")
                return {"success": False, "error": error_msg, "code": process.returncode}

        except asyncio.TimeoutError:
            logger.error(f"Command timed out after {timeout} seconds")
            return {"success": False, "error": "Command timeout"}
        except Exception as e:
            logger.error(f"Command execution error: {str(e)}")
            return {"success": False, "error": str(e)}

    # Specific OAuth CLI methods
    async def list_tokens(self) -> List[Dict[str, Any]]:
        """List all stored tokens."""
        result = await self.execute_command("list-tokens")
        return result.get("tokens", []) if result.get("success") else []

    async def get_token(self, token_id: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific token."""
        result = await self.execute_command("get-token", [token_id])
        return result.get("token") if result.get("success") else None

    async def delete_token(self, token_id: str) -> bool:
        """Delete a specific token."""
        result = await self.execute_command("delete-token", [token_id])
        return result.get("success", False)

    async def clear_tokens(self) -> bool:
        """Clear all tokens."""
        result = await self.execute_command("clear-tokens")
        return result.get("success", False)

    async def test_client_credentials(
        self,
        provider: str,
        client_id: str,
        client_secret: str,
        scope: Optional[str] = None
    ) -> Dict[str, Any]:
        """Test client credentials grant."""
        args = ["--provider", provider, "--client-id", client_id, "--client-secret", client_secret]
        if scope:
            args.extend(["--scope", scope])

        return await self.execute_command("test-client-credentials", args)

    async def start_authorization_code_flow(
        self,
        provider: str,
        redirect_uri: str = "http://localhost:8080/callback",
        scope: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Start authorization code flow."""
        args = ["--provider", provider, "--redirect-uri", redirect_uri]
        if scope:
            args.extend(["--scope", scope])
        if state:
            args.extend(["--state", state])

        return await self.execute_command("auth-code", args)

    async def validate_jwt(self, token: str) -> Dict[str, Any]:
        """Validate a JWT token."""
        return await self.execute_command("validate-jwt", input_data={"token": token})

    async def get_provider_config(self, provider: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a provider."""
        result = await self.execute_command("get-config", [provider])
        return result.get("config") if result.get("success") else None

    async def set_provider_config(
        self,
        provider: str,
        config: Dict[str, Any]
    ) -> bool:
        """Set configuration for a provider."""
        result = await self.execute_command(
            "set-config",
            [provider],
            input_data=config
        )
        return result.get("success", False)

# Integration into Textual app
class TextualOAuthApp(App):
    """Main OAuth app with CLI integration."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.cli_client = OAuthCLIClient()

    def on_mount(self) -> None:
        """Initialize app and check CLI availability."""
        self.check_cli_availability()

    async def check_cli_availability(self) -> None:
        """Check if OAuth CLI is available."""
        try:
            result = await self.cli_client.execute_command("--version")
            if result.get("success"):
                self.notify("OAuth CLI available", severity="information")
            else:
                self.notify("OAuth CLI not responding", severity="error")
        except Exception as e:
            self.notify(f"OAuth CLI error: {str(e)}", severity="error")

    async def call_oauth_cli(self, command: str, *args, **kwargs) -> Dict[str, Any]:
        """Convenient method for calling OAuth CLI."""
        return await self.cli_client.execute_command(command, *args, **kwargs)
```

### Subprocess Management

Advanced subprocess handling with proper lifecycle management:

```python
import asyncio
import signal
from typing import Dict, Set, Optional
from dataclasses import dataclass, field
from enum import Enum

class ProcessStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"

@dataclass
class ProcessInfo:
    """Information about a running process."""
    command: str
    args: List[str]
    pid: Optional[int] = None
    status: ProcessStatus = ProcessStatus.RUNNING
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    return_code: Optional[int] = None
    error: Optional[str] = None

class ProcessManager:
    """Manages subprocess lifecycle for the OAuth TUI."""

    def __init__(self):
        self.processes: Dict[str, asyncio.subprocess.Process] = {}
        self.process_info: Dict[str, ProcessInfo] = {}

    async def start_process(
        self,
        process_id: str,
        command: str,
        args: List[str],
        timeout: Optional[int] = None,
        callback: Optional[callable] = None
    ) -> ProcessInfo:
        """Start a new process."""
        if process_id in self.processes:
            await self.terminate_process(process_id)

        info = ProcessInfo(command=command, args=args)
        self.process_info[process_id] = info

        try:
            process = await asyncio.create_subprocess_exec(
                command,
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=os.setsid if os.name != 'nt' else None  # Unix process group
            )

            self.processes[process_id] = process
            info.pid = process.pid

            # Start monitoring task
            asyncio.create_task(
                self._monitor_process(process_id, process, timeout, callback)
            )

            return info

        except Exception as e:
            info.status = ProcessStatus.FAILED
            info.error = str(e)
            info.end_time = time.time()
            return info

    async def _monitor_process(
        self,
        process_id: str,
        process: asyncio.subprocess.Process,
        timeout: Optional[int],
        callback: Optional[callable]
    ) -> None:
        """Monitor a process until completion."""
        info = self.process_info[process_id]

        try:
            if timeout:
                await asyncio.wait_for(process.wait(), timeout=timeout)
            else:
                await process.wait()

            info.return_code = process.returncode
            info.status = ProcessStatus.COMPLETED if process.returncode == 0 else ProcessStatus.FAILED

        except asyncio.TimeoutError:
            info.status = ProcessStatus.TIMEOUT
            await self._kill_process_group(process)
        except asyncio.CancelledError:
            info.status = ProcessStatus.CANCELLED
            await self._kill_process_group(process)
        except Exception as e:
            info.status = ProcessStatus.FAILED
            info.error = str(e)
        finally:
            info.end_time = time.time()
            if process_id in self.processes:
                del self.processes[process_id]

            # Call callback if provided
            if callback:
                try:
                    await callback(process_id, info)
                except Exception as e:
                    logger.error(f"Process callback error: {e}")

    async def _kill_process_group(self, process: asyncio.subprocess.Process) -> None:
        """Kill process and its children."""
        if process.pid:
            try:
                if os.name != 'nt':  # Unix
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    await asyncio.sleep(2)  # Give time for graceful shutdown
                    try:
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    except ProcessLookupError:
                        pass  # Process already terminated
                else:  # Windows
                    process.terminate()
                    await asyncio.sleep(2)
                    try:
                        process.kill()
                    except ProcessLookupError:
                        pass
            except (ProcessLookupError, PermissionError):
                pass  # Process already gone or permission denied

    async def terminate_process(self, process_id: str) -> bool:
        """Gracefully terminate a process."""
        if process_id not in self.processes:
            return False

        process = self.processes[process_id]
        info = self.process_info.get(process_id)

        try:
            process.terminate()
            await asyncio.wait_for(process.wait(), timeout=5)
            if info:
                info.status = ProcessStatus.CANCELLED
            return True
        except asyncio.TimeoutError:
            # Force kill if graceful termination fails
            await self._kill_process_group(process)
            if info:
                info.status = ProcessStatus.CANCELLED
            return True
        except Exception as e:
            logger.error(f"Error terminating process {process_id}: {e}")
            return False

    async def kill_process(self, process_id: str) -> bool:
        """Force kill a process."""
        if process_id not in self.processes:
            return False

        process = self.processes[process_id]
        await self._kill_process_group(process)
        return True

    def get_process_info(self, process_id: str) -> Optional[ProcessInfo]:
        """Get information about a process."""
        return self.process_info.get(process_id)

    def list_active_processes(self) -> List[str]:
        """List all active process IDs."""
        return list(self.processes.keys())

    async def cleanup_all(self) -> None:
        """Clean up all running processes."""
        for process_id in list(self.processes.keys()):
            await self.terminate_process(process_id)

# Integration with Textual
class ProcessAwareScreen(Screen):
    """Base screen that manages subprocess lifecycle."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.process_manager = ProcessManager()

    async def on_unmount(self) -> None:
        """Clean up processes when screen is unmounted."""
        await self.process_manager.cleanup_all()

    async def start_oauth_process(
        self,
        process_name: str,
        command: str,
        args: List[str],
        progress_callback: Optional[callable] = None
    ) -> ProcessInfo:
        """Start an OAuth-related process."""
        return await self.process_manager.start_process(
            process_name,
            command,
            args,
            timeout=300,  # 5 minute timeout
            callback=progress_callback
        )
```

### JSON Data Exchange

Structured data exchange between Python and Node.js:

```python
import json
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import base64

class OAuthDataExchange:
    """Handle JSON data exchange with OAuth CLI."""

    @staticmethod
    def serialize_request(data: Dict[str, Any]) -> str:
        """Serialize request data to JSON string."""
        # Convert datetime objects to ISO format
        def datetime_serializer(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

        return json.dumps(data, default=datetime_serializer, indent=2)

    @staticmethod
    def deserialize_response(json_str: str) -> Dict[str, Any]:
        """Deserialize JSON response from CLI."""
        try:
            data = json.loads(json_str)

            # Convert ISO datetime strings back to datetime objects
            def convert_timestamps(obj):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        if key.endswith(('_at', '_time')) and isinstance(value, str):
                            try:
                                obj[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                            except ValueError:
                                pass  # Keep as string if not valid datetime
                        elif isinstance(value, (dict, list)):
                            convert_timestamps(value)
                elif isinstance(obj, list):
                    for item in obj:
                        convert_timestamps(item)
                return obj

            return convert_timestamps(data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response: {e}")

    @staticmethod
    def format_oauth_config(
        provider: str,
        client_id: str,
        client_secret: str,
        auth_url: str,
        token_url: str,
        scope: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Format OAuth provider configuration."""
        config = {
            "provider": provider,
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_url": auth_url,
            "token_url": token_url,
            "created_at": datetime.now(),
            **kwargs
        }

        if scope:
            config["scope"] = scope

        return config

    @staticmethod
    def parse_token_response(response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate token response from CLI."""
        required_fields = ["access_token", "token_type"]

        for field in required_fields:
            if field not in response:
                raise ValueError(f"Missing required field: {field}")

        # Calculate expiration time if expires_in is provided
        if "expires_in" in response and isinstance(response["expires_in"], int):
            expires_at = datetime.now()
            expires_at = expires_at.replace(microsecond=0)  # Remove microseconds
            expires_at = expires_at.timestamp() + response["expires_in"]
            response["expires_at"] = datetime.fromtimestamp(expires_at)

        # Decode JWT if it's a JWT token
        if response.get("token_type", "").lower() == "bearer":
            token = response["access_token"]
            if OAuthDataExchange.is_jwt_token(token):
                response["jwt_claims"] = OAuthDataExchange.decode_jwt_claims(token)

        return response

    @staticmethod
    def is_jwt_token(token: str) -> bool:
        """Check if a token is a JWT."""
        return len(token.split('.')) == 3

    @staticmethod
    def decode_jwt_claims(token: str) -> Dict[str, Any]:
        """Decode JWT claims without verification."""
        try:
            # Split token and decode payload
            parts = token.split('.')
            if len(parts) != 3:
                return {}

            # Add padding if necessary
            payload = parts[1]
            missing_padding = len(payload) % 4
            if missing_padding:
                payload += '=' * (4 - missing_padding)

            decoded_bytes = base64.urlsafe_b64decode(payload)
            claims = json.loads(decoded_bytes.decode('utf-8'))

            # Convert timestamps to datetime objects
            timestamp_fields = ['exp', 'iat', 'nbf', 'auth_time']
            for field in timestamp_fields:
                if field in claims and isinstance(claims[field], int):
                    claims[field] = datetime.fromtimestamp(claims[field])

            return claims
        except Exception:
            return {}

class ConfigManager:
    """Manage configuration files for OAuth providers."""

    def __init__(self, config_dir: Path = Path.home() / ".oauth-client"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)
        self.providers_file = self.config_dir / "providers.json"

    async def load_providers(self) -> Dict[str, Dict[str, Any]]:
        """Load provider configurations."""
        if not self.providers_file.exists():
            return {}

        try:
            with open(self.providers_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error loading providers config: {e}")
            return {}

    async def save_provider(self, provider_name: str, config: Dict[str, Any]) -> bool:
        """Save a provider configuration."""
        try:
            providers = await self.load_providers()
            providers[provider_name] = {
                **config,
                "updated_at": datetime.now().isoformat()
            }

            with open(self.providers_file, 'w') as f:
                json.dump(providers, f, indent=2, default=str)

            return True
        except Exception as e:
            logger.error(f"Error saving provider config: {e}")
            return False

    async def delete_provider(self, provider_name: str) -> bool:
        """Delete a provider configuration."""
        try:
            providers = await self.load_providers()
            if provider_name in providers:
                del providers[provider_name]

                with open(self.providers_file, 'w') as f:
                    json.dump(providers, f, indent=2, default=str)

                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting provider config: {e}")
            return False
```

### File System Operations

Manage configuration and token files:

```python
import aiofiles
import aiofiles.os
from pathlib import Path
import fcntl
import tempfile
import shutil
from typing import Dict, Any, List

class FileManager:
    """Async file operations for OAuth client."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path.home() / ".oauth-client"
        self.tokens_dir = self.base_dir / "tokens"
        self.config_dir = self.base_dir / "config"
        self.logs_dir = self.base_dir / "logs"

    async def initialize(self) -> None:
        """Initialize directory structure."""
        for directory in [self.base_dir, self.tokens_dir, self.config_dir, self.logs_dir]:
            await aiofiles.os.makedirs(directory, exist_ok=True)

    async def read_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Read and parse JSON file."""
        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                return json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    async def write_json_file(self, file_path: Path, data: Dict[str, Any]) -> bool:
        """Write data to JSON file with atomic operation."""
        try:
            # Write to temporary file first
            temp_file = file_path.with_suffix('.tmp')

            async with aiofiles.open(temp_file, 'w') as f:
                await f.write(json.dumps(data, indent=2, default=str))

            # Atomic move
            await aiofiles.os.rename(temp_file, file_path)
            return True
        except Exception as e:
            logger.error(f"Error writing JSON file {file_path}: {e}")
            # Clean up temp file if it exists
            try:
                await aiofiles.os.unlink(temp_file)
            except FileNotFoundError:
                pass
            return False

    async def backup_file(self, file_path: Path) -> Optional[Path]:
        """Create a backup of a file."""
        if not file_path.exists():
            return None

        backup_path = file_path.with_suffix(f'.bak.{int(time.time())}')
        try:
            shutil.copy2(file_path, backup_path)
            return backup_path
        except Exception as e:
            logger.error(f"Error creating backup of {file_path}: {e}")
            return None

    async def list_token_files(self) -> List[Path]:
        """List all token files."""
        try:
            return [f for f in self.tokens_dir.iterdir() if f.suffix == '.json']
        except Exception:
            return []

    async def secure_delete(self, file_path: Path) -> bool:
        """Securely delete a file by overwriting it."""
        try:
            if not file_path.exists():
                return True

            file_size = file_path.stat().st_size

            # Overwrite with random data multiple times
            import os
            for _ in range(3):
                with open(file_path, 'r+b') as f:
                    f.write(os.urandom(file_size))
                    f.flush()
                    os.fsync(f.fileno())

            # Finally delete the file
            await aiofiles.os.unlink(file_path)
            return True
        except Exception as e:
            logger.error(f"Error securely deleting {file_path}: {e}")
            return False
```

## 4. Testing with Textual

### Unit Testing Textual Apps

Textual provides excellent testing support through the `App.run_test()` method:

```python
import pytest
from textual.widgets import Button, Input, Label
from textual.events import Click, Key
from oauth_tui.app import OAuthClientApp
from oauth_tui.screens import ConfigScreen, TokenScreen

class TestOAuthApp:
    """Test suite for the OAuth TUI application."""

    @pytest.mark.asyncio
    async def test_app_startup(self):
        """Test that the app starts correctly."""
        app = OAuthClientApp()

        async with app.run_test() as pilot:
            # Check that the app started
            assert app.is_running

            # Check that the main screen is loaded
            assert app.screen.id == "main"

    @pytest.mark.asyncio
    async def test_navigation_to_config(self):
        """Test navigation to configuration screen."""
        app = OAuthClientApp()

        async with app.run_test() as pilot:
            # Click on configuration button
            await pilot.click("#config-button")

            # Wait for navigation
            await pilot.pause()

            # Check that we're on the config screen
            assert isinstance(app.screen, ConfigScreen)

    @pytest.mark.asyncio
    async def test_provider_configuration_form(self):
        """Test provider configuration form validation."""
        app = OAuthClientApp()

        async with app.run_test() as pilot:
            # Navigate to config screen
            app.push_screen("config")
            await pilot.pause()

            # Fill in form fields
            await pilot.click("#provider_name")
            await pilot.type("test-provider")

            await pilot.click("#client_id")
            await pilot.type("test-client-id")

            await pilot.click("#auth_url")
            await pilot.type("https://auth.example.com/oauth2/auth")

            # Submit the form
            await pilot.click("#save")
            await pilot.pause()

            # Check that the form was submitted successfully
            status = app.screen.query_one("#form-status")
            assert "success" in status.classes

    @pytest.mark.asyncio
    async def test_token_table_loading(self):
        """Test token table data loading."""
        app = OAuthClientApp()

        # Mock the CLI client to return test data
        app.cli_client.list_tokens = AsyncMock(return_value=[
            {
                "id": "token1",
                "provider": "google",
                "token_type": "Bearer",
                "expires_at": "2024-12-31T23:59:59Z",
                "scope": "openid profile",
                "valid": True
            }
        ])

        async with app.run_test() as pilot:
            # Navigate to tokens screen
            app.push_screen("tokens")
            await pilot.pause(0.5)  # Allow time for async loading

            # Check that the token table has data
            table = app.screen.query_one("#token-table")
            assert table.row_count == 1

    @pytest.mark.asyncio
    async def test_jwt_inspector(self):
        """Test JWT inspector functionality."""
        app = OAuthClientApp()
        test_jwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.signature"

        async with app.run_test() as pilot:
            # Navigate to JWT inspector
            app.push_screen("jwt_inspector")
            await pilot.pause()

            # Enter JWT token
            await pilot.click("#jwt-input")
            await pilot.type(test_jwt)

            # Click decode button
            await pilot.click("#decode-btn")
            await pilot.pause()

            # Check that JWT was decoded
            header_tab = app.screen.query_one("#header-tab")
            assert "alg" in str(header_tab.renderable)

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling in CLI operations."""
        app = OAuthClientApp()

        # Mock CLI client to return error
        app.cli_client.execute_command = AsyncMock(
            return_value={"success": False, "error": "Connection failed"}
        )

        async with app.run_test() as pilot:
            # Try to perform an operation that will fail
            app.push_screen("config")
            await pilot.pause()

            await pilot.click("#test")
            await pilot.pause()

            # Check that error is displayed
            status = app.screen.query_one("#form-status")
            assert "error" in status.classes
            assert "Connection failed" in status.renderable.plain

class TestOAuthCLIClient:
    """Test suite for OAuth CLI client integration."""

    @pytest.mark.asyncio
    async def test_execute_command_success(self):
        """Test successful command execution."""
        client = OAuthCLIClient()

        # Mock subprocess execution
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = AsyncMock()
            mock_process.communicate = AsyncMock(
                return_value=(b'{"success": true, "data": "test"}', b'')
            )
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process

            result = await client.execute_command("test-command")

            assert result["success"] is True
            assert result["data"] == "test"

    @pytest.mark.asyncio
    async def test_execute_command_timeout(self):
        """Test command timeout handling."""
        client = OAuthCLIClient()

        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = AsyncMock()
            mock_process.communicate = AsyncMock(
                side_effect=asyncio.TimeoutError()
            )
            mock_subprocess.return_value = mock_process

            result = await client.execute_command("test-command", timeout=1)

            assert result["success"] is False
            assert "timeout" in result["error"].lower()

class TestProcessManager:
    """Test subprocess management functionality."""

    @pytest.mark.asyncio
    async def test_start_process(self):
        """Test starting a process."""
        manager = ProcessManager()

        info = await manager.start_process(
            "test-process",
            "echo",
            ["hello world"]
        )

        assert info.command == "echo"
        assert info.args == ["hello world"]
        assert info.status == ProcessStatus.RUNNING

        # Wait for process to complete
        await asyncio.sleep(0.1)

        final_info = manager.get_process_info("test-process")
        assert final_info.status == ProcessStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_terminate_process(self):
        """Test process termination."""
        manager = ProcessManager()

        # Start a long-running process
        await manager.start_process(
            "long-process",
            "sleep",
            ["10"]
        )

        # Terminate it
        success = await manager.terminate_process("long-process")
        assert success

        # Check status
        info = manager.get_process_info("long-process")
        assert info.status == ProcessStatus.CANCELLED

# Fixtures for testing
@pytest.fixture
def mock_cli_client():
    """Mock OAuth CLI client."""
    client = AsyncMock(spec=OAuthCLIClient)
    client.list_tokens.return_value = []
    client.execute_command.return_value = {"success": True}
    return client

@pytest.fixture
def oauth_app(mock_cli_client):
    """OAuth app with mocked CLI client."""
    app = OAuthClientApp()
    app.cli_client = mock_cli_client
    return app
```

### Snapshot Testing for UI

Textual supports snapshot testing to catch visual regressions:

```python
# test_snapshots.py
import pytest
from pathlib import Path

# Test configurations for different scenarios
SNAPSHOT_CONFIG = {
    "terminal_size": (100, 40),
    "press": [],
    "run_before": None
}

def test_main_screen_snapshot(snap_compare):
    """Test main screen appearance."""
    assert snap_compare(
        "oauth_tui/app.py",
        terminal_size=(120, 30)
    )

def test_config_form_snapshot(snap_compare):
    """Test configuration form appearance."""
    async def setup_form(pilot):
        # Navigate to config screen
        await pilot.click("#config-button")
        await pilot.pause()

    assert snap_compare(
        "oauth_tui/app.py",
        run_before=setup_form,
        terminal_size=(120, 40)
    )

def test_token_table_with_data_snapshot(snap_compare):
    """Test token table with sample data."""
    assert snap_compare(
        "oauth_tui/test_apps/token_table_with_data.py",
        terminal_size=(140, 30)
    )

def test_jwt_inspector_decoded_snapshot(snap_compare):
    """Test JWT inspector with decoded token."""
    test_jwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.signature"

    async def decode_jwt(pilot):
        await pilot.click("#jwt-input")
        await pilot.type(test_jwt)
        await pilot.click("#decode-btn")
        await pilot.pause()

    assert snap_compare(
        "oauth_tui/screens/jwt_inspector.py",
        run_before=decode_jwt,
        terminal_size=(120, 35)
    )

def test_error_dialog_snapshot(snap_compare):
    """Test error dialog appearance."""
    async def show_error(pilot):
        await pilot.press("ctrl+e")  # Trigger error dialog
        await pilot.pause()

    assert snap_compare(
        "oauth_tui/app.py",
        run_before=show_error
    )

def test_responsive_layout_small_terminal(snap_compare):
    """Test layout on small terminal."""
    assert snap_compare(
        "oauth_tui/app.py",
        terminal_size=(60, 20)
    )

def test_responsive_layout_large_terminal(snap_compare):
    """Test layout on large terminal."""
    assert snap_compare(
        "oauth_tui/app.py",
        terminal_size=(160, 50)
    )

# Test different themes
def test_dark_mode_snapshot(snap_compare):
    """Test dark mode appearance."""
    async def enable_dark_mode(pilot):
        await pilot.press("d")  # Toggle dark mode
        await pilot.pause()

    assert snap_compare(
        "oauth_tui/app.py",
        run_before=enable_dark_mode
    )

# Interactive flow testing
def test_oauth_flow_progress_snapshot(snap_compare):
    """Test OAuth flow progress display."""
    async def start_flow(pilot):
        await pilot.click("#start-auth-flow")
        await pilot.pause(0.5)  # Let progress start

    assert snap_compare(
        "oauth_tui/screens/oauth_flow.py",
        run_before=start_flow,
        terminal_size=(120, 40)
    )
```

### Integration Testing

Test the full integration between Python TUI and Node.js CLI:

```python
# test_integration.py
import pytest
import asyncio
import tempfile
from pathlib import Path
from oauth_tui.app import OAuthClientApp
from oauth_tui.cli_client import OAuthCLIClient

@pytest.mark.integration
class TestCLIIntegration:
    """Integration tests with real OAuth CLI."""

    @pytest.fixture(scope="class")
    async def temp_config_dir(self):
        """Create temporary config directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    async def cli_client(self, temp_config_dir):
        """Real CLI client with test configuration."""
        client = OAuthCLIClient()
        # Override config directory for testing
        client.config_dir = temp_config_dir
        return client

    @pytest.mark.asyncio
    async def test_cli_available(self, cli_client):
        """Test that OAuth CLI is available."""
        result = await cli_client.execute_command("--version")
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_provider_config_roundtrip(self, cli_client):
        """Test saving and loading provider configuration."""
        # Save provider config
        config = {
            "client_id": "test-client-id",
            "client_secret": "test-secret",
            "auth_url": "https://auth.example.com/oauth2/auth",
            "token_url": "https://auth.example.com/oauth2/token"
        }

        success = await cli_client.set_provider_config("test-provider", config)
        assert success

        # Load provider config
        loaded_config = await cli_client.get_provider_config("test-provider")
        assert loaded_config is not None
        assert loaded_config["client_id"] == "test-client-id"

    @pytest.mark.asyncio
    async def test_token_management(self, cli_client):
        """Test token storage and retrieval."""
        # Initially should have no tokens
        tokens = await cli_client.list_tokens()
        assert len(tokens) == 0

        # This would require a real OAuth provider setup
        # or mocking the OAuth endpoints
        pytest.skip("Requires OAuth provider setup")

    @pytest.mark.asyncio
    async def test_jwt_validation(self, cli_client):
        """Test JWT token validation."""
        # Test with invalid JWT
        result = await cli_client.validate_jwt("invalid.jwt.token")
        assert result["success"] is False

        # Test with valid but unsigned JWT (for testing)
        import json
        import base64

        header = json.dumps({"alg": "none", "typ": "JWT"})
        payload = json.dumps({"sub": "test", "exp": 9999999999})

        header_b64 = base64.urlsafe_b64encode(header.encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')

        test_jwt = f"{header_b64}.{payload_b64}."

        result = await cli_client.validate_jwt(test_jwt)
        # This might fail if CLI requires signed tokens
        # Adjust based on CLI implementation

@pytest.mark.integration
class TestFullApplicationFlow:
    """End-to-end application testing."""

    @pytest.mark.asyncio
    async def test_complete_oauth_flow(self):
        """Test complete OAuth authorization flow."""
        # This would require:
        # 1. Mock OAuth provider
        # 2. Browser automation
        # 3. Callback handling
        pytest.skip("Requires full OAuth mock setup")

    @pytest.mark.asyncio
    async def test_error_recovery(self):
        """Test application recovery from CLI errors."""
        app = OAuthClientApp()

        async with app.run_test() as pilot:
            # Simulate CLI unavailable
            app.cli_client.execute_command = AsyncMock(
                side_effect=RuntimeError("CLI not found")
            )

            # Try to perform operation
            await pilot.click("#refresh-tokens")
            await pilot.pause()

            # App should handle error gracefully
            assert app.is_running
            # Check for error notification
            assert len(app.screen.query(".notification")) > 0
```

### Mocking External Calls

Comprehensive mocking strategies for testing:

```python
# test_mocking.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from oauth_tui.cli_client import OAuthCLIClient
from oauth_tui.app import OAuthClientApp

class MockOAuthProvider:
    """Mock OAuth provider for testing."""

    def __init__(self):
        self.tokens = {}
        self.configs = {}

    def add_provider_config(self, name: str, config: dict):
        """Add a mock provider configuration."""
        self.configs[name] = config

    def add_token(self, token_id: str, token_data: dict):
        """Add a mock token."""
        self.tokens[token_id] = token_data

    async def mock_list_tokens(self):
        """Mock token listing."""
        return list(self.tokens.values())

    async def mock_get_token(self, token_id: str):
        """Mock token retrieval."""
        return self.tokens.get(token_id)

    async def mock_delete_token(self, token_id: str):
        """Mock token deletion."""
        if token_id in self.tokens:
            del self.tokens[token_id]
            return True
        return False

@pytest.fixture
def mock_oauth_provider():
    """Mock OAuth provider fixture."""
    provider = MockOAuthProvider()

    # Add some default test data
    provider.add_provider_config("google", {
        "client_id": "google-client-id",
        "client_secret": "google-secret",
        "auth_url": "https://accounts.google.com/o/oauth2/auth",
        "token_url": "https://oauth2.googleapis.com/token"
    })

    provider.add_token("token1", {
        "id": "token1",
        "provider": "google",
        "access_token": "ya29.test-token",
        "token_type": "Bearer",
        "expires_at": "2024-12-31T23:59:59Z",
        "scope": "openid profile email",
        "valid": True
    })

    return provider

@pytest.fixture
def mock_subprocess():
    """Mock subprocess calls."""
    with patch('asyncio.create_subprocess_exec') as mock_exec:
        mock_process = AsyncMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(
            return_value=(b'{"success": true}', b'')
        )
        mock_exec.return_value = mock_process
        yield mock_exec

class TestWithMockedCLI:
    """Tests using mocked CLI responses."""

    @pytest.mark.asyncio
    async def test_app_with_mocked_tokens(self, mock_oauth_provider):
        """Test app with mocked token data."""
        app = OAuthClientApp()

        # Replace CLI client methods with mocks
        app.cli_client.list_tokens = mock_oauth_provider.mock_list_tokens
        app.cli_client.get_token = mock_oauth_provider.mock_get_token
        app.cli_client.delete_token = mock_oauth_provider.mock_delete_token

        async with app.run_test() as pilot:
            # Navigate to tokens screen
            app.push_screen("tokens")
            await pilot.pause(0.5)

            # Should load the mock token
            table = app.screen.query_one("#token-table")
            assert table.row_count == 1

            # Test token deletion
            await pilot.click("[data-key='token1'] .delete-button")
            await pilot.pause()

            # Confirm deletion
            await pilot.press("y")
            await pilot.pause()

            # Token should be removed
            assert table.row_count == 0

    @pytest.mark.asyncio
    async def test_cli_error_scenarios(self, mock_subprocess):
        """Test various CLI error scenarios."""
        client = OAuthCLIClient()

        # Test command not found
        mock_subprocess.side_effect = FileNotFoundError()
        result = await client.execute_command("test")
        assert result["success"] is False
        assert "error" in result

        # Test command timeout
        mock_subprocess.reset_mock()
        mock_process = AsyncMock()
        mock_process.communicate = AsyncMock(
            side_effect=asyncio.TimeoutError()
        )
        mock_subprocess.return_value = mock_process
        mock_subprocess.side_effect = None

        result = await client.execute_command("test", timeout=1)
        assert result["success"] is False
        assert "timeout" in result["error"]

        # Test command failure
        mock_subprocess.reset_mock()
        mock_process = AsyncMock()
        mock_process.returncode = 1
        mock_process.communicate = AsyncMock(
            return_value=(b'', b'Command failed')
        )
        mock_subprocess.return_value = mock_process

        result = await client.execute_command("test")
        assert result["success"] is False
        assert "Command failed" in result["error"]

    @pytest.mark.asyncio
    async def test_network_operations_mock(self):
        """Test network operations with mocked responses."""
        app = OAuthClientApp()

        # Mock successful OAuth flow
        async def mock_oauth_flow(*args, **kwargs):
            return {
                "success": True,
                "access_token": "mock-token",
                "token_type": "Bearer",
                "expires_in": 3600
            }

        app.cli_client.start_authorization_code_flow = mock_oauth_flow

        async with app.run_test() as pilot:
            # Start OAuth flow
            app.push_screen("oauth_flow")
            await pilot.pause()

            await pilot.click("#start-flow")
            await pilot.pause(1)

            # Should show success
            status = app.screen.query_one("#flow-status")
            assert "success" in status.renderable.plain.lower()

# Performance testing helpers
class TestPerformance:
    """Performance tests for TUI components."""

    @pytest.mark.asyncio
    async def test_large_token_table_performance(self):
        """Test performance with large number of tokens."""
        app = OAuthClientApp()

        # Generate large dataset
        large_token_list = [
            {
                "id": f"token{i}",
                "provider": f"provider{i % 10}",
                "access_token": f"token-{i}",
                "token_type": "Bearer",
                "expires_at": "2024-12-31T23:59:59Z",
                "valid": True
            }
            for i in range(1000)
        ]

        app.cli_client.list_tokens = AsyncMock(return_value=large_token_list)

        import time
        start_time = time.time()

        async with app.run_test() as pilot:
            app.push_screen("tokens")
            await pilot.pause(0.5)

        load_time = time.time() - start_time

        # Should load within reasonable time (adjust threshold as needed)
        assert load_time < 2.0, f"Token table took {load_time:.2f}s to load"

    @pytest.mark.asyncio
    async def test_rapid_navigation_performance(self):
        """Test performance under rapid navigation."""
        app = OAuthClientApp()

        async with app.run_test() as pilot:
            # Rapidly switch between screens
            for _ in range(10):
                app.push_screen("config")
                await pilot.pause(0.1)
                app.pop_screen()
                await pilot.pause(0.1)

            # App should remain responsive
            assert app.is_running
```

## 5. Project Structure Recommendations

### Directory Layout

Organize your Python Textual OAuth TUI project with a clear, maintainable structure:

```
oauth_tui/
├── pyproject.toml              # Project configuration and dependencies
├── README.md                   # Project documentation
├── CHANGELOG.md                # Version history
├── requirements.txt            # Alternative dependency specification
├── .gitignore                  # Git ignore patterns
├── .env.example                # Environment variable examples
│
├── oauth_tui/                  # Main application package
│   ├── __init__.py
│   ├── __main__.py             # Entry point for python -m oauth_tui
│   ├── main.py                 # Main application entry point
│   ├── app.py                  # Main Textual application class
│   ├── config.py               # Configuration management
│   ├── constants.py            # Application constants
│   │
│   ├── screens/                # Textual screens
│   │   ├── __init__.py
│   │   ├── base.py             # Base screen classes
│   │   ├── main_menu.py        # Main menu screen
│   │   ├── config.py           # Configuration screens
│   │   ├── tokens.py           # Token management screens
│   │   ├── oauth_flows.py      # OAuth flow screens
│   │   ├── jwt_inspector.py    # JWT inspector screen
│   │   └── help.py             # Help and documentation screens
│   │
│   ├── widgets/                # Custom Textual widgets
│   │   ├── __init__.py
│   │   ├── forms.py            # Form widgets
│   │   ├── tables.py           # Table widgets
│   │   ├── dialogs.py          # Modal dialogs
│   │   ├── progress.py         # Progress indicators
│   │   └── navigation.py       # Navigation widgets
│   │
│   ├── components/             # Reusable UI components
│   │   ├── __init__.py
│   │   ├── oauth_form.py       # OAuth configuration form
│   │   ├── token_table.py      # Token display table
│   │   ├── jwt_viewer.py       # JWT viewer component
│   │   └── status_bar.py       # Status bar component
│   │
│   ├── cli/                    # CLI integration layer
│   │   ├── __init__.py
│   │   ├── client.py           # OAuth CLI client
│   │   ├── commands.py         # Command definitions
│   │   ├── process_manager.py  # Subprocess management
│   │   └── data_exchange.py    # JSON data handling
│   │
│   ├── models/                 # Data models
│   │   ├── __init__.py
│   │   ├── token.py            # Token models
│   │   ├── provider.py         # OAuth provider models
│   │   ├── config.py           # Configuration models
│   │   └── jwt.py              # JWT models
│   │
│   ├── services/               # Business logic services
│   │   ├── __init__.py
│   │   ├── token_service.py    # Token management service
│   │   ├── config_service.py   # Configuration service
│   │   ├── oauth_service.py    # OAuth flow service
│   │   └── file_service.py     # File operations service
│   │
│   ├── utils/                  # Utility modules
│   │   ├── __init__.py
│   │   ├── logger.py           # Logging configuration
│   │   ├── crypto.py           # Cryptographic utilities
│   │   ├── validation.py       # Input validation
│   │   ├── formatters.py       # Data formatting
│   │   └── exceptions.py       # Custom exceptions
│   │
│   └── assets/                 # Static assets
│       ├── styles/             # CSS/TCSS files
│       │   ├── main.tcss       # Main stylesheet
│       │   ├── forms.tcss      # Form styles
│       │   ├── tables.tcss     # Table styles
│       │   └── themes/         # Theme variations
│       │       ├── dark.tcss
│       │       └── light.tcss
│       │
│       └── templates/          # Configuration templates
│           ├── google.json     # Google OAuth template
│           ├── github.json     # GitHub OAuth template
│           └── azure.json      # Azure OAuth template
│
├── tests/                      # Test suite
│   ├── __init__.py
│   ├── conftest.py            # Pytest configuration and fixtures
│   ├── test_app.py            # Application tests
│   ├── test_cli.py            # CLI integration tests
│   ├── test_models.py         # Model tests
│   ├── test_services.py       # Service tests
│   ├── test_widgets.py        # Widget tests
│   ├── test_integration.py    # Integration tests
│   │
│   ├── snapshots/             # Snapshot test files
│   │   ├── test_main_screen.svg
│   │   ├── test_config_form.svg
│   │   └── ...
│   │
│   ├── fixtures/              # Test fixtures
│   │   ├── sample_tokens.json
│   │   ├── test_config.json
│   │   └── mock_responses.json
│   │
│   └── mocks/                 # Mock objects
│       ├── __init__.py
│       ├── oauth_provider.py
│       └── cli_responses.py
│
├── docs/                      # Documentation
│   ├── README.md
│   ├── installation.md
│   ├── configuration.md
│   ├── usage.md
│   ├── development.md
│   ├── api.md
│   └── screenshots/           # Application screenshots
│
├── scripts/                   # Utility scripts
│   ├── setup_dev.py          # Development environment setup
│   ├── build.py              # Build script
│   ├── release.py            # Release automation
│   └── generate_templates.py # Generate OAuth templates
│
└── examples/                  # Example configurations
    ├── basic_setup.py
    ├── custom_provider.py
    └── advanced_config.py
```

### Module Organization

Structure your modules with clear separation of concerns:

```python
# oauth_tui/__init__.py
"""OAuth TUI - Terminal User Interface for OAuth testing."""

__version__ = "1.0.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .app import OAuthTUIApp
from .config import Config

__all__ = ["OAuthTUIApp", "Config"]

# oauth_tui/__main__.py
"""Entry point for python -m oauth_tui."""

if __name__ == "__main__":
    from .main import main
    main()

# oauth_tui/main.py
"""Main application entry point."""

import asyncio
import sys
from pathlib import Path
import click
import logging

from .app import OAuthTUIApp
from .config import Config
from .utils.logger import setup_logging

@click.command()
@click.option(
    "--config-dir",
    type=click.Path(path_type=Path),
    default=Path.home() / ".oauth-tui",
    help="Configuration directory path"
)
@click.option(
    "--cli-path",
    type=click.Path(exists=True, path_type=Path),
    help="Path to OAuth CLI executable"
)
@click.option(
    "--log-level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"]),
    default="INFO",
    help="Logging level"
)
@click.option(
    "--theme",
    type=click.Choice(["dark", "light", "auto"]),
    default="auto",
    help="UI theme"
)
@click.version_option()
def main(config_dir: Path, cli_path: Path, log_level: str, theme: str):
    """OAuth TUI - Terminal User Interface for OAuth testing."""
    # Setup logging
    setup_logging(level=getattr(logging, log_level))

    # Load configuration
    config = Config(config_dir=config_dir)

    # Create and run app
    app = OAuthTUIApp(
        config=config,
        cli_path=cli_path,
        theme=theme
    )

    try:
        app.run()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        logging.error(f"Application error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

# oauth_tui/app.py
"""Main Textual application class."""

from typing import Optional
from pathlib import Path

from textual.app import App, ComposeResult
from textual.widgets import Header, Footer
from textual.binding import Binding

from .config import Config
from .cli.client import OAuthCLIClient
from .screens import (
    MainMenuScreen,
    ConfigScreen,
    TokenScreen,
    OAuthFlowScreen,
    JWTInspectorScreen,
    HelpScreen
)
from .utils.logger import get_logger

logger = get_logger(__name__)

class OAuthTUIApp(App[None]):
    """Main OAuth TUI application."""

    TITLE = "OAuth TUI"
    SUB_TITLE = "Terminal OAuth Testing Tool"

    CSS_PATH = "assets/styles/main.tcss"

    BINDINGS = [
        Binding("q", "quit", "Quit", priority=True),
        Binding("ctrl+q", "quit", "Quit"),
        Binding("d", "toggle_dark", "Toggle Dark Mode"),
        Binding("h", "help", "Help"),
        Binding("ctrl+r", "refresh", "Refresh"),
    ]

    SCREENS = {
        "main": MainMenuScreen,
        "config": ConfigScreen,
        "tokens": TokenScreen,
        "oauth_flow": OAuthFlowScreen,
        "jwt": JWTInspectorScreen,
        "help": HelpScreen,
    }

    def __init__(
        self,
        config: Config,
        cli_path: Optional[Path] = None,
        theme: str = "auto",
        **kwargs
    ):
        super().__init__(**kwargs)
        self.config = config
        self.cli_client = OAuthCLIClient(cli_path)
        self.theme = theme

        # Set theme
        if theme == "dark":
            self.dark = True
        elif theme == "light":
            self.dark = False
        # "auto" uses system default

    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        yield Header(show_clock=True)
        yield Footer()

    def on_mount(self) -> None:
        """Called when app starts."""
        logger.info("OAuth TUI starting...")
        self.push_screen("main")

    def action_toggle_dark(self) -> None:
        """Toggle dark mode."""
        self.dark = not self.dark

    def action_help(self) -> None:
        """Show help screen."""
        self.push_screen("help")

    def action_refresh(self) -> None:
        """Refresh current screen."""
        if hasattr(self.screen, "refresh_data"):
            self.screen.refresh_data()

# oauth_tui/config.py
"""Configuration management."""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field, asdict

from .utils.logger import get_logger

logger = get_logger(__name__)

@dataclass
class UIConfig:
    """UI configuration settings."""
    theme: str = "auto"
    terminal_size: tuple[int, int] = (120, 40)
    auto_refresh: bool = True
    refresh_interval: int = 30
    show_tooltips: bool = True

@dataclass
class CLIConfig:
    """CLI integration configuration."""
    cli_path: Optional[str] = None
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: float = 1.0

@dataclass
class SecurityConfig:
    """Security settings."""
    store_secrets: bool = False
    encryption_enabled: bool = True
    secure_delete: bool = True
    token_cache_ttl: int = 3600

@dataclass
class Config:
    """Main application configuration."""
    config_dir: Path = field(default_factory=lambda: Path.home() / ".oauth-tui")
    ui: UIConfig = field(default_factory=UIConfig)
    cli: CLIConfig = field(default_factory=CLIConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)

    def __post_init__(self):
        """Initialize configuration after creation."""
        self.config_dir = Path(self.config_dir)
        self.config_file = self.config_dir / "config.json"
        self.load()

    def load(self) -> None:
        """Load configuration from file."""
        if not self.config_file.exists():
            self.save()  # Create default config
            return

        try:
            with open(self.config_file, 'r') as f:
                data = json.load(f)

            # Update fields from loaded data
            if "ui" in data:
                self.ui = UIConfig(**data["ui"])
            if "cli" in data:
                self.cli = CLIConfig(**data["cli"])
            if "security" in data:
                self.security = SecurityConfig(**data["security"])

            logger.info(f"Configuration loaded from {self.config_file}")

        except Exception as e:
            logger.error(f"Error loading configuration: {e}")

    def save(self) -> None:
        """Save configuration to file."""
        try:
            self.config_dir.mkdir(parents=True, exist_ok=True)

            config_data = {
                "ui": asdict(self.ui),
                "cli": asdict(self.cli),
                "security": asdict(self.security)
            }

            with open(self.config_file, 'w') as f:
                json.dump(config_data, f, indent=2)

            logger.info(f"Configuration saved to {self.config_file}")

        except Exception as e:
            logger.error(f"Error saving configuration: {e}")

    def get_theme_path(self, theme: str) -> Optional[Path]:
        """Get path to theme CSS file."""
        themes_dir = Path(__file__).parent / "assets" / "styles" / "themes"
        theme_file = themes_dir / f"{theme}.tcss"

        if theme_file.exists():
            return theme_file

        return None
```

### Configuration Management

Implement robust configuration handling:

```python
# oauth_tui/services/config_service.py
"""Configuration service for managing OAuth providers and settings."""

import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..models.provider import OAuthProvider
from ..utils.crypto import encrypt_data, decrypt_data
from ..utils.exceptions import ConfigError
from ..utils.logger import get_logger

logger = get_logger(__name__)

class ConfigService:
    """Service for managing OAuth provider configurations."""

    def __init__(self, config_dir: Path):
        self.config_dir = config_dir
        self.providers_file = config_dir / "providers.json"
        self.secrets_file = config_dir / "secrets.enc"

        # Ensure config directory exists
        config_dir.mkdir(parents=True, exist_ok=True)

        # Load encryption key from environment
        self.encryption_key = os.environ.get("OAUTH_TUI_KEY")
        if not self.encryption_key:
            logger.warning("No encryption key found. Secrets will not be encrypted.")

    def list_providers(self) -> List[str]:
        """List all configured OAuth providers."""
        try:
            providers = self._load_providers()
            return list(providers.keys())
        except Exception as e:
            logger.error(f"Error listing providers: {e}")
            return []

    def get_provider(self, name: str) -> Optional[OAuthProvider]:
        """Get configuration for a specific provider."""
        try:
            providers = self._load_providers()
            if name not in providers:
                return None

            provider_data = providers[name]

            # Decrypt secrets if encryption is enabled
            if self.encryption_key and "client_secret" in provider_data:
                try:
                    provider_data["client_secret"] = decrypt_data(
                        provider_data["client_secret"],
                        self.encryption_key
                    )
                except Exception as e:
                    logger.error(f"Failed to decrypt secret for {name}: {e}")
                    provider_data["client_secret"] = ""

            return OAuthProvider.from_dict(provider_data)

        except Exception as e:
            logger.error(f"Error getting provider {name}: {e}")
            return None

    def save_provider(self, provider: OAuthProvider) -> bool:
        """Save provider configuration."""
        try:
            providers = self._load_providers()

            # Convert to dict and encrypt secrets
            provider_data = provider.to_dict()

            if self.encryption_key and provider_data.get("client_secret"):
                provider_data["client_secret"] = encrypt_data(
                    provider_data["client_secret"],
                    self.encryption_key
                )

            provider_data["updated_at"] = datetime.now().isoformat()
            providers[provider.name] = provider_data

            return self._save_providers(providers)

        except Exception as e:
            logger.error(f"Error saving provider {provider.name}: {e}")
            return False

    def delete_provider(self, name: str) -> bool:
        """Delete a provider configuration."""
        try:
            providers = self._load_providers()

            if name not in providers:
                return False

            del providers[name]
            return self._save_providers(providers)

        except Exception as e:
            logger.error(f"Error deleting provider {name}: {e}")
            return False

    def import_providers(self, file_path: Path) -> int:
        """Import providers from a file."""
        try:
            with open(file_path, 'r') as f:
                imported_providers = json.load(f)

            current_providers = self._load_providers()
            imported_count = 0

            for name, config in imported_providers.items():
                try:
                    provider = OAuthProvider.from_dict(config)
                    if self.save_provider(provider):
                        imported_count += 1
                except Exception as e:
                    logger.error(f"Error importing provider {name}: {e}")

            logger.info(f"Imported {imported_count} providers from {file_path}")
            return imported_count

        except Exception as e:
            logger.error(f"Error importing providers: {e}")
            return 0

    def export_providers(self, file_path: Path, include_secrets: bool = False) -> bool:
        """Export providers to a file."""
        try:
            providers = self._load_providers()

            if not include_secrets:
                # Remove secrets from export
                for provider_data in providers.values():
                    provider_data.pop("client_secret", None)

            with open(file_path, 'w') as f:
                json.dump(providers, f, indent=2, default=str)

            logger.info(f"Exported providers to {file_path}")
            return True

        except Exception as e:
            logger.error(f"Error exporting providers: {e}")
            return False

    def _load_providers(self) -> Dict[str, Dict[str, Any]]:
        """Load providers from file."""
        if not self.providers_file.exists():
            return {}

        try:
            with open(self.providers_file, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in providers file: {e}")
            raise ConfigError(f"Invalid configuration file: {e}")
        except Exception as e:
            logger.error(f"Error loading providers: {e}")
            return {}

    def _save_providers(self, providers: Dict[str, Dict[str, Any]]) -> bool:
        """Save providers to file."""
        try:
            # Create backup first
            if self.providers_file.exists():
                backup_file = self.providers_file.with_suffix('.bak')
                import shutil
                shutil.copy2(self.providers_file, backup_file)

            # Write new configuration
            with open(self.providers_file, 'w') as f:
                json.dump(providers, f, indent=2, default=str)

            logger.info(f"Providers saved to {self.providers_file}")
            return True

        except Exception as e:
            logger.error(f"Error saving providers: {e}")
            return False

    def validate_provider_config(self, provider: OAuthProvider) -> List[str]:
        """Validate provider configuration."""
        errors = []

        if not provider.name:
            errors.append("Provider name is required")

        if not provider.client_id:
            errors.append("Client ID is required")

        if not provider.auth_url:
            errors.append("Authorization URL is required")
        elif not provider.auth_url.startswith(("http://", "https://")):
            errors.append("Authorization URL must be a valid HTTP(S) URL")

        if not provider.token_url:
            errors.append("Token URL is required")
        elif not provider.token_url.startswith(("http://", "https://")):
            errors.append("Token URL must be a valid HTTP(S) URL")

        # Validate grant types
        valid_grant_types = {
            "authorization_code",
            "client_credentials",
            "password",
            "implicit",
            "device_code",
            "refresh_token"
        }

        for grant_type in provider.supported_grants:
            if grant_type not in valid_grant_types:
                errors.append(f"Invalid grant type: {grant_type}")

        return errors

# oauth_tui/models/provider.py
"""OAuth provider data models."""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime

@dataclass
class OAuthProvider:
    """OAuth provider configuration model."""

    name: str
    client_id: str
    client_secret: str = ""
    auth_url: str = ""
    token_url: str = ""
    scope: str = ""
    redirect_uri: str = "http://localhost:8080/callback"
    supported_grants: List[str] = field(default_factory=list)
    extra_params: Dict[str, str] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Initialize after creation."""
        if not self.created_at:
            self.created_at = datetime.now()

        if not self.supported_grants:
            self.supported_grants = ["authorization_code", "client_credentials"]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "OAuthProvider":
        """Create provider from dictionary."""
        # Convert datetime strings back to datetime objects
        if "created_at" in data and isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data and isinstance(data["updated_at"], str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])

        return cls(**data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert provider to dictionary."""
        result = {
            "name": self.name,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "auth_url": self.auth_url,
            "token_url": self.token_url,
            "scope": self.scope,
            "redirect_uri": self.redirect_uri,
            "supported_grants": self.supported_grants,
            "extra_params": self.extra_params,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

        return result

    def supports_grant_type(self, grant_type: str) -> bool:
        """Check if provider supports a grant type."""
        return grant_type in self.supported_grants
```

### Packaging and Distribution

Set up proper packaging with `pyproject.toml`:

```toml
# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "oauth-tui"
dynamic = ["version"]
description = "Terminal User Interface for OAuth testing"
readme = "README.md"
requires-python = ">=3.8"
license = "MIT"
keywords = ["oauth", "tui", "terminal", "textual", "authentication"]

authors = [
  {name = "Your Name", email = "your.email@example.com"},
]

maintainers = [
  {name = "Your Name", email = "your.email@example.com"},
]

classifiers = [
  "Development Status :: 4 - Beta",
  "Environment :: Console",
  "Intended Audience :: Developers",
  "License :: OSI Approved :: MIT License",
  "Operating System :: OS Independent",
  "Programming Language :: Python",
  "Programming Language :: Python :: 3.8",
  "Programming Language :: Python :: 3.9",
  "Programming Language :: Python :: 3.10",
  "Programming Language :: Python :: 3.11",
  "Programming Language :: Python :: 3.12",
  "Programming Language :: Python :: Implementation :: CPython",
  "Topic :: Software Development :: Testing",
  "Topic :: System :: Systems Administration :: Authentication/Directory",
  "Topic :: Terminals",
]

dependencies = [
  "textual>=0.44.0",
  "click>=8.0.0",
  "aiofiles>=23.0.0",
  "cryptography>=41.0.0",
  "pydantic>=2.0.0",
  "rich>=13.0.0",
  "httpx>=0.24.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=7.0.0",
  "pytest-asyncio>=0.21.0",
  "pytest-textual-snapshot>=0.4.0",
  "black>=23.0.0",
  "isort>=5.12.0",
  "flake8>=6.0.0",
  "mypy>=1.5.0",
  "coverage>=7.0.0",
]

test = [
  "pytest>=7.0.0",
  "pytest-asyncio>=0.21.0",
  "pytest-textual-snapshot>=0.4.0",
  "coverage>=7.0.0",
]

docs = [
  "sphinx>=7.0.0",
  "sphinx-rtd-theme>=1.3.0",
  "myst-parser>=2.0.0",
]

[project.urls]
Documentation = "https://github.com/yourusername/oauth-tui#readme"
Issues = "https://github.com/yourusername/oauth-tui/issues"
Source = "https://github.com/yourusername/oauth-tui"

[project.scripts]
oauth-tui = "oauth_tui.main:main"

[tool.hatch.version]
path = "oauth_tui/__init__.py"

[tool.hatch.build.targets.sdist]
exclude = [
  "/.github",
  "/docs",
  "/tests",
  "/examples",
]

[tool.hatch.build.targets.wheel]
packages = ["oauth_tui"]

# Testing configuration
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
  "--strict-markers",
  "--strict-config",
  "--disable-warnings",
  "-v",
]
markers = [
  "integration: marks tests as integration tests",
  "slow: marks tests as slow",
]
asyncio_mode = "auto"

# Code formatting
[tool.black]
line-length = 88
target-version = ["py38", "py39", "py310", "py311", "py312"]
include = '\.pyi?$'
extend-exclude = '''
/(
  \.git
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 88
known_first_party = ["oauth_tui"]

# Type checking
[tool.mypy]
python_version = "3.8"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true

[[tool.mypy.overrides]]
module = "textual.*"
ignore_missing_imports = true

# Coverage
[tool.coverage.run]
source = ["oauth_tui"]
omit = [
  "*/tests/*",
  "*/test_*",
  "*/__main__.py",
]

[tool.coverage.report]
exclude_lines = [
  "pragma: no cover",
  "def __repr__",
  "if self.debug:",
  "if settings.DEBUG",
  "raise AssertionError",
  "raise NotImplementedError",
  "if 0:",
  "if __name__ == .__main__.:",
  "class .*\\bProtocol\\):",
  "@(abc\\.)?abstractmethod",
]
show_missing = true
precision = 2

[tool.coverage.html]
directory = "htmlcov"
```

Create proper installation and development setup scripts:

```python
# scripts/setup_dev.py
"""Development environment setup script."""

import subprocess
import sys
from pathlib import Path

def run_command(cmd: list[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def main():
    """Setup development environment."""
    print("🚀 Setting up OAuth TUI development environment")

    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    success = True

    # Install in editable mode with dev dependencies
    success &= run_command(
        [sys.executable, "-m", "pip", "install", "-e", ".[dev]"],
        "Installing package in development mode"
    )

    # Install pre-commit hooks
    success &= run_command(
        [sys.executable, "-m", "pip", "install", "pre-commit"],
        "Installing pre-commit"
    )

    success &= run_command(
        ["pre-commit", "install"],
        "Installing pre-commit hooks"
    )

    # Create example configuration
    config_dir = Path.home() / ".oauth-tui"
    config_dir.mkdir(exist_ok=True)

    example_config = {
        "ui": {
            "theme": "auto",
            "auto_refresh": True
        },
        "cli": {
            "timeout": 30
        },
        "security": {
            "encryption_enabled": True
        }
    }

    import json
    config_file = config_dir / "config.json"
    if not config_file.exists():
        with open(config_file, 'w') as f:
            json.dump(example_config, f, indent=2)
        print(f"✅ Created example config at {config_file}")

    if success:
        print("\n🎉 Development environment setup complete!")
        print("\nNext steps:")
        print("1. Set up OAuth CLI (Node.js project)")
        print("2. Configure OAuth providers")
        print("3. Run tests: pytest")
        print("4. Start development: oauth-tui")
    else:
        print("\n⚠️  Some setup steps failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

This comprehensive guide provides you with everything needed to implement a professional OAuth TUI using Python Textual, including:

1. **Complete Textual fundamentals** with app structure, screens, widgets, layouts, event handling, and CSS styling
2. **OAuth-specific implementation patterns** for menus, forms, tables, JWT inspection, progress tracking, and modal dialogs
3. **Robust integration patterns** for calling Node.js CLI from Python with proper subprocess management, JSON data exchange, and file operations
4. **Comprehensive testing strategies** including unit tests, snapshot testing, integration testing, and mocking
5. **Professional project structure** with proper module organization, configuration management, and packaging

The guide follows Python and Textual best practices while providing specific solutions for OAuth client functionality. You can use this as a foundation to build a sophisticated TUI that rivals your existing React-based implementation.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive Textual fundamentals section with app structure, screens, widgets, and styling", "status": "completed", "activeForm": "Creating comprehensive Textual fundamentals section"}, {"content": "Document OAuth TUI implementation patterns including menus, forms, tables, and modals", "status": "completed", "activeForm": "Documenting OAuth TUI implementation patterns"}, {"content": "Provide integration patterns for calling Node.js CLI from Python with subprocess management", "status": "completed", "activeForm": "Providing integration patterns for Node.js CLI integration"}, {"content": "Create testing guide for Textual apps including unit tests and snapshot testing", "status": "completed", "activeForm": "Creating testing guide for Textual apps"}, {"content": "Define project structure recommendations and packaging guidance", "status": "completed", "activeForm": "Defining project structure recommendations and packaging guidance"}]

```

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive Textual fundamentals section with app structure, screens, widgets, and styling", "status": "completed", "activeForm": "Creating comprehensive Textual fundamentals section"}, {"content": "Document OAuth TUI implementation patterns including menus, forms, tables, and modals", "status": "in_progress", "activeForm": "Documenting OAuth TUI implementation patterns"}, {"content": "Provide integration patterns for calling Node.js CLI from Python with subprocess management", "status": "pending", "activeForm": "Providing integration patterns for Node.js CLI integration"}, {"content": "Create testing guide for Textual apps including unit tests and snapshot testing", "status": "pending", "activeForm": "Creating testing guide for Textual apps"}, {"content": "Define project structure recommendations and packaging guidance", "status": "pending", "activeForm": "Defining project structure recommendations"}]
