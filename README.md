# MedGemma Radiology PACS

AI-Assisted Emergency Radiology Triage Desktop Application using Google's Med Gemma model.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

### Core Functionality
- **AI-Prioritized Worklist** - Intelligent triage sorting (Critical/Urgent/Routine)
- **High-Quality DICOM Viewer** - Professional medical-grade image rendering with zero compression loss
- **Clinical Context Integration** - EHR-aware reading assistance
- **Multi-Window Presets** - Brain, Subdural, Bone, Lung, Abdomen
- **Zoom & Pan** - 0.5x to 4x magnification with smooth panning
- **Slice Navigation** - Keyboard shortcuts and slider control

### AI Features
- **Dwell-Time Intelligence** - Context-aware tooltips after 5-second dwell
- **Copilot Chat** - Interactive Q&A about current study
- **Voice Dictation** - Ambient dictation for findings and final reports
- **Structured Report Builder** - Auto-generated findings with radiologist override
- **Incidental Findings Detection** - Risk-stratified alerts
- **Radiologist Feedback Loop** - Model improvement tracking (simulated)

### Safety & Trust
- Persistent disclaimer: "AI assistive tool. Not for final diagnosis"
- Human-in-the-loop design - radiologist always has final authority
- No autonomous diagnosis or treatment recommendations
- Transparent confidence scoring

---

## 🚀 Quick Start

### Prerequisites

