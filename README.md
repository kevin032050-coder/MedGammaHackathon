# MedGemma Radiology PACS

AI-Assisted Emergency Radiology Triage Desktop Application using Google's Med Gemma model.

## Setup Instructions

### Step 1: Create Directory Structure

Double-click `setup.bat` or run in Command Prompt:
```cmd
setup.bat
```

### Step 2: Install Node Dependencies

```cmd
npm install
```

### Step 3: Set Up Python Environment

```cmd
cd src\python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Step 4: Run the Application

From the root directory:
```cmd
npm start
```

## Project Structure

```
MedGammaHackathon/
├── electron/               # Electron main process
├── src/
│   ├── python/            # Python backend (FastAPI + Med Gemma)
│   └── renderer/          # Frontend UI
├── sample-data/           # Sample DICOM datasets
└── package.json
```

## Features

- AI-Prioritized Worklist
- PACS-Style Image Viewer
- Clinical Context Integration
- Dwell-Time Intelligence
- Copilot Chat
- Voice Dictation
- Structured Report Builder
- Incidental Findings Detection
- Radiologist Feedback Loop
- Safety & Trust Features

## Tech Stack

- **Frontend:** Electron, HTML/CSS/JavaScript, Cornerstone.js
- **Backend:** Python FastAPI
- **AI Model:** Med Gemma (local inference)
- **DICOM:** pydicom

## Development

Run in development mode:
```cmd
npm run dev
```

## License

MIT
