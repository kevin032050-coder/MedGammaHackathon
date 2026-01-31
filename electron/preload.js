const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File system operations
    selectDicomFolder: () => ipcRenderer.invoke('select-dicom-folder'),
    
    // DICOM operations
    loadDicomStudy: (folderPath) => ipcRenderer.invoke('load-dicom-study', folderPath),
    
    // Med Gemma AI operations
    analyzeStudy: (studyId) => ipcRenderer.invoke('analyze-study', studyId),
    analyzeSlice: (studyId, sliceIndex) => ipcRenderer.invoke('analyze-slice', studyId, sliceIndex),
    
    // Chat interface
    chatQuery: (query, context) => ipcRenderer.invoke('chat-query', query, context),
    
    // Incidental findings
    getIncidentalFindings: (studyId) => ipcRenderer.invoke('get-incidental-findings', studyId),
    
    // Report generation
    generateReport: (studyId, findings) => ipcRenderer.invoke('generate-report', studyId, findings),
    
    // Feedback system
    submitFeedback: (feedbackData) => ipcRenderer.invoke('submit-feedback', feedbackData)
});
