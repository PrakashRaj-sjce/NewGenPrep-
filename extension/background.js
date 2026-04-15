// Background service worker for AI Interview Bot
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Interview Bot Extension installed.');
});

// Listen for messages from the web app (The Bridge)
// The web app can send the token via chrome.runtime.sendMessage if it's within the extension's host permissions
// Or we can use an 'externally_connectable' manifest entry to allow the web app to talk to us.

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.type === 'SET_AUTH_TOKEN') {
        chrome.storage.local.set({ token: request.token }, () => {
            console.log('Token stored from external source:', sender.url);
            sendResponse({ success: true });
        });
        return true; // Keep channel open for async response
    }
});

// Also listen for internal messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_TOKEN') {
        chrome.storage.local.get(['token'], (result) => {
            sendResponse({ token: result.token });
        });
        return true;
    }
});
