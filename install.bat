@echo off
REM Complete Installation Script for MedGemma PACS (Windows)
REM This script attempts to do everything in one go!

echo ==========================================
echo MedGemma PACS - Complete Installation
echo ==========================================
echo.
echo This script will:
echo  1. Check prerequisites
echo  2. Create directory structure
echo  3. Install Node.js dependencies
echo  4. Set up Python environment
echo  5. Install Python dependencies
echo.
echo This may take 10-15 minutes...
echo.
pause

REM Check Node.js
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo Make sure to check "Add to PATH" during installation
    pause
    exit /b 1
)
echo [OK] Node.js is installed
node --version
echo.

REM Check Python
echo [2/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.9+ from https://python.org/downloads/
    echo IMPORTANT: Check "Add Python to PATH" during installation
    pause
    exit /b 1
)
echo [OK] Python is installed
python --version
echo.

REM Create directories
echo [3/5] Creating directory structure...
if not exist electron mkdir electron
if not exist src mkdir src
if not exist src\python mkdir src\python
if not exist src\renderer mkdir src\renderer
if not exist src\renderer\styles mkdir src\renderer\styles
if not exist src\renderer\js mkdir src\renderer\js
if not exist src\renderer\assets mkdir src\renderer\assets
if not exist sample-data mkdir sample-data
if not exist sample-data\dicom mkdir sample-data\dicom
echo [OK] Directories created
echo.

REM Install Node.js dependencies
echo [4/5] Installing Node.js dependencies...
echo This may take a few minutes...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install Node.js dependencies
    echo Try running: npm install
    pause
    exit /b 1
)
echo [OK] Node.js dependencies installed
echo.

REM Set up Python environment
echo [5/5] Setting up Python environment...
cd src\python

echo Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    echo Make sure Python is properly installed
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing Python dependencies...
echo This may take 5-10 minutes...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    echo Try running these commands manually:
    echo   cd src\python
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

cd ..\..
echo.
echo ==========================================
echo Installation Complete!
echo ==========================================
echo.
echo You can now run the application with:
echo   npm start
echo.
echo For more information, see:
echo   README.md - Full documentation
echo   QUICKSTART.md - Quick start guide  
echo   TROUBLESHOOTING.md - Problem solving
echo.
echo ==========================================
pause
