// Chat Manager
class ChatManager {
    constructor(app) {
        this.app = app;
        this.messagesContainer = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send-btn');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    async sendMessage() {
        const query = this.input.value.trim();
        if (!query || !this.app.currentStudy) return;

        // Clear input
        this.input.value = '';

        // Add user message
        this.addMessage(query, 'user');

        // Get chat mode
        const mode = document.querySelector('input[name="chat-mode"]:checked').value;

        // Prepare context
        const context = {
            study_id: this.app.currentStudy.study_id,
            current_slice: this.app.currentSlice,
            mode: mode,
            findings: this.app.currentStudy.analysis ? this.app.currentStudy.analysis.findings : []
        };

        try {
            // Send to Med Gemma
            const response = await window.electronAPI.chatQuery(query, context);

            if (response.success) {
                this.addMessage(response.response.answer, 'ai', response.response.references);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
        }
    }

    addMessage(text, type, references = []) {
        const message = document.createElement('div');
        message.className = `chat-message ${type}`;

        const textNode = document.createElement('p');
        textNode.textContent = text;
        message.appendChild(textNode);

        // Add references if available
        if (references && references.length > 0) {
            const refContainer = document.createElement('div');
            references.forEach(ref => {
                const refBadge = document.createElement('span');
                refBadge.className = 'chat-reference';
                if (ref.type === 'slice') {
                    refBadge.textContent = `Slice ${ref.value}`;
                    refBadge.onclick = () => {
                        this.app.viewer.goToSlice(ref.value);
                    };
                    refBadge.style.cursor = 'pointer';
                } else {
                    refBadge.textContent = `${ref.value} (${Math.round(ref.confidence * 100)}%)`;
                }
                refContainer.appendChild(refBadge);
            });
            message.appendChild(refContainer);
        }

        this.messagesContainer.appendChild(message);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}
