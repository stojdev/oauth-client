#!/bin/bash
# Test runner script for OAuth TUI

set -e

echo "🧪 Running OAuth TUI Tests"
echo "=========================="

# Change to the python-tui directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies using uv (faster than pip)
echo "📦 Installing test dependencies with uv..."
if command -v uv >/dev/null 2>&1; then
    uv pip install -e ".[test]" --quiet
else
    echo "⚠️  uv not found, falling back to pip..."
    pip install -e ".[test]" --quiet
fi

# Run different test categories
echo ""
echo "🏃 Running Unit Tests..."
pytest tests/test_*.py -m "unit" -v

echo ""
echo "🔄 Running Integration Tests..."  
pytest tests/test_integration.py -m "integration" -v

echo ""
echo "📸 Running Snapshot Tests..."
pytest tests/test_snapshots.py -m "snapshot" -v --snapshot-update

echo ""
echo "📊 Running All Tests with Coverage..."
pytest tests/ --cov=oauth_tui --cov-report=term-missing --cov-report=html

echo ""
echo "✅ Test run completed!"
echo "📋 Coverage report saved to htmlcov/index.html"