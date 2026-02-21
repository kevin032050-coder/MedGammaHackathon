#!/bin/bash
# Setup script for MedGemma Radiology PACS (Mac/Linux)

echo "=========================================="
echo "MedGemma PACS - Setup Script"
echo "=========================================="
echo ""
echo "Creating project directory structure..."
echo ""

# Create all necessary directories
mkdir -p electron
mkdir -p src/python
mkdir -p src/renderer/styles
mkdir -p src/renderer/js
mkdir -p src/renderer/assets
mkdir -p sample-data/dicom

echo "✓ Directory structure created successfully!"
echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Install Node.js dependencies:"
echo "   npm install"
echo ""
echo "2. Set up Python virtual environment:"
echo "   cd src/python"
echo "   python3 -m venv venv"
echo "   source venv/bin/activate"
echo "   pip install -r requirements.txt"
echo "   cd ../.."
echo ""
echo "3. Run the application:"
echo "   npm start"
echo ""
echo "=========================================="
echo "For more details, see README.md"
echo "=========================================="
echo ""
