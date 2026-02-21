# Troubleshooting Guide - MedGemma Radiology PACS

Common problems and how to fix them.

---

## Installation Issues

### ❌ "npm: command not found" or "node: command not found"

**Cause:** Node.js is not installed or not in your system PATH

**Solutions:**
1. Install Node.js from https://nodejs.org/ (choose LTS version)
2. During installation, make sure "Add to PATH" is checked
3. **Restart your terminal** after installation
4. Verify with: `node --version`

**Windows specific:**
- If you installed Node.js but still get this error, you may need to restart your computer
- Check Environment Variables: Search "Environment Variables" in Windows, look for "Path" in System Variables, ensure Node.js path is there

---

### ❌ "python: command not found"

**Cause:** Python is not installed or not in your system PATH

**Solutions:**
1. Install Python from https://python.org/downloads/
2. **IMPORTANT:** Check "Add Python to PATH" during installation
3. Restart terminal after installation
4. Verify with: `python --version` (Windows) or `python3 --version` (Mac/Linux)

**Mac/Linux users:**
- Use `python3` instead of `python` in all commands
- Python 2 may be pre-installed; you need Python 3

**Windows users:**
- If you get "Python was not found" but installed it, try `py --version`
- You may need to repair Python installation (Control Panel > Programs > Python > Modify > Modify > Check "Add to PATH")

---

### ❌ "pip install" fails or times out

**Cause:** Network issues, outdated pip, or missing build tools

**Solutions:**
1. **Update pip first:**
   ```bash
   python -m pip install --upgrade pip
   ```

2. **Try with different timeout:**
   ```bash
   pip install -r requirements.txt --timeout 300
   ```

3. **Install packages one at a time** to identify which one fails:
   ```bash
   pip install fastapi
   pip install uvicorn[standard]
   pip install pydantic
   # ... etc
   ```

4. **For Windows users** - If you get compiler errors:
   - Install Visual C++ Build Tools from https://visualstudio.microsoft.com/visual-cpp-build-tools/

---

### ❌ "Cannot create virtual environment" or venv errors

**Cause:** Python venv module not installed (common on Linux)

**Solutions:**

**Ubuntu/Debian:**
```bash
sudo apt-get install python3-venv
```

**Fedora/RedHat:**
```bash
sudo yum install python3-venv
```

**Windows/Mac:**
- venv is included with Python 3.3+, try reinstalling Python

---

## Runtime Issues

### ❌ Application window opens but shows blank screen or errors

**Debugging steps:**

1. **Check Python server status:**
   - Open browser to: http://127.0.0.1:8000/health
   - Should see: `{"status":"healthy","med_gemma_loaded":false}`
   - If you see this, backend is working!

2. **Check browser console:**
   - In the Electron app, go to View > Toggle Developer Tools
   - Check the Console tab for JavaScript errors
   - Look for network errors (red text)

3. **Common fixes:**
   - Make sure Python server started (you should see "Uvicorn running on http://127.0.0.1:8000" in terminal)
   - Restart the application
   - Clear any cached data

---

### ❌ "Address already in use" or "Port 8000 is already in use"

**Cause:** Another application is using port 8000

**Solutions:**

1. **Find and stop the other application:**
   
   **Windows:**
   ```cmd
   netstat -ano | findstr :8000
   taskkill /PID <process_id> /F
   ```
   
   **Mac/Linux:**
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

2. **Or change the port** in `src/python/main.py`:
   - Line 353: Change `port=8000` to `port=8001`
   - Also update any frontend code that connects to the backend

---

### ❌ Python virtual environment won't activate

**Windows:**
- Make sure you're using `venv\Scripts\activate` (with backslashes)
- If you get "execution policy" error:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Then try activating again

**Mac/Linux:**
- Use `source venv/bin/activate` (with forward slashes)
- Make sure setup.sh is executable: `chmod +x setup.sh`

---

### ❌ DICOM files won't load

**Possible issues:**

1. **Files aren't actually DICOM:**
   - DICOM files usually don't have extensions or use .dcm
   - Try opening in a DICOM viewer first to verify

2. **Folder structure:**
   - Each study should be in its own folder
   - Example: `sample-data/dicom/study1/*.dcm`

3. **Permissions:**
   - Make sure the application has read permission for the folder
   - Try copying files to `sample-data/dicom/` folder in project

4. **File path issues:**
   - Avoid paths with special characters or spaces
   - Use simple folder names: `study1`, `chest-ct`, etc.

---

### ❌ "Med Gemma model not loaded" warning

**Expected behavior:** This is normal! The full Med Gemma AI model is not included.

**What this means:**
- The application will work, but use simulated AI responses
- To use real AI, you need to install Med Gemma separately (requires Google access)

**If you want real AI:**
1. Apply for Med Gemma access from Google
2. Uncomment AI dependencies in `requirements.txt`
3. Download model weights
4. Update `src/python/med_gemma.py`

---

## Platform-Specific Issues

### Windows Specific

**Path separator issues:**
- Use backslashes: `src\python\main.py`
- Or use forward slashes in quotes: `"src/python/main.py"`

**PowerShell vs Command Prompt:**
- Some commands work better in Command Prompt (cmd.exe)
- If you have issues in PowerShell, try Command Prompt

### Mac Specific

**Permission denied:**
```bash
chmod +x setup.sh
chmod +x src/python/venv/bin/activate
```

**Python version conflicts:**
- macOS comes with Python 2.7
- Always use `python3` and `pip3`

### Linux Specific

**Missing dependencies:**
- You may need to install system packages:
  ```bash
  sudo apt-get update
  sudo apt-get install build-essential python3-dev
  ```

---

## Performance Issues

### Application is slow

1. **DICOM files are very large:**
   - This is normal for medical imaging
   - Loading a 500-image CT scan takes time
   - Consider starting with smaller studies

2. **Not enough RAM:**
   - Medical imaging is memory-intensive
   - Recommended: 8GB+ RAM
   - Close other applications

3. **Check Python server logs:**
   - Look for errors or warnings in terminal
   - Some processing may be slow on older hardware

---

## Still Having Problems?

### Collect diagnostic information:

1. **Versions:**
   ```bash
   node --version
   python --version
   npm --version
   ```

2. **Check package installation:**
   ```bash
   cd src/python
   venv\Scripts\activate  # or source venv/bin/activate
   pip list
   ```

3. **Check server health:**
   - Visit: http://127.0.0.1:8000/docs
   - Visit: http://127.0.0.1:8000/health

4. **Look at logs:**
   - Terminal output when running `npm start`
   - Developer Tools console in Electron app (View > Toggle Developer Tools)

### Getting Help:

- Include your OS (Windows 10, macOS 14, Ubuntu 22.04, etc.)
- Include error messages (copy/paste exact text)
- Include what you tried and what happened
- Include version numbers from above

---

## Clean Reinstall

If all else fails, start fresh:

1. **Delete these folders:**
   - `node_modules/`
   - `src/python/venv/`
   - `package-lock.json`

2. **Reinstall everything:**
   ```bash
   npm install
   cd src/python
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   cd ../..
   npm start
   ```

---

**Remember:** This is a development/demo application. Some rough edges are expected!
