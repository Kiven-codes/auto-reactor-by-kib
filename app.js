/**
 * Auto-Reactor Application
 * Intelligent response automation for Google Meet & Classroom
 */

class AutoReactor {
    constructor() {
        // Configuration
        this.config = {
            isActive: false,
            recognitionMode: 'web-speech', // 'web-speech' or 'gemini'
            geminiApiKey: '',
            customResponse: 'Yes, I\'m here!',
            sensitivity: 0.7,
            sendEmoji: false,
            selectedEmoji: '❤️',
            triggerPhrases: [
                'Are you still there?',
                'Andiyan pa ba kayo?',
                'Are you there?',
                'Hello',
                'Hi there'
            ]
        };

        // State
        this.state = {
            detectionCount: 0,
            responseCount: 0,
            sessionStartTime: null,
            isListening: false,
            currentTranscript: '',
            lastDetectedPhrase: null,
            accuracyCount: 0,
            attemptCount: 0
        };

        // Audio Context
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.scriptProcessor = null;
        this.dataArray = null;

        // Web Speech API
        this.recognition = null;
        this.recognitionActive = false;

        // DOM Elements
        this.initDOM();
        this.attachEventListeners();
        this.loadSavedConfig();
        this.setupSessionTimer();
    }

    initDOM() {
        // Controls
        this.masterToggle = document.getElementById('masterToggle');
        this.geminiApiKeyInput = document.getElementById('geminiApiKey');
        this.modeBtns = document.querySelectorAll('.mode-btn');
        this.customResponseInput = document.getElementById('customResponse');
        this.emojiToggle = document.getElementById('emojiToggle');
        this.emojiSelect = document.getElementById('emojiSelect');
        this.sensitivitySlider = document.getElementById('sensitivitySlider');
        this.newTriggerInput = document.getElementById('newTriggerInput');
        this.addTriggerBtn = document.getElementById('addTriggerBtn');
        this.triggerList = document.getElementById('triggerList');

        // Status Indicators
        this.statusText = document.getElementById('statusText');
        this.pulseIndicator = document.getElementById('pulseIndicator');

        // Monitoring
        this.detectionCountDisplay = document.getElementById('detectionCount');
        this.responseCountDisplay = document.getElementById('responseCount');
        this.sessionDurationDisplay = document.getElementById('sessionDuration');
        this.accuracyRateDisplay = document.getElementById('accuracyRate');
        this.waveformCanvas = document.getElementById('waveformCanvas');

        // Logs
        this.activityLog = document.getElementById('activityLog');
        this.clearLogsBtn = document.getElementById('clearLogsBtn');
    }

