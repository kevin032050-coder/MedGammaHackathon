@echo off
echo Creating project directory structure...

if not exist electron mkdir electron
if not exist src mkdir src
if not exist src\python mkdir src\python
if not exist src\renderer mkdir src\renderer
if not exist src\renderer\styles mkdir src\renderer\styles
if not exist src\renderer\js mkdir src\renderer\js
if not exist src\renderer\assets mkdir src\renderer\assets
if not exist sample-data mkdir sample-data
if not exist sample-data\dicom mkdir sample-data\dicom

echo.
echo Directory structure created successfully!
echo.
echo Next steps:
echo 1. Run: npm install
echo 2. Run: cd src\python
echo 3. Run: python -m venv venv
echo 4. Run: venv\Scripts\activate
echo 5. Run: pip install -r requirements.txt
echo.
pause
