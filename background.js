<<<<<<< HEAD
/**
 * Background Service Worker for Auto-Reactor Extension
 * Handles cross-tab communication and state management
 */

console.log('[Auto-Reactor] Background service worker loaded');

// Store active sessions
const activeSessions = new Map();

// Listen for messages from content scripts and popups
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Auto-Reactor] Message received:', request.type);
    
    switch (request.type) {
        // NEW FIX: Bridge for Chat and Emojis
        case 'AUTO_REACTOR_RESPONSE':
        case 'AUTO_REACTOR_EMOJI':
            chrome.tabs.query({url: "https://meet.google.com/*"}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, request);
                });
            });
            sendResponse({ success: true, status: 'relayed' });
            break;

        case 'START_SESSION':
            handleStartSession(sender.tab ? sender.tab.id : null, request.config);
            sendResponse({ success: true });
            break;
            
        case 'STOP_SESSION':
            handleStopSession(sender.tab.id);
            sendResponse({ success: true });
            break;
            
        case 'LOG_EVENT':
            handleLogEvent(sender.tab.id, request.event);
            sendResponse({ success: true });
            break;
            
        case 'GET_SESSION_STATUS':
            sendResponse({ session: activeSessions.get(sender.tab.id) });
            break;
            
        case 'GET_ALL_SESSIONS':
            const sessions = Array.from(activeSessions.entries()).map(([tabId, data]) => ({
                tabId,
                ...data
            }));
            sendResponse({ sessions });
            break;
            
        default:
            sendResponse({ error: 'Unknown message type' });
    }
    
    return true; // Keep channel open for async response
});

/**
 * Handle session start
 * @param {number} tabId - The tab ID
 * @param {object} config - The configuration
 */
function handleStartSession(tabId, config) {
    activeSessions.set(tabId, {
        startTime: Date.now(),
        config: config,
        status: 'active',
        stats: {
            detections: 0,
            responses: 0,
            errors: 0
        },
        events: []
    });
    
    console.log('[Auto-Reactor] Session started for tab', tabId);
    
    // Update extension icon to show active state
    updateExtensionIcon(true);
}

/**
 * Handle session stop
 * @param {number} tabId - The tab ID
 */
function handleStopSession(tabId) {
    if (activeSessions.has(tabId)) {
        const session = activeSessions.get(tabId);
        session.status = 'stopped';
        session.endTime = Date.now();
        
        console.log('[Auto-Reactor] Session stopped for tab', tabId);
    }
    
    // Check if any other sessions are active
    let hasActiveSessions = false;
    for (let [, session] of activeSessions) {
        if (session.status === 'active') {
            hasActiveSessions = true;
            break;
        }
    }
    
    if (!hasActiveSessions) {
        updateExtensionIcon(false);
    }
}

/**
 * Handle event logging
 * @param {number} tabId - The tab ID
 * @param {object} event - The event to log
 */
function handleLogEvent(tabId, event) {
    if (activeSessions.has(tabId)) {
        const session = activeSessions.get(tabId);
        session.events.push({
            timestamp: Date.now(),
            ...event
        });
        
        // Update stats
        if (event.type === 'detection') {
            session.stats.detections++;
        } else if (event.type === 'response') {
            session.stats.responses++;
        } else if (event.type === 'error') {
            session.stats.errors++;
        }
        
        // Keep only last 100 events
        if (session.events.length > 100) {
            session.events.shift();
        }
    }
}

/**
 * Update extension icon based on active state
 * @param {boolean} isActive - Whether any sessions are active
 */
function updateExtensionIcon(isActive) {
    if (isActive) {
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
    } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red
    }
}

/**
 * Clean up when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
    activeSessions.delete(tabId);
    console.log('[Auto-Reactor] Cleaned up session for closed tab', tabId);
});

/**
 * Monitor tab updates for relevant sites
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Check if it's a relevant site
        if (tab.url && (tab.url.includes('meet.google.com') || tab.url.includes('classroom.google.com'))) {
            console.log('[Auto-Reactor] Relevant page loaded:', tab.url);
            
            // Optionally notify the popup that a relevant page is loaded
            chrome.runtime.sendMessage({
                type: 'PAGE_LOADED',
                url: tab.url,
                tabId: tabId
            }).catch(() => {
                // Popup might not be open, that's okay
            });
        }
    }
});

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Auto-Reactor] Extension installed');
        // Could open onboarding page
        // chrome.tabs.create({ url: 'onboarding.html' });
    } else if (details.reason === 'update') {
        console.log('[Auto-Reactor] Extension updated');
    }
});

=======
/**
 * Background Service Worker for Auto-Reactor Extension
 * Handles cross-tab communication and state management
 */

