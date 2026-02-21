# Quick Start Guide - MedGemma Radiology PACS

This is a simplified guide to get you running in under 10 minutes!

## Before You Begin

✅ **Check you have:**
- Node.js 18+ installed
- Python 3.9-3.11 installed  
- 5-10 GB free disk space
- Internet connection (for downloading dependencies)

## Step-by-Step Installation

### 1️⃣ Set Up Folders
**Windows:** Double-click `setup.bat`  
**Mac/Linux:** Run `bash setup.sh` in Terminal

### 2️⃣ Install JavaScript Dependencies
Open terminal in project folder:
```bash
npm install
```
⏱️ Takes 2-5 minutes

### 3️⃣ Install Python Dependencies

**Windows:**
```cmd
cd src\python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..\..
```

**Mac/Linux:**
```bash
cd src/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```
⏱️ Takes 5-10 minutes

### 4️⃣ Run the Application
```bash
npm start
```

🎉 **Done!** The application should open automatically.

## First Time Using

1. The app will start with no studies loaded
2. Place DICOM files in `sample-data/dicom/your-study-name/`
3. Click "Load Study" in the app
4. Browse to your DICOM folder
5. Start viewing!

## Quick Troubleshooting

**"Command not found" errors:**
- Reinstall Node.js or Python and add to PATH

**Python server won't start:**
- Make sure virtual environment is activated (you see `(venv)` in terminal)
- Try: `pip install --upgrade pip` then reinstall requirements

**Application opens but crashes:**
- Open http://127.0.0.1:8000/health in browser
- Should show: `{"status":"healthy",...}`
- If not, Python server isn't running

**Need more help?**
See the full README.md file for detailed troubleshooting.

## What to Try

- Load sample DICOM images from free medical databases
- Try the AI chat feature (simulated responses)
- Explore the PACS-style image viewer
- Generate a sample radiology report

---

**Remember:** This is a demo application. The AI features are simulated unless you install the full Med Gemma model.
