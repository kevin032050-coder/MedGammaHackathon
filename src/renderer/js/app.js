// Main Application Logic
class RadiologyApp {
    constructor() {
        this.currentStudy = null;
        this.currentSlice = 0;
        this.aiPriorityEnabled = true;
        this.aiOverlayEnabled = true;
        this.sliceAnalysisCache = {};
        this.dwellTimer = null;
        this.dwellTimeThreshold = 5000; // 5 seconds
        this.shownTooltips = new Set();
        
        this.init();
    }

    init() {
        console.log('Initializing MedGemma Radiology PACS...');
        
        // Initialize modules
        this.worklist = new WorklistManager(this);
        this.viewer = new DICOMViewer(this);
        this.chat = new ChatManager(this);
        this.report = new ReportManager(this);
        this.voice = new VoiceManager(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('App initialized successfully');
    }

    setupEventListeners() {
        // Load Study Button
        document.getElementById('load-study-btn').addEventListener('click', async () => {
            await this.loadStudy();
        });

        // AI Priority Toggle
        document.getElementById('ai-priority-toggle').addEventListener('change', (e) => {
            this.aiPriorityEnabled = e.target.checked;
            this.worklist.sortWorklist();
        });

        // AI Overlay Toggle
        document.getElementById('ai-overlay-toggle').addEventListener('change', (e) => {
            this.aiOverlayEnabled = e.target.checked;
            this.viewer.toggleOverlay(e.target.checked);
        });

        // EHR Context Button
        document.getElementById('ehr-context-btn').addEventListener('click', () => {
            this.useEHRContext();
        });

        // Tab Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Feedback Buttons
        document.getElementById('feedback-yes').addEventListener('click', () => {
            this.submitFeedback(true);
        });

        document.getElementById('feedback-no').addEventListener('click', () => {
            document.getElementById('feedback-correction').classList.remove('hidden');
        });

        document.getElementById('submit-correction').addEventListener('click', () => {
            const correction = document.getElementById('correction-input').value;
            this.submitFeedback(false, correction);
        });
    }

    async loadStudy() {
        try {
            // Open folder dialog
            const folderPath = await window.electronAPI.selectDicomFolder();
            if (!folderPath) return;

            this.showToast('Loading DICOM study...', 'info');

            // Load study via Python backend
            const response = await window.electronAPI.loadDicomStudy(folderPath);
            
            if (response.success) {
                this.currentStudy = response.study;
                console.log('Study loaded:', this.currentStudy);

                // Add to worklist
                this.worklist.addStudy(this.currentStudy);

                // Analyze with Med Gemma
                await this.analyzeStudy(this.currentStudy.study_id);

                // Update UI
                this.updatePatientInfo();
                this.enableControls();

                this.showToast('Study loaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error loading study:', error);
            this.showToast('Error loading study: ' + error.message, 'error');
        }
    }

    async analyzeStudy(studyId) {
        try {
            this.showToast('Analyzing with Med Gemma...', 'info');

            const response = await window.electronAPI.analyzeStudy(studyId);
            
            if (response.success) {
                // Store analysis results
                if (this.currentStudy && this.currentStudy.study_id === studyId) {
                    this.currentStudy.analysis = response.analysis;
                    
                    // Update worklist priority
                    this.worklist.updateStudyPriority(studyId, response.analysis);
                    
                    // Load incidental findings
                    await this.loadIncidentalFindings(studyId);
                    
                    // Generate report suggestions
                    await this.generateReport(studyId);
                    
                    this.showToast('Analysis complete', 'success');
                }
            }
        } catch (error) {
            console.error('Error analyzing study:', error);
            this.showToast('Analysis error (using mock data)', 'error');
        }
    }

    async loadIncidentalFindings(studyId) {
        try {
            const response = await window.electronAPI.getIncidentalFindings(studyId);
            if (response.success) {
                this.displayIncidentalFindings(response.incidental_findings);
            }
        } catch (error) {
            console.error('Error loading incidental findings:', error);
        }
    }

    async generateReport(studyId) {
        try {
            const response = await window.electronAPI.generateReport(studyId, null);
            if (response.success) {
                this.report.populateReport(response.report);
            }
        } catch (error) {
            console.error('Error generating report:', error);
        }
    }

    displayIncidentalFindings(findings) {
        const container = document.getElementById('incidental-findings-list');
        
        if (!findings || findings.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No incidental findings detected</p></div>';
            return;
        }

        container.innerHTML = findings.map(finding => `
            <div class="incidental-item ${finding.risk_category}">
                <div class="incidental-header-row">
                    <span class="incidental-type">${finding.type.replace('_', ' ').toUpperCase()}</span>
                    <span class="risk-badge ${finding.risk_category}">${finding.risk_category}</span>
                </div>
                <div class="incidental-details">
                    ${finding.location} - ${finding.size_mm ? finding.size_mm + 'mm' : finding.severity}
                    <br>Slice: ${finding.slice}
                </div>
                <div class="incidental-recommendation">
                    💡 ${finding.recommendation}
                </div>
            </div>
        `).join('');
    }

    updatePatientInfo() {
        if (!this.currentStudy) return;

        const { patient, study_info, clinical_context } = this.currentStudy;
        
        document.getElementById('patient-name').textContent = patient.name;
        document.getElementById('patient-age-sex').textContent = `${patient.age}y ${patient.sex}`;
        document.getElementById('patient-protocol').textContent = study_info.protocol;
        
        if (clinical_context && clinical_context.vitals) {
            const vitals = clinical_context.vitals;
            document.getElementById('patient-vitals').textContent = 
                `GCS: ${vitals.gcs} | BP: ${vitals.bp} | HR: ${vitals.hr}`;
        }
    }

    enableControls() {
        document.getElementById('ehr-context-btn').disabled = false;
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send-btn').disabled = false;
        document.getElementById('voice-btn').disabled = false;
        document.getElementById('generate-report-btn').disabled = false;
        document.getElementById('voice-final-btn').disabled = false;
        document.getElementById('finalize-report-btn').disabled = false;
        document.getElementById('feedback-yes').disabled = false;
        document.getElementById('feedback-no').disabled = false;
    }

    useEHRContext() {
        if (!this.currentStudy || !this.currentStudy.analysis) return;

        const findings = this.currentStudy.analysis.findings;
        if (findings && findings.length > 0) {
            // Jump to key slice
            const keySlice = findings[0].slice_range ? findings[0].slice_range[0] : 0;
            this.viewer.goToSlice(keySlice);
            
            this.showToast(`Jumped to slice ${keySlice} - ${findings[0].type}`, 'success');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    async submitFeedback(agreed, correction = null) {
        if (!this.currentStudy) return;

        try {
            await window.electronAPI.submitFeedback({
                study_id: this.currentStudy.study_id,
                agreed: agreed,
                correction: correction
            });

            if (agreed) {
                this.showToast('Thank you! Feedback logged.', 'success');
            } else {
                this.showToast('Correction submitted for model improvement', 'success');
                document.getElementById('feedback-correction').classList.add('hidden');
                document.getElementById('correction-input').value = '';
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RadiologyApp();
});
