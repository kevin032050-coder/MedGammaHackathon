# Installation Files Summary

This project includes multiple installation methods to suit different user experience levels:

## 📁 Files Created for Easy Installation

### Documentation Files (Read These First!)

1. **README.md** - Complete documentation
   - Prerequisites and system requirements
   - Two installation methods (automatic and manual)
   - Full feature documentation
   - Technology stack details
   - Developer information

2. **QUICKSTART.md** - Get running in 10 minutes
   - Simplified step-by-step guide
   - Quick troubleshooting tips
   - Perfect for users who want to try it fast

3. **TROUBLESHOOTING.md** - Problem-solving guide
   - Common installation errors
   - Platform-specific issues
   - Performance tips
   - Clean reinstall instructions

### Installation Scripts

#### For Complete Automatic Installation:

**Windows:**
- **install.bat** - Runs complete installation automatically
  - Checks Node.js and Python
  - Creates directories
  - Installs all dependencies
  - Just double-click and wait!

**Mac/Linux:**
- **install.sh** - Runs complete installation automatically
  - Checks Node.js and Python
  - Creates directories  
  - Installs all dependencies
  - Run with: `bash install.sh`

#### For Manual Setup Only:

**Windows:**
- **setup.bat** - Creates folder structure only
  - Use this if you want to install dependencies manually
  - Then follow manual steps in README.md

**Mac/Linux:**
- **setup.sh** - Creates folder structure only
  - Use this if you want to install dependencies manually
  - Then follow manual steps in README.md

### Requirements Files

**src/python/requirements.txt**
- Enhanced with detailed comments
- Organized by category
- Explains what each package does
- Includes optional dependencies for production
- Med Gemma AI instructions (commented out)

## 🚀 Recommended Installation Path

### For Beginners (Easiest):
1. Make sure Node.js and Python are installed
2. Run **install.bat** (Windows) or **install.sh** (Mac/Linux)
3. Wait for completion (10-15 minutes)
4. Run `npm start`

### For Advanced Users:
1. Run **setup.bat** or **setup.sh** to create folders
2. Follow manual steps in README.md
3. Customize installation as needed

### Just Want to Try It?
- Read **QUICKSTART.md** only
- Follow the simplified steps
- Takes about 10 minutes

### Having Problems?
- Open **TROUBLESHOOTING.md**
- Find your specific error
- Follow the solution steps

## 📊 File Comparison

| File | Purpose | Audience | Time |
|------|---------|----------|------|
| README.md | Complete docs | Everyone | Full reference |
| QUICKSTART.md | Fast start | Beginners | 10 min read |
| TROUBLESHOOTING.md | Fix issues | When stuck | As needed |
| install.bat/sh | Auto install | Beginners | 10-15 min |
| setup.bat/sh | Structure only | Advanced | 1 min |

## 💡 Tips

- **First time?** → Use install.bat/sh
- **Having errors?** → Check TROUBLESHOOTING.md
- **Want details?** → Read full README.md
- **In a hurry?** → Use QUICKSTART.md
- **Developer?** → See README.md "For Developers" section

## ✅ What Gets Installed

When you run the installation scripts:

1. **Folder Structure:**
   - electron/ (desktop app code)
   - src/python/ (backend server)
   - src/renderer/ (frontend UI)
   - sample-data/dicom/ (your medical images)

2. **Node.js Packages:**
   - electron (desktop framework)
   - axios (HTTP client)
   - dwv (DICOM viewer)
   - ~150 MB total

3. **Python Packages:**
   - FastAPI + uvicorn (web server)
   - pydicom (DICOM processing)
   - NumPy, Pillow (image processing)
   - ~300 MB total

Total disk space needed: ~500 MB + your DICOM files

## 🔄 Updates and Maintenance

If you pull updates from the repository:

```bash
# Update Node.js dependencies
npm install

# Update Python dependencies
cd src\python
venv\Scripts\activate  # or source venv/bin/activate
pip install -r requirements.txt --upgrade
```

Or just run install.bat/sh again!

## 🗑️ Uninstalling

To completely remove the application:

1. Delete the project folder
2. (Optional) Uninstall Node.js and Python if not needed for other projects

The application doesn't install anything system-wide except Node and Python packages in the project folder.