**Required:**
- Windows 10/11
- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.9+ ([Download](https://www.python.org/downloads/))
- Git ([Download](https://git-scm.com/downloads))

**Recommended:**
- 8GB+ RAM
- DICOM test datasets

---

## 📦 Installation

### Step 1: Clone Repository

```cmd
git clone https://github.com/YOUR_USERNAME/MedGammaHackathon.git
cd MedGammaHackathon
```

### Step 2: Create Directory Structure

Double-click `setup.bat` or run:
```cmd
setup.bat
```

### Step 3: Install Node Dependencies

```cmd
npm install
```

This installs:
- Electron 40.1.0
- Axios 1.6.0
- Electron Builder (for packaging)

### Step 4: Set Up Python Environment

```cmd
cd src\python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..\..
```

This installs:
- FastAPI (web framework)
- pydicom (DICOM processing)
- Pillow (image processing)
- NumPy (numerical computing)
- Uvicorn (ASGI server)

### Step 5: Run the Application

From the root directory:
```cmd
npm start
```

**First Run:**
1. App window opens automatically
2. Python backend starts (takes ~5 seconds)
3. Click "Load DICOM Study"
4. Select folder containing `.dcm` files
5. Images appear with AI analysis

---

## 📁 Project Structure

```
MedGammaHackathon/
├── electron/                    # Electron main process
│   ├── main.js                 # App lifecycle, IPC handlers, Python process management
│   └── preload.js              # Secure IPC bridge
├── src/
│   ├── python/                 # Python backend
│   │   ├── main.py            # FastAPI server (8 API endpoints)
│   │   ├── med_gemma.py       # Med Gemma model interface (mock)
│   │   ├── dicom_processor.py # DICOM loading, raw pixel extraction
│   │   ├── requirements.txt   # Python dependencies
│   │   └── venv/              # Virtual environment (created during setup)
│   └── renderer/              # Frontend UI
│       ├── index.html         # Main UI (3-panel layout)
│       ├── js/
│       │   ├── app.js         # Main application logic
│       │   ├── dicom-viewer-canvas.js  # High-quality DICOM viewer
│       │   ├── worklist.js    # Worklist management
│       │   ├── chat.js        # Chat interface
│       │   ├── report.js      # Report builder
│       │   └── voice.js       # Voice dictation (Web Speech API)
│       └── styles/
│           ├── main.css       # Core styling
│           ├── pacs-viewer.css
│           ├── worklist.css
│           └── report.css
├── sample-data/
│   └── dicom/                 # Place test DICOM files here
├── package.json               # Node dependencies
├── setup.bat                  # Windows setup script
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

---

## 🖥️ Usage Guide

### Loading DICOM Studies

1. **Click "Load DICOM Study"** button
2. **Select folder** containing DICOM files (`.dcm`)
3. Study appears in worklist with AI priority badge
4. Click study to view images

### Navigating Images

- **Slider:** Drag to change slices
- **Arrow Keys:** Up/Down or Left/Right to navigate
- **Mouse Wheel:** Zoom in/out
- **Click & Drag:** Pan when zoomed

### Window Presets

Click preset buttons for optimal viewing:
- **Brain** (40/80) - Brain tissue
- **Subdural** (80/200) - Subdural hematomas
- **Bone** (400/1800) - Skull fractures
- **Lung** (-600/1500) - Lung parenchyma
- **Abdomen** (40/400) - Soft tissue

### AI Features

**Chat:**
- Type questions about current study
- Switch between Radiologist/Resident modes

**Voice Dictation:**
- Click microphone for findings
- Use "Final Voice Dictation" for signed report

**Report:**
- View AI-suggested findings (read-only)
- Edit radiologist findings
- Click "Finalize & Sign Report"

---

## 🛠️ Troubleshooting

### Python service fails to start

**Error:** "Waiting for Python service..."

**Solution:**
```cmd
cd src\python
venv\Scripts\activate
python main.py
```
Check for errors. Common issues:
- Port 8000 already in use
- Missing dependencies

### DICOM files not loading

**Error:** "No DICOM files found"

**Solution:**
- Ensure files have `.dcm` extension
- Check folder contains valid DICOM files
- Try sample datasets from [DICOM Library](https://www.dicomlibrary.com/)

### Images appear grainy

**Note:** Raw pixel mode is enabled by default for highest quality.

To toggle:
Edit `src/renderer/js/dicom-viewer-canvas.js` line 11:
```javascript
this.useRawPixels = false; // Use PNG mode (legacy)
```

### App won't start

**Error:** Electron or npm errors

**Solution:**
```cmd
# Clean install
rmdir /s node_modules
npm cache clean --force
npm install
npm start
```

---

## 🔧 Configuration

### Python Backend Port

Default: `8000`

To change, edit `electron/main.js` line 10:
```javascript
const PYTHON_PORT = 8000; // Change port here
```

### Med Gemma Model

Currently using **mock responses** for development.

To integrate real Med Gemma:
1. Update `src/python/med_gemma.py`
2. Install Med Gemma dependencies
3. Load model in `load_model()` method

---

## 📊 API Endpoints

Python backend (FastAPI) exposes:

- `POST /api/load-study` - Load DICOM study from folder
- `POST /api/analyze-study` - AI analysis of entire study
- `POST /api/analyze-slice` - AI analysis of single slice
- `POST /api/get-slice-pixels` - Raw pixel data (high quality)
- `POST /api/get-slice-image` - PNG image (legacy)
- `POST /api/chat-query` - Chat with AI
- `POST /api/incidental-findings` - Detect incidental findings
- `POST /api/generate-report` - Generate structured report
- `POST /api/submit-feedback` - Submit radiologist feedback

---

## 🏗️ Building for Production

### Create Installer

```cmd
npm run build
```

Generates installer in `dist/` folder.

### Supported Platforms

- Windows (NSIS installer)
- macOS (DMG) - requires macOS to build
- Linux (AppImage) - requires Linux to build

---

## 🧪 Development

### Run in Dev Mode

```cmd
npm run dev
```

### Hot Reload

Frontend: Refresh window (Ctrl+R)
Backend: Restart Python service

### Debug Console

Press `Ctrl+Shift+I` to open DevTools

---

## 📝 Technical Details

### Image Rendering Pipeline

**High Quality Mode (Default):**
1. Python extracts raw pixel array from DICOM
2. Applies Rescale Slope/Intercept → Hounsfield Units
3. Sends as Float32 array (base64)
4. JavaScript applies window/level → 0-255 grayscale
5. Draws to canvas with ImageData API
6. **Result:** Zero compression loss, professional quality

**Legacy Mode (Fallback):**
1. Python applies windowing → PNG
2. Base64 encode → send to frontend
3. Draw Image to canvas
4. **Result:** Faster but lower quality

### Performance

- **Load Time:** ~1-2 seconds per study (195 slices)
- **Navigation:** <100ms slice change
- **Memory:** ~500KB per slice in raw mode
- **Backend:** Python FastAPI (async)
- **Frontend:** Electron (Chromium)

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add YourFeature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **DWV** - DICOM Web Viewer inspiration
- **Google Med Gemma** - AI model foundation
- **pydicom** - DICOM processing library
- **Electron** - Desktop framework

---

## 📞 Support

For issues or questions:
1. Check [Troubleshooting](#-troubleshooting) section
2. Open GitHub Issue
3. Provide error logs and system info

---

## 🗺️ Roadmap

- [ ] Real Med Gemma model integration
- [ ] Multi-planar reconstruction (MPR)
- [ ] 3D volume rendering
- [ ] PACS connectivity (DICOM C-STORE)
- [ ] User authentication
- [ ] Cloud backup
- [ ] Mobile companion app

---

**Built with ❤️ for radiologists by developers who care about medical imaging quality.**