    attachEventListeners() {
        // Master Toggle
        this.masterToggle.addEventListener('change', (e) => {
            this.toggleReactor(e.target.checked);
        });

        // Mode Selection
        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.modeBtns.forEach(b => b.classList.remove('active'));
                e.target.closest('.mode-btn').classList.add('active');
                this.config.recognitionMode = e.target.closest('.mode-btn').dataset.mode;
                this.saveConfig();
                this.logEntry('Mode switched to: ' + this.config.recognitionMode, 'info');
            });
        });

        // API Key Input
        this.geminiApiKeyInput.addEventListener('change', () => {
            this.config.geminiApiKey = this.geminiApiKeyInput.value;
            this.saveConfig();
        });

        // Custom Response
        this.customResponseInput.addEventListener('change', () => {
            this.config.customResponse = this.customResponseInput.value;
            this.saveConfig();
        });

        // Emoji Toggle
        this.emojiToggle.addEventListener('change', (e) => {
            this.config.sendEmoji = e.target.checked;
            this.emojiSelect.disabled = !e.target.checked;
            this.saveConfig();
        });

        // Emoji Select
        this.emojiSelect.addEventListener('change', () => {
            this.config.selectedEmoji = this.emojiSelect.value;
            this.saveConfig();
        });

        // Sensitivity Slider
        this.sensitivitySlider.addEventListener('change', () => {
            this.config.sensitivity = parseFloat(this.sensitivitySlider.value);
            this.saveConfig();
        });

        // Add Trigger Phrase
        this.addTriggerBtn.addEventListener('click', () => {
            this.addTriggerPhrase();
        });

        this.newTriggerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTriggerPhrase();
            }
        });

        // Clear Logs
        this.clearLogsBtn.addEventListener('click', () => {
            this.activityLog.innerHTML = '';
            this.logEntry('Logs cleared', 'info');
        });
    }

    toggleReactor(isActive) {
        this.config.isActive = isActive;
        this.saveConfig();

        if (isActive) {
            this.start();
        } else {
            this.stop();
        }
    }

    async start() {
        try {
            this.logEntry('Auto-Reactor starting...', 'info');
            this.state.sessionStartTime = Date.now();
            this.state.isListening = true;

            // Update UI
            this.updateStatusUI(true);
            this.pulseIndicator.classList.add('active');

            // Initialize Audio Context
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupAudioAnalyzer(stream);

            // Setup Web Speech API
            if (this.config.recognitionMode === 'web-speech') {
                this.setupWebSpeechRecognition();
            }

            this.logEntry('Listening for trigger phrases...', 'success');
        } catch (error) {
            this.logEntry('Error starting reactor: ' + error.message, 'error');
            this.stop();
        }
    }

    stop() {
        this.state.isListening = false;

        // Stop Web Speech Recognition
        if (this.recognition) {
            this.recognition.stop();
            this.recognitionActive = false;
        }

        // Stop audio stream
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
        }

        // Update UI
        this.updateStatusUI(false);
        this.pulseIndicator.classList.remove('active');

        this.logEntry('Auto-Reactor stopped', 'info');
    }

    setupAudioAnalyzer(stream) {
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(this.analyser);
        this.analyser.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);

        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Visualize audio
        this.animateWaveform();

        // Process audio data
        this.scriptProcessor.onaudioprocess = () => {
            if (this.config.isActive && this.config.recognitionMode === 'gemini') {
                // Process audio chunks for Gemini API
                this.processAudioForGemini();
            }
        };
    }

    setupWebSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.recognitionActive = true;
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    this.state.currentTranscript = transcript;
                    this.checkForTrigger(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }
        };

        this.recognition.onerror = (event) => {
            this.logEntry('Recognition error: ' + event.error, 'error');
        };

        this.recognition.onend = () => {
            this.recognitionActive = false;
            // Restart if still active
            if (this.config.isActive) {
                this.recognition.start();
            }
        };

        // Start recognition
        this.recognition.start();
    }

    checkForTrigger(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();

        for (const phrase of this.config.triggerPhrases) {
            const lowerPhrase = phrase.toLowerCase();

            // Calculate similarity score
            const similarity = this.calculateSimilarity(lowerTranscript, lowerPhrase);

            if (similarity >= this.config.sensitivity) {
                this.state.detectionCount++;
                this.state.lastDetectedPhrase = transcript;
                this.onTriggerDetected(transcript, phrase);
                return;
            }
        }

        this.state.attemptCount++;
    }

    calculateSimilarity(str1, str2) {
        // Check for exact match
        if (str1.includes(str2) || str2.includes(str1)) {
            return 1.0;
        }

        // Levenshtein distance-based similarity
        const maxLen = Math.max(str1.length, str2.length);
        const distance = this.levenshteinDistance(str1, str2);
        const similarity = 1 - (distance / maxLen);

        return similarity;
    }

    levenshteinDistance(s1, s2) {
        const len1 = s1.length;
        const len2 = s2.length;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[len1][len2];
    }

    async onTriggerDetected(detectedText, matchedPhrase) {
        this.logEntry(`Trigger detected: "${detectedText}"`, 'detection');

        // Verify with Gemini if API key is provided and mode is enabled
        if (this.config.recognitionMode === 'gemini' && this.config.geminiApiKey) {
            const isValid = await this.verifyWithGemini(detectedText);
            if (!isValid) {
                this.logEntry('Gemini verification failed, skipping response', 'warning');
                return;
            }
        }

        // Send response
        this.sendAutoResponse();
        this.state.responseCount++;
        this.state.accuracyCount++;
        this.updateStats();
    }

    async verifyWithGemini(transcript) {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + this.config.geminiApiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this transcript and determine if the speaker is directly addressing someone (asking if they're still there, saying hello, etc.). Respond with only "YES" or "NO".\n\nTranscript: "${transcript}"`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.toUpperCase() || 'NO';

            return result.includes('YES');
        } catch (error) {
            this.logEntry('Gemini API error: ' + error.message, 'error');
            return false;
        }
    }

    sendAutoResponse() {
        // Simulate sending response to Google Meet chat
        this.logEntry(`Response sent: "${this.config.customResponse}"`, 'response');

        // Try to interact with Google Meet chat (requires content script in browser extension)
        this.simulateChatInput();

        // Send emoji if enabled
        if (this.config.sendEmoji) {
            this.sendEmojiReaction();
        }
    }

    simulateChatInput() {
        // This would be handled by a browser extension content script
        // For now, just log the action
        console.log('Simulating chat input with message:', this.config.customResponse);

        // Broadcast message for extension listener
        if (window.postMessage) {
            window.postMessage({
                type: 'AUTO_REACTOR_RESPONSE',
                message: this.config.customResponse,
                timestamp: new Date().toISOString()
            }, '*');
        }
    }

    sendEmojiReaction() {
        this.logEntry(`Emoji sent: ${this.config.selectedEmoji}`, 'response');

        // Broadcast emoji for extension listener
        if (window.postMessage) {
            window.postMessage({
                type: 'AUTO_REACTOR_EMOJI',
                emoji: this.config.selectedEmoji,
                timestamp: new Date().toISOString()
            }, '*');
        }
    }

    processAudioForGemini() {
        // Placeholder for Gemini audio processing
        // This would send audio chunks to Gemini API for processing
    }

    animateWaveform() {
        if (!this.config.isActive) return;

        const ctx = this.waveformCanvas.getContext('2d');
        const width = this.waveformCanvas.width;
        const height = this.waveformCanvas.height;

        this.analyser.getByteFrequencyData(this.dataArray);

        // Clear canvas
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Draw waveform
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / this.dataArray.length;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        requestAnimationFrame(() => this.animateWaveform());
    }

    addTriggerPhrase() {
        const phrase = this.newTriggerInput.value.trim();

        if (!phrase) {
            this.showAlert('Please enter a trigger phrase');
            return;
        }

        if (this.config.triggerPhrases.includes(phrase)) {
            this.showAlert('This phrase already exists');
            return;
        }

        this.config.triggerPhrases.push(phrase);
        this.renderTriggerList();
        this.newTriggerInput.value = '';
        this.saveConfig();
        this.logEntry('Trigger phrase added: ' + phrase, 'success');
    }

    removeTriggerPhrase(phrase) {
        this.config.triggerPhrases = this.config.triggerPhrases.filter(p => p !== phrase);
        this.renderTriggerList();
        this.saveConfig();
        this.logEntry('Trigger phrase removed: ' + phrase, 'info');
    }

    renderTriggerList() {
        this.triggerList.innerHTML = '';

        const defaultPhrases = ['Are you still there?', 'Andiyan pa ba kayo?', 'Are you there?', 'Hello', 'Hi there'];

        this.config.triggerPhrases.forEach(phrase => {
            const item = document.createElement('div');
            item.className = 'trigger-item';

            const isDefault = defaultPhrases.includes(phrase);
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control input-styled trigger-input';
            input.value = phrase;
            if (isDefault) input.setAttribute('readonly', 'readonly');

            item.appendChild(input);

            if (!isDefault) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-danger btn-remove btn-sm';
                btn.innerHTML = '<i class="fas fa-times"></i>';
                btn.addEventListener('click', () => this.removeTriggerPhrase(phrase));
                item.appendChild(btn);
            }

            this.triggerList.appendChild(item);
        });
    }

    updateStatusUI(isActive) {
        this.statusText.textContent = isActive ? 'Active' : 'Inactive';
        this.statusText.classList.toggle('active', isActive);
        this.masterToggle.checked = isActive;
    }

    updateStats() {
        this.detectionCountDisplay.textContent = this.state.detectionCount;
        this.responseCountDisplay.textContent = this.state.responseCount;

        if (this.state.attemptCount > 0) {
            const accuracy = (this.state.accuracyCount / this.state.attemptCount * 100).toFixed(1);
            this.accuracyRateDisplay.textContent = accuracy + '%';
        }
    }

    logEntry(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

        let badgeText = type.charAt(0).toUpperCase() + type.slice(1);
        if (type === 'detection') badgeText = 'Detected';
        if (type === 'response') badgeText = 'Sent';
        if (type === 'warning') badgeText = 'Warning';

        entry.innerHTML = `
            <div class="log-timestamp">${timestamp}</div>
            <div class="log-message">${message}</div>
            <div class="log-badge">${badgeText}</div>
        `;

        this.activityLog.insertBefore(entry, this.activityLog.firstChild);

        // Keep only last 50 entries
        while (this.activityLog.children.length > 50) {
            this.activityLog.removeChild(this.activityLog.lastChild);
        }
    }

    setupSessionTimer() {
        setInterval(() => {
            if (this.state.sessionStartTime) {
                const elapsed = Math.floor((Date.now() - this.state.sessionStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                this.sessionDurationDisplay.textContent = 
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }, 1000);
    }

    saveConfig() {
        localStorage.setItem('autoReactorConfig', JSON.stringify(this.config));
    }

    loadSavedConfig() {
        const saved = localStorage.getItem('autoReactorConfig');
        if (saved) {
            const loaded = JSON.parse(saved);
            this.config = { ...this.config, ...loaded };

            // Update UI
            this.geminiApiKeyInput.value = this.config.geminiApiKey;
            this.customResponseInput.value = this.config.customResponse;
            this.emojiToggle.checked = this.config.sendEmoji;
            this.emojiSelect.disabled = !this.config.sendEmoji;
            this.emojiSelect.value = this.config.selectedEmoji;
            this.sensitivitySlider.value = this.config.sensitivity;

            // Set active mode button
            this.modeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === this.config.recognitionMode);
            });

            this.renderTriggerList();
        }
    }

    showAlert(message) {
        const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
        document.getElementById('alertModalBody').textContent = message;
        alertModal.show();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.autoReactor = new AutoReactor();
    console.log('Auto-Reactor initialized successfully');
});