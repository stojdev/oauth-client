"""Bridge to communicate with Node.js OAuth CLI."""

import asyncio
import json
from pathlib import Path
from typing import Any


class CLIBridge:
    """Interface to Node.js OAuth CLI commands."""

    def __init__(self) -> None:
        """Initialize CLI bridge with path to Node.js CLI."""
        # Find the CLI relative to this Python module
        python_tui_dir = Path(__file__).parent.parent.parent
        project_root = python_tui_dir.parent
        self.cli_path = project_root / "dist" / "cli.mjs"

        if not self.cli_path.exists():
            raise FileNotFoundError(
                f"Node.js CLI not found at {self.cli_path}. Please run 'pnpm build' first."
            )

    async def execute_command(
        self, command: str, args: list[str] | None = None, stdin_data: str | None = None
    ) -> dict[str, Any]:
        """
        Execute a CLI command and return the result.

        Args:
            command: The CLI command to execute (e.g., 'list-tokens')
            args: Additional arguments for the command
            stdin_data: Optional data to send to stdin

        Returns:
            Dictionary with 'success', 'data', and 'error' keys
        """
        cmd = ["node", str(self.cli_path), command]
        if args:
            cmd.extend(args)

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE if stdin_data else None,
            )

            stdout, stderr = await proc.communicate(
                input=stdin_data.encode() if stdin_data else None
            )

            # Try to parse JSON output
            data = None
            if stdout:
                try:
                    data = json.loads(stdout.decode())
                except json.JSONDecodeError:
                    # If not JSON, return as plain text
                    data = stdout.decode().strip()

            return {
                "success": proc.returncode == 0,
                "data": data,
                "error": stderr.decode().strip() if stderr else None,
                "exit_code": proc.returncode,
            }

        except Exception as e:
            return {"success": False, "data": None, "error": str(e), "exit_code": -1}

    async def list_tokens(self) -> dict[str, Any]:
        """Get list of stored tokens."""
        result = await self.execute_command("list-tokens")

        # Parse the human-readable output for now
        # TODO: Update CLI to support JSON output
        if result["success"] and result["data"]:
            tokens = self.parse_tokens_output(result["data"])
            return {"success": True, "data": tokens, "error": None}

        return result

    async def list_providers(self) -> dict[str, Any]:
        """Get list of configured providers."""
        result = await self.execute_command("config:list")

        # Parse the human-readable output for now
        if result["success"] and result["data"]:
            providers = self.parse_providers_output(result["data"])
            return {"success": True, "data": providers, "error": None}

        return result

    async def clear_tokens(self, provider: str | None = None) -> dict[str, Any]:
        """Clear tokens for a provider or all tokens."""
        if provider:
            return await self.execute_command("tokens:remove", [provider])
        return await self.execute_command("clear-tokens")

    async def test_client_credentials(
        self,
        provider: str,
        client_id: str,
        client_secret: str,
        token_url: str,
        scopes: str | None = None,
    ) -> dict[str, Any]:
        """Test client credentials flow."""
        args = [
            "client_credentials",
            "--client-id",
            client_id,
            "--client-secret",
            client_secret,
            "--token-url",
            token_url,
            "--save",
            provider,
        ]
        if scopes:
            args.extend(["--scope", scopes])

        return await self.execute_command("token", args)

    def parse_tokens_output(self, output: str) -> list[dict[str, Any]]:
        """Parse tokens from human-readable CLI output."""
        tokens: list[dict[str, Any]] = []

        # Handle "No stored tokens found" case
        if "No stored tokens found" in output:
            return tokens

        # Parse stored tokens (simplified parsing)
        lines = output.split("\n")
        for line in lines:
            if line.strip().startswith("- "):
                # Extract provider and token preview
                parts = line.strip()[2:].split(": ")
                if len(parts) >= 2:
                    provider = parts[0]
                    token_preview = parts[1]

                    tokens.append(
                        {
                            "provider": provider,
                            "access_token": token_preview.replace("...", "") + "dummy_token_data",
                            "token_type": "Bearer",
                            "expires_at": None,  # Not available in current output
                            "scope": None,  # Not available in current output
                        }
                    )

        return tokens

    def parse_providers_output(self, output: str) -> list[dict[str, Any]]:
        """Parse providers from human-readable CLI output."""
        providers = []

        lines = output.split("\n")
        current_provider = None

        for line in lines:
            line = line.strip()

            # Skip empty lines and headers
            if not line or "Configured providers:" in line or "Available presets:" in line:
                continue

            # Check if this is a provider name line (has parentheses)
            if "(" in line and ")" in line:
                # Extract provider name and ID
                parts = line.split("(")
                if len(parts) >= 2:
                    name = parts[0].strip()
                    provider_id = parts[1].replace(")", "").strip()

                    current_provider = {
                        "name": provider_id,
                        "display_name": name,
                        "type": "generic",
                        "client_id": None,
                        "token_url": None,
                        "auth_url": None,
                    }
                    providers.append(current_provider)

            # Parse provider details
            elif current_provider and ": " in line:
                key, value = line.split(": ", 1)
                key = key.strip().lower().replace(" ", "_")

                if key == "client_id":
                    current_provider["client_id"] = value
                elif key == "token_url":
                    current_provider["token_url"] = value
                elif key == "authorization_url":
                    current_provider["auth_url"] = value

        return providers
