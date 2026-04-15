// Content script to relay auth messages from web app to extension
console.log('AI Interview Bot: Content script loaded.');

window.addEventListener('message', (event) => {
    // Only trust messages from our application
    // Replace with your production domain later
    const trustedOrigins = ['http://localhost:3000', 'https://aiinterviewbot.com'];

    // For local dev, we might be loose, but in prod we should check
    // if (!trustedOrigins.includes(event.origin)) return;

    if (event.data && event.data.type === 'AUTH_SUCCESS') {
        console.log('AI Interview Bot: Received Auth Token from web app!');
        chrome.storage.local.set({
            token: event.data.token,
            user: event.data.user
        });
    }

    if (event.data && event.data.type === 'SET_SESSION_ID') {
        console.log('AI Interview Bot: Received Session ID from web app!');
        chrome.storage.local.set({ currentSessionId: event.data.sessionId });
    }
});
