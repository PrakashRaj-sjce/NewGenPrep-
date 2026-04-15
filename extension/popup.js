document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    const unauthorizedEl = document.getElementById('unauthorized');
    const authorizedEl = document.getElementById('authorized');
    const loginBtn = document.getElementById('login-btn');
    const startBtn = document.getElementById('start-btn');

    // Check for token in storage
    const checkAuth = async () => {
        const result = await chrome.storage.local.get(['token', 'currentSessionId']);
        loadingEl.classList.add('hidden');

        if (result.token) {
            unauthorizedEl.classList.add('hidden');
            authorizedEl.classList.remove('hidden');

            if (!result.currentSessionId) {
                startBtn.textContent = 'Upload Resume in Dashboard First';
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
            } else {
                startBtn.textContent = 'Start Interview Practice';
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
            }
        } else {
            authorizedEl.classList.add('hidden');
            unauthorizedEl.classList.remove('hidden');
        }
    };

    loginBtn.addEventListener('click', () => {
        // Replace with your actual hosted URL later
        chrome.tabs.create({ url: 'http://localhost:3000/login?source=extension' });
    });

    startBtn.addEventListener('click', () => {
        chrome.windows.create({
            url: chrome.runtime.getURL('interview.html'),
            type: 'popup',
            width: 1000,
            height: 700
        });
    });

    await checkAuth();

    // Listen for storage changes (token updates)
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && (changes.token || changes.currentSessionId)) {
            checkAuth();
        }
    });
});
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Microphone access granted");
  } catch (err) {
    console.error("Microphone access denied", err);
  }
}
