const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let mainWindow;
let pythonProcess;
const PYTHON_PORT = 8000;

// Python service management
function startPythonService() {
    const pythonPath = path.join(__dirname, '../src/python');
    const scriptPath = path.join(pythonPath, 'main.py');
    
    // Determine Python executable (venv or system)
    const pythonExecutable = process.platform === 'win32' 
        ? path.join(pythonPath, 'venv', 'Scripts', 'python.exe')
        : path.join(pythonPath, 'venv', 'bin', 'python');

    console.log('Starting Python service...');
    console.log('Python executable:', pythonExecutable);
    console.log('Script path:', scriptPath);

    pythonProcess = spawn(pythonExecutable, [scriptPath], {
        cwd: pythonPath
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });

    // Wait for Python service to be ready
    return waitForPythonService();
}

async function waitForPythonService(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await axios.get(`http://localhost:${PYTHON_PORT}/health`);
            console.log('Python service is ready!');
            return true;
        } catch (error) {
            console.log(`Waiting for Python service... (${i + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error('Python service failed to start');
}

function stopPythonService() {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
}

// Create main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#1a1a1a',
        title: 'MedGemma Radiology PACS'
    });

    mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.handle('select-dicom-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (result.canceled) {
        return null;
    }
    
    return result.filePaths[0];
});

ipcMain.handle('load-dicom-study', async (event, folderPath) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/load-study`, {
            path: folderPath
        });
        return response.data;
    } catch (error) {
        console.error('Error loading DICOM study:', error);
        throw error;
    }
});

ipcMain.handle('analyze-study', async (event, studyId) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/analyze-study`, {
            study_id: studyId
        });
        return response.data;
    } catch (error) {
        console.error('Error analyzing study:', error);
        throw error;
    }
});

ipcMain.handle('analyze-slice', async (event, studyId, sliceIndex) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/analyze-slice`, {
            study_id: studyId,
            slice_index: sliceIndex
        });
        return response.data;
    } catch (error) {
        console.error('Error analyzing slice:', error);
        throw error;
    }
});

ipcMain.handle('chat-query', async (event, query, context) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/chat`, {
            query: query,
            context: context
        });
        return response.data;
    } catch (error) {
        console.error('Error in chat query:', error);
        throw error;
    }
});

ipcMain.handle('get-incidental-findings', async (event, studyId) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/incidental-findings`, {
            study_id: studyId
        });
        return response.data;
    } catch (error) {
        console.error('Error getting incidental findings:', error);
        throw error;
    }
});

ipcMain.handle('generate-report', async (event, studyId, findings) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/generate-report`, {
            study_id: studyId,
            findings: findings
        });
        return response.data;
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
});

ipcMain.handle('submit-feedback', async (event, feedbackData) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/feedback`, feedbackData);
        return response.data;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }
});

ipcMain.handle('get-slice-image', async (event, studyId, sliceIndex, windowCenter, windowWidth, windowPreset) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/get-slice-image`, {
            study_id: studyId,
            slice_index: sliceIndex,
            window_center: windowCenter,
            window_width: windowWidth,
            window_preset: windowPreset
        });
        return response.data;
    } catch (error) {
        console.error('Error getting slice image:', error);
        throw error;
    }
});

ipcMain.handle('get-slice-pixels', async (event, studyId, sliceIndex) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/get-slice-pixels`, {
            study_id: studyId,
            slice_index: sliceIndex
        });
        return response.data;
    } catch (error) {
        console.error('Error getting slice pixels:', error);
        throw error;
    }
});

ipcMain.handle('get-dicom-file-data', async (event, studyId) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/get-dicom-file-data`, {
            study_id: studyId
        });
        return response.data;
    } catch (error) {
        console.error('Error getting DICOM file data:', error);
        throw error;
    }
});

ipcMain.handle('get-dicom-urls', async (event, studyId) => {
    try {
        const response = await axios.post(`http://localhost:${PYTHON_PORT}/api/get-dicom-urls`, {
            study_id: studyId
        });
        return response.data;
    } catch (error) {
        console.error('Error getting DICOM URLs:', error);
        throw error;
    }
});

// App lifecycle
app.whenReady().then(async () => {
    try {
        await startPythonService();
        createWindow();
    } catch (error) {
        console.error('Failed to start application:', error);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopPythonService();
        app.quit();
    }
});

app.on('before-quit', () => {
    stopPythonService();
});
