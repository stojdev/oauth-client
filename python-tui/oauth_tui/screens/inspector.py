"""Token inspector screen for OAuth TUI."""

import base64
import json
from typing import TYPE_CHECKING, Any

from textual import on, work
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, VerticalScroll
from textual.reactive import reactive
from textual.screen import Screen
from textual.widgets import (
    Button,
    Footer,
    Header,
    Label,
    LoadingIndicator,
    Static,
    TabbedContent,
    TabPane,
    TextArea,
)

if TYPE_CHECKING:
    pass


class InspectorScreen(Screen):
    """Token inspector screen for JWT analysis."""

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("ctrl+p", "parse_token", "Parse"),
        Binding("ctrl+c", "clear_input", "Clear"),
        Binding("ctrl+v", "paste_sample", "Sample"),
    ]

    CSS = """
    InspectorScreen {
        background: $surface;
    }

    #inspector-container {
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

    #input-section {
        height: 30%;
        margin-bottom: 1;
    }

    #input-label {
        color: $text;
        text-style: bold;
        margin-bottom: 1;
    }

    #token-input {
        height: 1fr;
        border: solid $primary;
    }

    #button-bar {
        height: auto;
        margin: 1 0;
    }

    Button {
        margin-right: 1;
    }

    #output-section {
        height: 1fr;
    }

    TabbedContent {
        height: 1fr;
    }

    .output-container {
        height: 100%;
        padding: 1;
    }

    .json-text {
        height: 1fr;
        background: $surface-lighten-1;
        border: solid $primary;
        padding: 1;
        overflow-y: scroll;
    }

    .error-text {
        color: $error;
        text-style: bold;
    }

    .success-text {
        color: $success;
        text-style: bold;
    }

    .warning-text {
        color: $warning;
        text-style: bold;
    }

    .info-text {
        color: $accent;
    }

    .key {
        color: $primary;
        text-style: bold;
    }

    .value {
        color: $text;
    }

    .section-title {
        color: $accent;
        text-style: bold;
        margin: 1 0;
    }
    """

    # Reactive attributes for state management
    loading: reactive[bool] = reactive(False)
    jwt_token: reactive[str] = reactive("")
    parsed_data: reactive[dict[str, Any] | None] = reactive(None)
    parse_error: reactive[str | None] = reactive(None)

    def compose(self) -> ComposeResult:
        """Compose the inspector screen layout."""
        yield Header(show_clock=True)

        with Container(id="inspector-container"):
            yield Static("🔍 JWT Token Inspector", id="header-text")

            # Input section
            with Container(id="input-section"):
                yield Label("Enter JWT Token:", id="input-label")
                yield TextArea(
                    placeholder=(
                        "Paste your JWT token here (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
                    ),
                    id="token-input",
                )

            # Button bar
            with Horizontal(id="button-bar"):
                yield Button("Parse Token", id="parse", variant="primary")
                yield Button("Clear Input", id="clear")
                yield Button("Load Sample", id="sample")
                yield Button("Back", id="back")
                loading = LoadingIndicator(id="loading")
                loading.display = False
                yield loading

            # Output section with tabs
            with Container(id="output-section"), TabbedContent():
                with TabPane("Header", id="header_tab"):
                    yield VerticalScroll(
                        Static("Parse a JWT token to see the header", classes="info-text"),
                        id="header-content",
                        classes="output-container",
                    )

                with TabPane("Payload", id="payload_tab"):
                    yield VerticalScroll(
                        Static("Parse a JWT token to see the payload", classes="info-text"),
                        id="payload-content",
                        classes="output-container",
                    )

                with TabPane("Signature", id="signature_tab"):
                    yield VerticalScroll(
                        Static("Parse a JWT token to see the signature", classes="info-text"),
                        id="signature-content",
                        classes="output-container",
                    )

                with TabPane("Analysis", id="analysis_tab"):
                    yield VerticalScroll(
                        Static("Parse a JWT token to see the analysis", classes="info-text"),
                        id="analysis-content",
                        classes="output-container",
                    )

        yield Footer()

    def watch_loading(self, loading: bool) -> None:
        """React to loading state changes."""
        loading_indicator = self.query_one("#loading", LoadingIndicator)
        loading_indicator.display = loading

    def watch_parsed_data(self, parsed_data: dict[str, Any] | None) -> None:
        """React to parsed data changes."""
        if parsed_data:
            self.update_output_tabs(parsed_data)

    def watch_parse_error(self, error: str | None) -> None:
        """React to parse error changes."""
        if error:
            self.show_error(error)

    @on(Button.Pressed, "#parse")
    def on_parse_pressed(self) -> None:
        """Handle parse button press."""
        self.parse_token()

    @on(Button.Pressed, "#clear")
    def on_clear_pressed(self) -> None:
        """Handle clear button press."""
        self.clear_input()

    @on(Button.Pressed, "#sample")
    def on_sample_pressed(self) -> None:
        """Handle sample button press."""
        self.load_sample_token()

    @on(Button.Pressed, "#back")
    def on_back_pressed(self) -> None:
        """Handle back button press."""
        self.app.pop_screen()

    @on(TextArea.Changed, "#token-input")
    def on_token_input_changed(self, event: TextArea.Changed) -> None:
        """Handle token input changes."""
        self.jwt_token = event.text_area.text

    def clear_input(self) -> None:
        """Clear the token input."""
        token_input = self.query_one("#token-input", TextArea)
        token_input.text = ""
        self.jwt_token = ""
        self.parsed_data = None
        self.parse_error = None
        self.clear_output_tabs()
        self.notify("Input cleared", severity="information")

    def load_sample_token(self) -> None:
        """Load a sample JWT token for demonstration."""
        # Sample JWT token (not a real token, just for demonstration)
        sample_token = (
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OTAifQ."
            "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImF1ZCI6ImV4YW1w"
            "bGUtYXBwIiwiaXNzIjoiaHR0cHM6Ly9leGFtcGxlLmNvbSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2"
            "MjQyNjIyLCJzY29wZSI6InJlYWQgd3JpdGUgYWRtaW4ifQ."
            "signature-placeholder"
        )

        token_input = self.query_one("#token-input", TextArea)
        token_input.text = sample_token
        self.jwt_token = sample_token
        self.notify("Sample token loaded", severity="information")

    @work(exclusive=True)
    async def parse_token(self) -> None:
        """Parse the JWT token."""
        token = self.jwt_token.strip()
        if not token:
            self.notify("Please enter a JWT token", severity="warning")
            return

        self.loading = True
        self.parse_error = None

        try:
            parsed = self.parse_jwt_token(token)
            self.parsed_data = parsed
            self.notify("Token parsed successfully", severity="information")
        except Exception as e:
            self.parse_error = str(e)
            self.notify(f"Parse error: {str(e)}", severity="error")
        finally:
            self.loading = False

    def parse_jwt_token(self, token: str) -> dict[str, Any]:
        """
        Parse a JWT token into its components.

        Args:
            token: The JWT token string

        Returns:
            Dictionary with header, payload, signature, and metadata

        Raises:
            ValueError: If the token format is invalid
        """
        # Split the token into parts
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format. JWT should have 3 parts separated by dots.")

        header_encoded, payload_encoded, signature_encoded = parts

        try:
            # Decode header
            header = self.decode_jwt_part(header_encoded)

            # Decode payload
            payload = self.decode_jwt_part(payload_encoded)

            # Signature (keep as base64)
            signature = signature_encoded

            # Extract metadata and perform analysis
            analysis = self.analyze_jwt(header, payload)

            return {
                "header": header,
                "payload": payload,
                "signature": signature,
                "analysis": analysis,
                "raw_parts": {
                    "header": header_encoded,
                    "payload": payload_encoded,
                    "signature": signature_encoded,
                },
            }

        except Exception as e:
            raise ValueError(f"Failed to decode JWT: {str(e)}")

    def decode_jwt_part(self, encoded_part: str) -> dict[str, Any]:
        """
        Decode a JWT part (header or payload).

        Args:
            encoded_part: Base64 encoded JWT part

        Returns:
            Decoded JSON object
        """
        # Add padding if necessary
        missing_padding = len(encoded_part) % 4
        if missing_padding:
            encoded_part += "=" * (4 - missing_padding)

        try:
            # Decode base64
            decoded_bytes = base64.urlsafe_b64decode(encoded_part)
            decoded_str = decoded_bytes.decode("utf-8")

            # Parse JSON
            return json.loads(decoded_str)
        except Exception as e:
            raise ValueError(f"Failed to decode part: {str(e)}")

    def analyze_jwt(self, header: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        """
        Analyze JWT header and payload for insights.

        Args:
            header: Decoded JWT header
            payload: Decoded JWT payload

        Returns:
            Analysis results
        """
        analysis = {
            "algorithm": header.get("alg", "Unknown"),
            "token_type": header.get("typ", "Unknown"),
            "key_id": header.get("kid"),
            "issuer": payload.get("iss"),
            "subject": payload.get("sub"),
            "audience": payload.get("aud"),
            "expiration": payload.get("exp"),
            "issued_at": payload.get("iat"),
            "not_before": payload.get("nbf"),
            "scopes": payload.get("scope"),
            "warnings": [],
            "info": [],
        }

        # Check for common issues
        if analysis["algorithm"] == "none":
            analysis["warnings"].append("Algorithm is 'none' - this is insecure!")

        if not analysis["issuer"]:
            analysis["warnings"].append("No issuer (iss) claim found")

        if not analysis["expiration"]:
            analysis["warnings"].append("No expiration (exp) claim found")

        # Check expiration
        if analysis["expiration"]:
            import time

            current_time = int(time.time())
            if analysis["expiration"] < current_time:
                analysis["warnings"].append("Token has expired")
            else:
                remaining = analysis["expiration"] - current_time
                analysis["info"].append(f"Token expires in {remaining} seconds")

        # Check algorithm security
        if analysis["algorithm"] in ["HS256", "HS384", "HS512"]:
            analysis["info"].append("HMAC algorithm - symmetric key")
        elif analysis["algorithm"] in ["RS256", "RS384", "RS512"]:
            analysis["info"].append("RSA algorithm - asymmetric key")
        elif analysis["algorithm"] in ["ES256", "ES384", "ES512"]:
            analysis["info"].append("ECDSA algorithm - asymmetric key")

        return analysis

    def format_json_for_display(self, data: Any, indent: int = 0) -> str:
        """Format JSON data for display with syntax highlighting simulation."""
        if isinstance(data, dict):
            lines = ["{"]
            items = list(data.items())
            for i, (key, value) in enumerate(items):
                comma = "," if i < len(items) - 1 else ""
                if isinstance(value, (dict, list)):
                    lines.append(
                        f'  {"  " * indent}"{key}": '
                        f"{self.format_json_for_display(value, indent + 1)}{comma}"
                    )
                else:
                    lines.append(f'  {"  " * indent}"{key}": {json.dumps(value)}{comma}')
            lines.append(f"{'  ' * indent}}}")
            return "\n".join(lines)
        if isinstance(data, list):
            if not data:
                return "[]"
            lines = ["["]
            for i, item in enumerate(data):
                comma = "," if i < len(data) - 1 else ""
                lines.append(
                    f"  {'  ' * indent}{self.format_json_for_display(item, indent + 1)}{comma}"
                )
            lines.append(f"{'  ' * indent}]")
            return "\n".join(lines)
        return json.dumps(data)

    def update_output_tabs(self, parsed_data: dict[str, Any]) -> None:
        """Update all output tabs with parsed data."""
        # Update header tab
        header_content = self.query_one("#header-content", VerticalScroll)
        header_content.remove_children()
        header_content.mount(
            Static("JWT Header:", classes="section-title"),
            Static(self.format_json_for_display(parsed_data["header"]), classes="json-text"),
        )

        # Update payload tab
        payload_content = self.query_one("#payload-content", VerticalScroll)
        payload_content.remove_children()
        payload_content.mount(
            Static("JWT Payload:", classes="section-title"),
            Static(self.format_json_for_display(parsed_data["payload"]), classes="json-text"),
        )

        # Update signature tab
        signature_content = self.query_one("#signature-content", VerticalScroll)
        signature_content.remove_children()
        signature_content.mount(
            Static("JWT Signature:", classes="section-title"),
            Static(f"Base64 Encoded: {parsed_data['signature']}", classes="value"),
            Static(
                "\nNote: Signature verification requires the secret key or public key",
                classes="warning-text",
            ),
        )

        # Update analysis tab
        analysis_content = self.query_one("#analysis-content", VerticalScroll)
        analysis_content.remove_children()

        analysis = parsed_data["analysis"]
        widgets = [Static("Token Analysis:", classes="section-title")]

        # Basic info
        widgets.extend(
            [
                Static(f"Algorithm: {analysis['algorithm']}", classes="value"),
                Static(f"Type: {analysis['token_type']}", classes="value"),
            ]
        )

        if analysis.get("key_id"):
            widgets.append(Static(f"Key ID: {analysis['key_id']}", classes="value"))

        if analysis.get("issuer"):
            widgets.append(Static(f"Issuer: {analysis['issuer']}", classes="value"))

        if analysis.get("subject"):
            widgets.append(Static(f"Subject: {analysis['subject']}", classes="value"))

        if analysis.get("audience"):
            widgets.append(Static(f"Audience: {analysis['audience']}", classes="value"))

        if analysis.get("scopes"):
            widgets.append(Static(f"Scopes: {analysis['scopes']}", classes="value"))

        # Timestamps
        if analysis.get("issued_at"):
            from datetime import datetime

            iat_time = datetime.fromtimestamp(analysis["issued_at"])
            widgets.append(
                Static(f"Issued At: {iat_time.strftime('%Y-%m-%d %H:%M:%S')}", classes="value")
            )

        if analysis.get("expiration"):
            from datetime import datetime

            exp_time = datetime.fromtimestamp(analysis["expiration"])
            widgets.append(
                Static(f"Expires At: {exp_time.strftime('%Y-%m-%d %H:%M:%S')}", classes="value")
            )

        # Warnings
        if analysis.get("warnings"):
            widgets.append(Static("\nWarnings:", classes="section-title"))
            for warning in analysis["warnings"]:
                widgets.append(Static(f"⚠️  {warning}", classes="warning-text"))

        # Info
        if analysis.get("info"):
            widgets.append(Static("\nInformation:", classes="section-title"))
            for info in analysis["info"]:
                widgets.append(Static(f"ℹ️  {info}", classes="info-text"))

        analysis_content.mount(*widgets)

    def show_error(self, error: str) -> None:
        """Show error in all tabs."""
        error_widget = Static(f"Parse Error: {error}", classes="error-text")

        for tab_id in [
            "header-content",
            "payload-content",
            "signature-content",
            "analysis-content",
        ]:
            try:
                content = self.query_one(f"#{tab_id}", VerticalScroll)
                content.remove_children()
                content.mount(error_widget)
            except Exception:
                pass  # Tab might not exist yet

    def clear_output_tabs(self) -> None:
        """Clear all output tabs."""
        default_widget = Static("Parse a JWT token to see the content", classes="info-text")

        for tab_id in [
            "header-content",
            "payload-content",
            "signature-content",
            "analysis-content",
        ]:
            try:
                content = self.query_one(f"#{tab_id}", VerticalScroll)
                content.remove_children()
                content.mount(default_widget)
            except Exception:
                pass  # Tab might not exist yet

    def action_back(self) -> None:
        """Go back to previous screen."""
        self.app.pop_screen()

    def action_parse_token(self) -> None:
        """Parse token via keyboard shortcut."""
        self.parse_token()

    def action_clear_input(self) -> None:
        """Clear input via keyboard shortcut."""
        self.clear_input()

    def action_paste_sample(self) -> None:
        """Load sample token via keyboard shortcut."""
        self.load_sample_token()
