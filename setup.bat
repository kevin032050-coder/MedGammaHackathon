@echo off
REM Setup script for MedGemma Radiology PACS (Windows)

echo ==========================================
echo MedGemma PACS - Setup Script
echo ==========================================
echo.
echo Creating project directory structure...
echo.

REM Create all necessary directories
if not exist electron mkdir electron
if not exist src mkdir src
if not exist src\python mkdir src\python
if not exist src\renderer mkdir src\renderer
if not exist src\renderer\styles mkdir src\renderer\styles
if not exist src\renderer\js mkdir src\renderer\js
if not exist src\renderer\assets mkdir src\renderer\assets
if not exist sample-data mkdir sample-data
if not exist sample-data\dicom mkdir sample-data\dicom

echo [OK] Directory structure created successfully!
echo.
echo ==========================================
echo Next Steps:
echo ==========================================
echo.
echo 1. Install Node.js dependencies:
echo    npm install
echo.
echo 2. Set up Python virtual environment:
echo    cd src\python
echo    python -m venv venv
echo    venv\Scripts\activate
echo    pip install -r requirements.txt
echo    cd ..\..
echo.
echo 3. Run the application:
echo    npm start
echo.
echo ==========================================
echo For more details, see README.md
echo ==========================================
echo.
pause
