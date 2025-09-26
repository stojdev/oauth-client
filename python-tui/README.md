# OAuth TUI - Python Textual Interface

A modern Terminal User Interface for the OAuth CLI, built with Python and Textual.

## Features

- Interactive OAuth authentication flows
- Token management and inspection
- Provider configuration
- JWT token decoding
- Keyboard-driven navigation

## Installation

```bash
pip install -e .
```

## Usage

From the OAuth CLI:

```bash
oauth tui
```

Or directly:

```bash
cd python-tui
python -m oauth_tui
```

## Development

Install development dependencies:

```bash
pip install -e ".[dev]"
```

Run tests:

```bash
pytest
```

Format code:

```bash
black oauth_tui tests
```

Type checking:

```bash
mypy oauth_tui
```
