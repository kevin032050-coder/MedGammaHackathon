// Voice Manager
class VoiceManager {
    constructor(app) {
        this.app = app;
        this.recognition = null;
        this.isRecording = false;
        this.setupSpeechRecognition();
        this.setupEventListeners();
    }

    setupSpeechRecognition() {
        // Check for Web Speech API support
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                this.handleSpeechResult(event);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopRecording();
                this.app.showToast('Voice recognition error', 'error');
            };

            this.recognition.onend = () => {
                this.stopRecording();
            };
        } else {
            console.warn('Speech recognition not supported');
        }
    }

    setupEventListeners() {
        document.getElementById('voice-btn').addEventListener('click', () => {
            this.toggleVoiceRecording('findings');
        });

        document.getElementById('voice-final-btn').addEventListener('click', () => {
            this.toggleVoiceRecording('final');
        });
    }

    toggleVoiceRecording(mode) {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording(mode);
        }
    }

    startRecording(mode) {
        if (!this.recognition) {
            // Fallback: simulate with text input
            this.simulateVoiceDictation(mode);
            return;
        }

        this.isRecording = true;
        this.recordingMode = mode;
        this.transcript = '';

        try {
            this.recognition.start();
            
            const btn = mode === 'findings' ? 
                document.getElementById('voice-btn') : 
                document.getElementById('voice-final-btn');
            
            btn.textContent = '⏹️ Stop Recording';
            btn.style.background = '#f44336';

            this.app.showToast('Recording...', 'info');
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.stopRecording();
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }

        // Reset buttons
        document.getElementById('voice-btn').textContent = '🎤 Voice Dictation (Findings)';
        document.getElementById('voice-final-btn').textContent = '🎤 Final Voice Dictation';
        
        document.getElementById('voice-btn').style.background = '';
        document.getElementById('voice-final-btn').style.background = '';

        // Process transcript
        if (this.transcript) {
            this.processTranscript(this.transcript, this.recordingMode);
        }
    }

    handleSpeechResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        this.transcript = (this.transcript + finalTranscript).trim();
    }

    processTranscript(text, mode) {
        if (mode === 'findings') {
            // Add to radiologist findings
            const findingsField = document.getElementById('radiologist-findings');
            findingsField.value += (findingsField.value ? '\n\n' : '') + text;
            this.app.showToast('Dictation added to findings', 'success');
        } else if (mode === 'final') {
            // Add to impression
            const impressionField = document.getElementById('impression');
            impressionField.value += (impressionField.value ? ' ' : '') + text;
            this.app.showToast('Final dictation recorded', 'success');
        }
    }

    simulateVoiceDictation(mode) {
        // Fallback when Web Speech API is not available
        const text = prompt(
            mode === 'findings' ? 
            'Enter findings (simulated voice input):' : 
            'Enter final report (simulated voice input):'
        );

        if (text) {
            this.processTranscript(text, mode);
        }
    }
}
