// Report Manager
class ReportManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('generate-report-btn').addEventListener('click', async () => {
            await this.generateReport();
        });

        document.getElementById('finalize-report-btn').addEventListener('click', () => {
            this.finalizeReport();
        });
    }

    async generateReport() {
        if (!this.app.currentStudy) return;

        try {
            const response = await window.electronAPI.generateReport(
                this.app.currentStudy.study_id,
                null
            );

            if (response.success) {
                this.populateReport(response.report);
                this.app.showToast('Report generated', 'success');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            this.app.showToast('Error generating report', 'error');
        }
    }

    populateReport(report) {
        // Clinical History
        document.getElementById('clinical-history').value = report.clinical_history || '';

        // AI Suggested Findings
        document.getElementById('ai-findings').value = report.ai_suggested_findings || '';

        // Impression
        document.getElementById('impression').value = report.impression || '';

        // Severity scores
        if (report.severity_scores) {
            document.getElementById('aspects-score').textContent = 
                `${report.severity_scores.ASPECTS} (${Math.round(report.severity_scores.confidence * 100)}%)`;
        }
    }

    finalizeReport() {
        const radiologistFindings = document.getElementById('radiologist-findings').value;
        const impression = document.getElementById('impression').value;

        if (!radiologistFindings.trim() && !impression.trim()) {
            this.app.showToast('Please enter findings and impression before signing', 'error');
            return;
        }

        // In a real system, this would save to database and lock the report
        this.app.showToast('Report finalized and signed', 'success');
        
        // Disable editing
        document.getElementById('radiologist-findings').readOnly = true;
        document.getElementById('impression').readOnly = true;
        document.getElementById('finalize-report-btn').disabled = true;
    }
}
