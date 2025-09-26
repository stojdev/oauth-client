# Testing Guide for OAuth TUI

## Overview

This guide covers the comprehensive testing setup for the OAuth TUI application using the best practices and libraries for Textual application testing.

## Testing Stack

### 🎯 **Primary Testing Libraries**

1. **pytest-textual-snapshot** - Visual regression testing
2. **Textual's built-in testing** - Interaction and behavior testing  
3. **pytest + pytest-asyncio** - Test framework and async support
4. **pytest-mock** - Mocking and stubbing
5. **coverage** - Code coverage reporting

### 📁 **Test Structure**

```
tests/
├── conftest.py           # Test configuration and fixtures
├── test_app.py          # Main application tests
├── test_snapshots.py    # Visual regression tests  
├── test_integration.py  # End-to-end integration tests
├── test_services.py     # Unit tests for services
└── data/               # Test data files
```

## Test Categories

### 🔧 **Unit Tests** (`test_services.py`, `test_app.py`)

- Test individual components in isolation
- Mock external dependencies
- Fast execution
- High coverage of business logic

```python
def test_oauth_service_creation():
    service = OAuthService()
    assert service is not None
```

### 🔄 **Integration Tests** (`test_integration.py`)

- Test complete user workflows
- Test screen transitions
- Test error handling across components
- Test keyboard navigation

```python
async def test_complete_token_workflow(app):
    async with app.run_test() as pilot:
        await pilot.press("t")  # Navigate to tokens
        await pilot.press("enter")  # Select token
        # Assert expected behavior
```

### 📸 **Snapshot Tests** (`test_snapshots.py`)

- Visual regression testing
- Captures SVG screenshots
- Detects UI changes automatically
- Tests different screen states

```python
def test_menu_screen_snapshot(snap_compare):
    app = OAuthTUI(initial_view="menu")
    assert snap_compare(app, terminal_size=(80, 24))
```

## Running Tests

### 🚀 **Quick Start**

```bash
# Install test dependencies (using uv - faster than pip)
cd python-tui
uv pip install -e ".[test]"

# OR: Use pnpm scripts from project root (recommended)
pnpm run python:test

# Run with coverage
pnpm run python:test:coverage
```

### 🎯 **Targeted Testing (via pnpm scripts)**

```bash
# Run only unit tests
pnpm run python:test:unit

# Run only integration tests  
pnpm run python:test:integration

# Run only snapshot tests
pnpm run python:test:snapshot

# Update snapshots (when UI changes are intentional)
pnpm run python:test:snapshot:update

# All Python quality checks (lint + typecheck + test)
pnpm run quality-gate:python
```

### 🎯 **Direct pytest Commands** (if working in python-tui directory)

```bash
# Run only unit tests
pytest -m "unit"

# Run only integration tests  
pytest -m "integration"

# Run only snapshot tests
pytest -m "snapshot"

# Update snapshots (when UI changes are intentional)
pytest --snapshot-update
```

### 📊 **Advanced Options**

```bash
# Run with detailed output
pytest -v

# Run specific test file
pytest tests/test_app.py

# Run tests matching pattern
pytest -k "test_navigation"

# Skip slow tests
pytest -m "not slow"

# Generate HTML coverage report
pytest --cov=oauth_tui --cov-report=html
```

## Test Fixtures

### 🔧 **Available Fixtures** (defined in `conftest.py`)

- `app` - OAuth TUI application instance
- `mock_oauth_service` - Mocked OAuth service
- `sample_token` - Sample token data
- `test_data_dir` - Path to test data directory

### 📸 **Snapshot Testing Fixtures**

- `snap_compare` - Main snapshot comparison fixture
- Supports custom terminal sizes, key presses, and setup code

## Best Practices

### ✅ **Do's**

- **Use async/await** for all TUI interaction tests
- **Mock external services** to avoid network dependencies  
- **Test error conditions** alongside happy paths
- **Use descriptive test names** that explain the scenario
- **Group related tests** in classes
- **Update snapshots** when UI changes are intentional

### ❌ **Don'ts**

- **Don't test implementation details** - focus on behavior
- **Don't write brittle tests** that break on minor UI changes
- **Don't ignore test failures** - investigate and fix
- **Don't skip async markers** - use `@pytest.mark.asyncio`
- **Don't test in isolation** - include integration tests

## Testing Patterns

### 🎯 **Testing Screen Navigation**

```python
async def test_screen_navigation():
    async with app.run_test() as pilot:
        # Start at menu
        assert pilot.app.screen.id == "menu"
        
        # Navigate to tokens
        await pilot.press("t")
        await pilot.pause()
        
        # Verify transition
        assert pilot.app.screen.id == "tokens"
```

### 🎯 **Testing User Interactions**

```python
async def test_button_click():
    async with app.run_test() as pilot:
        # Click specific button
        await pilot.click("#my-button")
        
        # Verify result
        assert some_expected_state
```

### 🎯 **Testing Error Handling**

```python
async def test_error_handling():
    with patch('oauth_service.method') as mock:
        mock.side_effect = Exception("Test error")
        
        async with app.run_test() as pilot:
            # Trigger error condition
            await pilot.press("x")
            
            # Verify graceful handling
            assert pilot.app.is_running
```

## Continuous Integration

### 🔄 **CI/CD Integration**

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    pip install -e ".[test]"
    pytest --cov=oauth_tui --cov-report=xml
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage.xml
```

## Debugging Tests

### 🐛 **Common Issues**

1. **Async test failures**: Ensure `pytest-asyncio` is installed and configured
2. **Snapshot mismatches**: Review changes with `--snapshot-update`
3. **Timing issues**: Use `await pilot.pause()` between interactions
4. **Import errors**: Ensure all dependencies are installed

### 🔍 **Debugging Tips**

- Use `await pilot.pause(1)` to slow down test execution
- Add `print()` statements to understand test flow
- Run single tests with `-s` flag to see output
- Use `--pdb` to drop into debugger on failures

## Example Test Session

```bash
# Complete test workflow (using pnpm)
pnpm run python:test:coverage

# OR: Use the standalone script
./python-tui/run_tests.sh

# This will:
# 1. Set up virtual environment
# 2. Install dependencies with uv (faster than pip)
# 3. Run unit tests
# 4. Run integration tests
# 5. Run snapshot tests
# 6. Generate coverage report
```

This testing setup provides comprehensive coverage for your Textual TUI application with industry best practices and modern testing approaches.
