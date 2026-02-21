#!/bin/bash
# Complete Installation Script for MedGemma PACS (Mac/Linux)
# This script attempts to do everything in one go!

set -e  # Exit on any error

echo "=========================================="
echo "MedGemma PACS - Complete Installation"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Check prerequisites"
echo "  2. Create directory structure"
echo "  3. Install Node.js dependencies"
echo "  4. Set up Python environment"
echo "  5. Install Python dependencies"
echo ""
echo "This may take 10-15 minutes..."
echo ""
read -p "Press Enter to continue..."

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    PIP_CMD=pip3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
    PIP_CMD=pip
else
    echo "[ERROR] Python is not installed!"
    echo "Please install Python 3.9+ from https://python.org/downloads/"
    exit 1
fi

# Check Node.js
echo "[1/5] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "[OK] Node.js is installed"
node --version
echo ""

# Check Python
echo "[2/5] Checking Python installation..."
echo "[OK] Python is installed"
$PYTHON_CMD --version
echo ""

# Create directories
echo "[3/5] Creating directory structure..."
mkdir -p electron
mkdir -p src/python
mkdir -p src/renderer/styles
mkdir -p src/renderer/js
mkdir -p src/renderer/assets
mkdir -p sample-data/dicom
echo "[OK] Directories created"
echo ""

# Install Node.js dependencies
echo "[4/5] Installing Node.js dependencies..."
echo "This may take a few minutes..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install Node.js dependencies"
    echo "Try running: npm install"
    exit 1
fi
echo "[OK] Node.js dependencies installed"
echo ""

# Set up Python environment
echo "[5/5] Setting up Python environment..."
cd src/python

echo "Creating virtual environment..."
$PYTHON_CMD -m venv venv
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to create virtual environment"
    echo "On Ubuntu/Debian, try: sudo apt-get install python3-venv"
    echo "On macOS, make sure Command Line Tools are installed"
    exit 1
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip..."
$PYTHON_CMD -m pip install --upgrade pip

echo "Installing Python dependencies..."
echo "This may take 5-10 minutes..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install Python dependencies"
    echo "Try running these commands manually:"
    echo "  cd src/python"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

cd ../..
echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "You can now run the application with:"
echo "  npm start"
echo ""
echo "For more information, see:"
echo "  README.md - Full documentation"
echo "  QUICKSTART.md - Quick start guide"
echo "  TROUBLESHOOTING.md - Problem solving"
echo ""
echo "=========================================="