console.log('[Auto-Reactor] Background service worker loaded');

// Store active sessions
const activeSessions = new Map();

// Listen for messages from content scripts and popups
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Auto-Reactor] Message received:', request.type);
    
    switch (request.type) {
        case 'START_SESSION':
            handleStartSession(sender.tab.id, request.config);
            sendResponse({ success: true });
            break;
            
        case 'STOP_SESSION':
            handleStopSession(sender.tab.id);
            sendResponse({ success: true });
            break;
            
        case 'LOG_EVENT':
            handleLogEvent(sender.tab.id, request.event);
            sendResponse({ success: true });
            break;
            
        case 'GET_SESSION_STATUS':
            sendResponse({ session: activeSessions.get(sender.tab.id) });
            break;
            
        case 'GET_ALL_SESSIONS':
            const sessions = Array.from(activeSessions.entries()).map(([tabId, data]) => ({
                tabId,
                ...data
            }));
            sendResponse({ sessions });
            break;
            
        default:
            sendResponse({ error: 'Unknown message type' });
    }
    
    return true; // Keep channel open for async response
});

/**
 * Handle session start
 * @param {number} tabId - The tab ID
 * @param {object} config - The configuration
 */
function handleStartSession(tabId, config) {
    activeSessions.set(tabId, {
        startTime: Date.now(),
        config: config,
        status: 'active',
        stats: {
            detections: 0,
            responses: 0,
            errors: 0
        },
        events: []
    });
    
    console.log('[Auto-Reactor] Session started for tab', tabId);
    
    // Update extension icon to show active state
    updateExtensionIcon(true);
}

/**
 * Handle session stop
 * @param {number} tabId - The tab ID
 */
function handleStopSession(tabId) {
    if (activeSessions.has(tabId)) {
        const session = activeSessions.get(tabId);
        session.status = 'stopped';
        session.endTime = Date.now();
        
        console.log('[Auto-Reactor] Session stopped for tab', tabId);
    }
    
    // Check if any other sessions are active
    let hasActiveSessions = false;
    for (let [, session] of activeSessions) {
        if (session.status === 'active') {
            hasActiveSessions = true;
            break;
        }
    }
    
    if (!hasActiveSessions) {
        updateExtensionIcon(false);
    }
}

/**
 * Handle event logging
 * @param {number} tabId - The tab ID
 * @param {object} event - The event to log
 */
function handleLogEvent(tabId, event) {
    if (activeSessions.has(tabId)) {
        const session = activeSessions.get(tabId);
        session.events.push({
            timestamp: Date.now(),
            ...event
        });
        
        // Update stats
        if (event.type === 'detection') {
            session.stats.detections++;
        } else if (event.type === 'response') {
            session.stats.responses++;
        } else if (event.type === 'error') {
            session.stats.errors++;
        }
        
        // Keep only last 100 events
        if (session.events.length > 100) {
            session.events.shift();
        }
    }
}

/**
 * Update extension icon based on active state
 * @param {boolean} isActive - Whether any sessions are active
 */
function updateExtensionIcon(isActive) {
    if (isActive) {
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
    } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red
    }
}

/**
 * Clean up when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
    activeSessions.delete(tabId);
    console.log('[Auto-Reactor] Cleaned up session for closed tab', tabId);
});

/**
 * Monitor tab updates for relevant sites
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Check if it's a relevant site
        if (tab.url && (tab.url.includes('meet.google.com') || tab.url.includes('classroom.google.com'))) {
            console.log('[Auto-Reactor] Relevant page loaded:', tab.url);
            
            // Optionally notify the popup that a relevant page is loaded
            chrome.runtime.sendMessage({
                type: 'PAGE_LOADED',
                url: tab.url,
                tabId: tabId
            }).catch(() => {
                // Popup might not be open, that's okay
            });
        }
    }
});

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Auto-Reactor] Extension installed');
        // Could open onboarding page
        // chrome.tabs.create({ url: 'onboarding.html' });
    } else if (details.reason === 'update') {
        console.log('[Auto-Reactor] Extension updated');
    }
});

>>>>>>> 569b6c7c70071d5deb951b065df027a37262de72
console.log('[Auto-Reactor] Background service worker initialized');