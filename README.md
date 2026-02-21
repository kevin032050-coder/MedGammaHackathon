# MedGemma Radiology PACS

AI-Assisted Emergency Radiology Triage Desktop Application using Google's Med Gemma model.

---

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup guide (10 minutes)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common problems and solutions
- **This file** - Complete setup and feature documentation

---

## 📋 What You Need Before Starting

Before installing this application, you need to have these programs on your computer:

1. **Node.js** (version 18 or newer)
   - Download from: https://nodejs.org/
   - Choose the "LTS" (Long Term Support) version
   - During installation, make sure to check "Add to PATH"

2. **Python** (version 3.9, 3.10, or 3.11)
   - Download from: https://www.python.org/downloads/
   - **IMPORTANT:** During installation, check the box that says "Add Python to PATH"
   - We recommend Python 3.11 for best compatibility

3. **Git** (optional, only if you're cloning this repository)
   - Download from: https://git-scm.com/downloads

### How to Check If You Already Have These Installed

Open Command Prompt (Windows) or Terminal (Mac/Linux) and type these commands:

```cmd
node --version
```
Should show something like `v18.x.x` or higher

```cmd
python --version
```
Should show something like `Python 3.9.x` or higher

If you see version numbers, you're good to go! If you get an error, you need to install that program.

---

## 🚀 Easy Installation Guide

### Option 1: Automatic Installation (Recommended)

**Windows Users:**
1. Double-click `install.bat`
2. Follow the prompts - it will check everything and install automatically
3. When done, run: `npm start`

**Mac/Linux Users:**
1. Open Terminal in the project folder
2. Run: `bash install.sh`
3. Follow the prompts - it will check everything and install automatically
4. When done, run: `npm start`

⚠️ **If automatic installation fails**, use the manual steps below.

---

### Option 2: Manual Installation (Step by Step)

Follow these steps **in order**. Each step is important!

#### Step 1: Download the Application

If you downloaded a ZIP file:
1. Extract the ZIP file to a folder on your computer (e.g., `C:\MedGemma\` or `~/MedGemma/`)
2. Open that folder

If you're using Git:
```cmd
git clone <repository-url>
cd MedGammaHackathon
```

#### Step 2: Set Up the Folder Structure

**Windows Users:**
- Double-click the `setup.bat` file
- A window will open, create folders, and show you next steps
- Press any key when it's done

**Mac/Linux Users:**
Open Terminal in the project folder and run:
```bash
mkdir -p electron src/python src/renderer/styles src/renderer/js src/renderer/assets sample-data/dicom
```

#### Step 3: Install Node.js Dependencies

Open Command Prompt (Windows) or Terminal (Mac/Linux) in the project folder and run:

```cmd
npm install
```

This will download all the JavaScript libraries needed. It may take 2-5 minutes.

**Wait for it to finish!** You'll see a progress bar and it will return to the command prompt when done.

#### Step 4: Set Up Python Environment

This step creates an isolated Python environment for the application.

**Windows Users:**
```cmd
cd src\python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..\..
```

**Mac/Linux Users:**
```bash
cd src/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

You'll know the virtual environment is activated when you see `(venv)` at the beginning of your command line.

This step may take 5-10 minutes as it downloads medical imaging and AI libraries.

---

## ▶️ Running the Application

Once installation is complete, you're ready to run the application!

### Starting the Application

**From the project root folder**, run:

**Windows:**
```cmd
npm start
```

**Mac/Linux:**
```bash
npm start
```

The application window should open automatically!

### What Happens When It Starts

1. The Electron desktop app launches
2. In the background, a Python server starts on `http://127.0.0.1:8000`
3. The Med Gemma AI model will attempt to load (this may show a warning if the full model isn't installed - that's okay for testing!)
4. You should see the PACS interface

### Troubleshooting Common Issues

**Problem: "npm: command not found" or "node: command not found"**
- Solution: Node.js is not installed or not in your PATH. Reinstall Node.js and make sure to check "Add to PATH"

**Problem: "python: command not found"**
- Solution: Python is not installed or not in your PATH. Reinstall Python and check "Add Python to PATH"
- On Mac/Linux, try using `python3` instead of `python`

**Problem: Python server fails to start**
- Make sure you activated the virtual environment before installing requirements
- Try reinstalling Python dependencies:
  ```cmd
  cd src\python
  venv\Scripts\activate  (or source venv/bin/activate on Mac/Linux)
  pip install --upgrade pip
  pip install -r requirements.txt
  ```

**Problem: Application window opens but shows errors**
- Check if the Python server is running by opening: http://127.0.0.1:8000/health
- You should see: `{"status":"healthy","med_gemma_loaded":false}`

**Problem: Port 8000 is already in use**
- Another program is using port 8000. Either close that program or change the port in `src/python/main.py` (line 353)

---

## 📁 Loading Sample DICOM Data

To test the application, you'll need DICOM medical imaging files:

1. Place DICOM files in the `sample-data/dicom/` folder
2. Each study should be in its own subfolder (e.g., `sample-data/dicom/study1/`)
3. In the application, click "Load Study" and browse to your DICOM folder

**Where to get sample DICOM files:**
- Medical Connections DICOM Library: https://www.medicalconnections.co.uk/Free_DICOM_Images
- Cancer Imaging Archive: https://www.cancerimagingarchive.net/

---

## 🎯 Features

This application includes:

- **AI-Prioritized Worklist** - Automatically sorts urgent cases first
- **PACS-Style Image Viewer** - Professional medical image viewing with window/level controls
- **Clinical Context Integration** - Connects imaging findings with patient data
- **Dwell-Time Intelligence** - Tracks how long radiologists spend on cases
- **Copilot Chat** - Ask questions about findings and get AI-assisted answers
- **Voice Dictation** - Dictate reports hands-free
- **Structured Report Builder** - Generate standardized radiology reports
- **Incidental Findings Detection** - Automatically flag unexpected findings
- **Radiologist Feedback Loop** - Improve AI accuracy with expert corrections
- **Safety & Trust Features** - Transparency in AI recommendations

---

## 🏗️ Project Structure

```
MedGammaHackathon/
├── electron/               # Desktop app (main process)
│   ├── main.js            # Electron entry point
│   └── preload.js         # Security bridge
├── src/
│   ├── python/            # Python backend server
│   │   ├── main.py       # FastAPI server
│   │   ├── med_gemma.py  # AI model integration
│   │   ├── dicom_processor.py  # Medical image processing
│   │   └── requirements.txt    # Python dependencies
│   └── renderer/          # Frontend UI (HTML/CSS/JS)
│       ├── index.html
│       ├── styles/
│       └── js/
├── sample-data/           # Your DICOM test files go here
│   └── dicom/
├── package.json           # Node.js configuration
└── setup.bat              # Windows setup script
```

---

## 🛠️ Technology Stack

- **Desktop Framework:** Electron (cross-platform desktop apps)
- **Frontend:** HTML, CSS, JavaScript with DWV (DICOM Web Viewer)
- **Backend:** Python 3.9+ with FastAPI (modern web framework)
- **AI Model:** Med Gemma (Google's medical AI - simulated for demo)
- **Medical Imaging:** pydicom, NumPy, Pillow
- **Communication:** REST API (JSON over HTTP)

---

## 👨‍💻 For Developers

### Development Mode

Run with auto-reload for development:
```cmd
npm run dev
```

### Building the Application

To create a standalone installer:
```cmd
npm run build
```

This creates installers in the `dist/` folder for your platform.

### API Documentation

When the Python server is running, view the interactive API docs:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### Running Python Server Independently

If you want to run just the backend:
```cmd
cd src\python
venv\Scripts\activate
python main.py
```

### Code Style

- JavaScript: Follow standard.js conventions
- Python: Follow PEP 8 guidelines
- Use meaningful variable names
- Comment complex medical logic

---

## 📝 Notes About Med Gemma AI Model

This application is designed to work with Google's Med Gemma model for medical image analysis. However:

- **Demo Mode:** The current version runs with simulated AI responses for demonstration purposes
- **Full Model:** To use the actual Med Gemma model, you'll need to:
  1. Apply for access to Med Gemma through Google
  2. Install additional dependencies (transformers, torch/tensorflow)
  3. Download the model weights (~5-10 GB)
  4. Update `src/python/med_gemma.py` with actual model loading code

The application will work without the full AI model - it just won't provide real AI analysis.

---

## 🆘 Getting Help

If you encounter problems:

1. **Check the Prerequisites:** Make sure Node.js and Python are properly installed
2. **Read Error Messages:** They usually tell you what went wrong
3. **Check the Console:** Look for error messages in the Electron app's developer console (View > Toggle Developer Tools)
4. **Check Python Logs:** The terminal running `npm start` will show Python server errors
5. **Verify File Structure:** Make sure all folders exist (run setup.bat again if needed)

---

## 📜 License

MIT License - Feel free to use this for educational and research purposes.

---

## ⚕️ Medical Disclaimer

This is a prototype/demonstration application for educational purposes. It is **NOT** approved for clinical use. Any medical decisions must be made by qualified healthcare professionals.
