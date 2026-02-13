// Main Application Logic
// Track which studies are currently being analyzed (async in-flight)
const analyzingByStudyId = new Map(); // studyId -> boolean

class RadiologyApp {
    constructor() {
        console.log('RadiologyApp constructor called');
        this.currentStudy = null;
        this.currentSlice = 0;
        this.isAnalyzing - false;
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
        console.log('Creating WorklistManager...');
        this.worklist = new WorklistManager(this);
        
        console.log('Creating DICOMViewer...');
        this.viewer = new DICOMViewer(this);
        
        console.log('Creating ChatManager...');
        this.chat = new ChatManager(this);
        
        console.log('Creating ReportManager...');
        this.report = new ReportManager(this);
        
        console.log('Creating VoiceManager...');
        this.voice = new VoiceManager(this);
        
        // Set up event listeners
        console.log('Setting up event listeners...');
        this.setupEventListeners();
        
        console.log('✅ App initialized successfully');
    }

    setupEventListeners() {
        // Load Study Button
        const loadBtn = document.getElementById('load-study-btn');
        console.log('Load button element:', loadBtn);
        
        if (loadBtn) {
            loadBtn.addEventListener('click', async () => {
                console.log('Load button clicked!');
                await this.loadStudy();
            });
        } else {
            console.error('Load button not found!');
        }

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
        console.log('=== loadStudy() called ===');
        try {
            // Open folder dialog
            console.log('Opening folder dialog...');
            const folderPath = await window.electronAPI.selectDicomFolder();
            console.log('Folder selected:', folderPath);
            
            if (!folderPath) {
                console.log('No folder selected');
                return;
            }

            console.log('Selected folder:', folderPath);
            this.showToast('Loading DICOM study...', 'info');

            // Load study via Python backend
            const response = await window.electronAPI.loadDicomStudy(folderPath);
            
            console.log('Load study response:', response);
            
            if (response.success) {
                this.currentStudy = response.study;
                console.log('Study loaded:', this.currentStudy);
                console.log('Number of slices:', this.currentStudy.num_slices);

                // Add to worklist
                this.worklist.addStudy(this.currentStudy);

                // Set a placeholder state so the UI shows PROCESSING instead of ROUTINE
                analyzingByStudyId.set(this.currentStudy.study_id, true);

                // Optional: set placeholder analysis so render never defaults to ROUTINE
                this.currentStudy.analysis = {
                    priority: "PROCESSING",
                    reasoning: "AI is analyzing this study…",
                    confidence: null,
                    slice_priority_map: [],
                    slice_triage: []
                };

                // Force worklist to update immediately
                this.worklist.updateStudyPriority(this.currentStudy.study_id, this.currentStudy.analysis);

                // Analyze with Med Gemma
                await this.analyzeStudy(this.currentStudy.study_id);

                // Update UI
                this.updatePatientInfo();
                this.enableControls();

                this.showToast(`Study loaded successfully - ${this.currentStudy.num_slices} slices`, 'success');
            } else {
                console.error('Study load failed:', response);
                this.showToast('Failed to load study', 'error');
            }
        } catch (error) {
            console.error('Error loading study:', error);
            this.showToast('Error loading study: ' + error.message, 'error');
        }
    }

    async analyzeStudy(studyId) {
        analyzingByStudyId.set(studyId, true);

        try {
            this.showToast('Analyzing with Med Gemma...', 'info');

            // ✅ actually call Electron -> main -> Python
            const response = await window.electronAPI.analyzeStudy(studyId);
            console.log("ANALYZE STUDY RAW RESPONSE:", response);

            if (!response || !response.success) {
            const errMsg = response?.error || response?.detail || 'Unknown analysis failure';
            this.showToast(`Analysis failed: ${errMsg}`, 'error');
            return null;
            }

            // ✅ Support BOTH backend response shapes:
            const analysis = response.analysis
            ? response.analysis
            : {
                priority: response.patient_priority ?? "ROUTINE",
                reasoning: response.patient_rationale ?? "",
                confidence: response.confidence ?? 1.0,
                slice_priority_map: response.slice_priority_map ?? [],
                slice_triage: response.slice_triage ?? [],
                };

            // ✅ store on current study
            if (this.currentStudy && this.currentStudy.study_id === studyId) {
            this.currentStudy.analysis = analysis;

            console.log("STORED ANALYSIS:", this.currentStudy.analysis);

            // ✅ update worklist UI
            this.worklist.updateStudyPriority(studyId, this.currentStudy.analysis);

            // ✅ optional: jump to first CRITICAL slice
            const criticalSlice = (analysis.slice_priority_map || []).find(s => s.priority === 'CRITICAL');
            if (criticalSlice) {
                this.viewer.goToSlice(criticalSlice.slice_index);
            }

            this.showToast(
                `Patient priority: ${analysis.priority}`,
                analysis.priority === 'CRITICAL' ? 'error' : (analysis.priority === 'URGENT' ? 'info' : 'success')
            );
            }

            return analysis;

        } catch (error) {
            console.error('Error analyzing study:', error);

            // IMPORTANT: reflect error state, don’t silently leave ROUTINE
            if (this.currentStudy && this.currentStudy.study_id === studyId) {
            this.currentStudy.analysis = {
                priority: "ERROR",
                reasoning: `Analysis failed: ${error.message}`,
                confidence: null,
                slice_priority_map: [],
                slice_triage: []
            };
            this.worklist.updateStudyPriority(studyId, this.currentStudy.analysis);
            }

            this.showToast('Analysis error', 'error');
            return null;

        } finally {
            analyzingByStudyId.set(studyId, false);
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

    const map = this.currentStudy.analysis.slice_priority_map || [];
    const firstCritical = map.find(x => x.priority === 'CRITICAL');
    const firstUrgent = map.find(x => x.priority === 'URGENT');

    const target = firstCritical?.slice_index ?? firstUrgent?.slice_index ?? 0;

    this.viewer.goToSlice(target);
    this.showToast(`Jumped to slice ${target + 1} (${firstCritical ? 'CRITICAL' : firstUrgent ? 'URGENT' : 'ROUTINE'})`, 'success');
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
