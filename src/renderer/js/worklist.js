// Worklist Manager
class WorklistManager {
    constructor(app) {
        this.app = app;
        this.studies = [];
    }

    addStudy(study) {
        this.studies.push(study);
        this.renderWorklist();
        
        // Auto-select if it's the first study
        if (this.studies.length === 1) {
            this.selectStudy(study.study_id);
        }
    }

    updateStudyPriority(studyId, analysis) {
        const study = this.studies.find(s => s.study_id === studyId);
        if (study) {
            study.analysis = analysis;
            this.renderWorklist();
        }
    }

    sortWorklist() {
        if (this.app.aiPriorityEnabled) {
            // Sort by priority: Critical > Urgent > Routine
            const priorityOrder = { 'CRITICAL': 0, 'URGENT': 1, 'ROUTINE': 2, 'PROCESSING': 3, 'ERROR': 4 };
            this.studies.sort((a, b) => {
                const aPriority = a.analysis ? priorityOrder[String(a.analysis.priority).toUpperCase()] ?? 3 : 3;
                const bPriority = b.analysis ? priorityOrder[String(b.analysis.priority).toUpperCase()] ?? 3 : 3;
                return aPriority - bPriority;   
            });
        } else {
            // Sort by study date/time
            this.studies.sort((a, b) => {
                return new Date(b.study_info.study_date) - new Date(a.study_info.study_date);
            });
        }
        this.renderWorklist();
    }

    renderWorklist() {
        const container = document.getElementById('worklist-container');
        
        if (this.studies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No studies loaded</p>
                    <p class="hint">Click "Load DICOM Study" to begin</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.studies.map(study => this.createStudyItem(study)).join('');

        // Add click handlers
        container.querySelectorAll('.worklist-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectStudy(item.dataset.studyId);
            });
        });
    }

    createStudyItem(study) {
        const analysis = study.analysis;

        // Default state when analysis not present yet
        const priorityRaw = analysis?.priority ?? "PROCESSING"; // <-- change default
        const priority = String(priorityRaw).toUpperCase();

        const confidence = typeof analysis?.confidence === "number" ? analysis.confidence : null;
        const reasoning = analysis?.reasoning ?? "AI is analyzing this study…";

        const isActive =
            this.app.currentStudy && this.app.currentStudy.study_id === study.study_id;

        // Badge label (what you display)
        const badgeText =
            priority === "PROCESSING" ? "PROCESSING…" :
            priority === "ERROR" ? "ERROR" :
            priority;

        // Class name used for CSS. Map special states to something safe.
        const priorityClass =
            priority === "PROCESSING" ? "processing" :
            priority === "ERROR" ? "error" :
            priority.toLowerCase(); // critical/urgent/routine

        return `
            <div class="worklist-item priority-${priorityClass} ${isActive ? 'active' : ''}"
                data-study-id="${study.study_id}">
            <div class="study-header">
                <span class="study-modality">${study.study_info.modality} ${study.study_info.body_part}</span>
                <span class="priority-badge ${priorityClass}">${badgeText}</span>
            </div>

            <div class="patient-meta">
                ${study.patient.name} | ${study.patient.age}y ${study.patient.sex}
            </div>
            <div class="patient-meta">
                ${study.study_info.study_date} ${study.study_info.study_time}
            </div>

            ${analysis ? `
                <div class="ai-reason">
                AI: ${reasoning}
                </div>

                ${confidence === null ? "" : `
                <div class="confidence-bar-container">
                    <div class="confidence-label">Confidence: ${Math.round(confidence * 100)}%</div>
                    <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence * 100}%"></div>
                    </div>
                </div>
                `}
            ` : `
                <div class="ai-reason">
                AI: ${reasoning}
                </div>
            `}
            </div>
        `;
        }

    selectStudy(studyId) {
        const study = this.studies.find(s => s.study_id === studyId);
        if (!study) return;

        this.app.currentStudy = study;
        this.app.currentSlice = 0;
        
        // Update UI
        this.app.updatePatientInfo();
        this.app.viewer.loadStudy(study);
        
        // Refresh worklist to show active state
        this.renderWorklist();
    }
}
