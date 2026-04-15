document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('user-video');
    const micToggle = document.getElementById('mic-toggle');
    const videoToggle = document.getElementById('video-toggle');
    const endBtn = document.getElementById('end-btn');
    const chatBox = document.getElementById('chat-box');
    const inputField = document.getElementById('input-field');
    const sendBtn = document.getElementById('send-btn');
    const sessionIdEl = document.getElementById('session-id');

    let stream;
    let isMicOn = true;
    let isVideoOn = true;
    let sessionId = null;
    let authToken = null;
    let isLoading = false;
    let currentQuestion = 1;
    let currentStage = 1;

    // Load session and token
    const result = await chrome.storage.local.get(['token', 'currentSessionId']);
    authToken = result.token;
    sessionId = result.currentSessionId;

    if (!authToken) {
        alert('Authentication required. Please login from the extension popup.');
        window.close();
        return;
    }

    // API Helper
    async function apiFetch(endpoint, method = 'GET', body = null) {
        const url = `${window.APP_CONFIG.API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    // Initialize Camera
    async function initCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            video.srcObject = stream;
        } catch (err) {
            console.error('Error accessing media devices:', err);
            addChatMessage('System', 'Error accessing camera/microphone. Please ensure you have granted permissions.', true);
        }
    }

    function addChatMessage(sender, text, isError = false) {
        const msg = document.createElement('div');
        msg.className = 'message-bubble';
        msg.style.marginBottom = '12px';
        msg.style.color = isError ? '#ef4444' : (sender === 'You' ? '#fff' : '#06b6d4');
        msg.innerHTML = `<b>${sender}:</b> ${text}`;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function startInterviewFlow() {
        if (!sessionId) {
            addChatMessage('System', 'No active session found. Please upload a resume in the dashboard first.', true);
            return;
        }

        sessionIdEl.textContent = sessionId;
        setIsLoading(true);

        try {
            const response = await apiFetch('/api/interview/start', 'POST', { session_id: sessionId });
            currentQuestion = response.question_number;
            currentStage = response.stage;

            addChatMessage('AI Assistant', "Welcome! Let's begin your interview.");
            addChatMessage('AI Assistant', response.question);
        } catch (err) {
            console.error('Failed to start interview:', err);
            addChatMessage('System', 'Failed to connect to the interview server. Please check your backend.', true);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSend() {
        const text = inputField.value.trim();
        if (!text || isLoading) return;

        addChatMessage('You', text);
        inputField.value = '';
        setIsLoading(true);

        try {
            const response = await apiFetch('/api/interview/respond', 'POST', {
                session_id: sessionId,
                response: text
            });

            if (response.is_complete) {
                addChatMessage('AI Assistant', "Interview Complete! You can now view your report in the dashboard.");
                sendBtn.disabled = true;
                inputField.disabled = true;
            } else {
                currentQuestion = response.question_number;
                currentStage = response.stage;

                if (response.feedback) {
                    addChatMessage('AI Assistant (Feedback)', response.feedback);
                }
                addChatMessage('AI Assistant', response.question);
            }
        } catch (err) {
            console.error('Failed to send response:', err);
            addChatMessage('System', 'Error sending your response. Please try again.', true);
        } finally {
            setIsLoading(false);
        }
    }

    function setIsLoading(loading) {
        isLoading = loading;
        sendBtn.disabled = loading;
        inputField.placeholder = loading ? 'Processing...' : 'Type your response...';
    }

    // Proctoring
    function reportWarning(type, message) {
        if (!sessionId) return;
        apiFetch(`/api/interview/${sessionId}/warning`, 'POST', { type, details: message })
            .catch(err => console.error('Failed to report warning:', err));
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            reportWarning('tab_switch', 'User switched tabs or minimized window');
            alert('⚠️ Warning: Anti-cheat active. Please stay on this window.');
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            reportWarning('fullscreen_exit', 'User exited full screen mode');
        }
    });

    document.addEventListener('contextmenu', e => e.preventDefault());

    // Event Listeners
    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    micToggle.addEventListener('click', () => {
        isMicOn = !isMicOn;
        if (stream) stream.getAudioTracks()[0].enabled = isMicOn;
        micToggle.textContent = isMicOn ? '🎙️' : '🔇';
    });

    videoToggle.addEventListener('click', () => {
        isVideoOn = !isVideoOn;
        if (stream) stream.getVideoTracks()[0].enabled = isVideoOn;
        videoToggle.textContent = isVideoOn ? '📹' : '📵';
    });

    endBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to end this interview?')) {
            window.close();
        }
    });

    await initCamera();
    await startInterviewFlow();
});
