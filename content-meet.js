/**
 * Content Script for Google Meet
 * Handles automated chat message sending and emoji reactions
 */

console.log('[Auto-Reactor] Content script loaded for Google Meet');

// Track if we've already injected message listeners
let messageListenerActive = false;

// Setup message listener from the popup
if (!messageListenerActive) {
    messageListenerActive = true;
    
    window.addEventListener('message', (event) => {
        // Only accept messages from the same window (security)
        if (event.source !== window) return;
        
        if (event.data.type === 'AUTO_REACTOR_RESPONSE') {
            console.log('[Auto-Reactor] Sending message:', event.data.message);
            sendMessageToChat(event.data.message);
        } else if (event.data.type === 'AUTO_REACTOR_EMOJI') {
            console.log('[Auto-Reactor] Sending emoji:', event.data.emoji);
            sendEmojiReaction(event.data.emoji);
        }
    });
}

/**
 * Send a message to Google Meet chat
 * @param {string} message - The message to send
 */
function sendMessageToChat(message) {
    try {
        // Strategy 1: Find the chat input field using data attributes
        let chatInput = document.querySelector('[data-placeholder="Send a message"]');
        
        // Strategy 2: Find by role and placeholder
        if (!chatInput) {
            const inputs = document.querySelectorAll('[contenteditable="true"]');
            for (let input of inputs) {
                if (input.getAttribute('aria-placeholder')?.includes('message')) {
                    chatInput = input;
                    break;
                }
            }
        }
        
        // Strategy 3: Look in the chat area
        if (!chatInput) {
            const chatArea = document.querySelector('[aria-label="Chat"]');
            if (chatArea) {
                chatInput = chatArea.querySelector('[contenteditable="true"]');
            }
        }
        
        if (chatInput) {
            // Clear any existing content
            chatInput.textContent = message;
            chatInput.innerText = message;
            
            // Trigger input event to notify React about the change
            const inputEvent = new Event('input', { bubbles: true });
            chatInput.dispatchEvent(inputEvent);
            
            // Also trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            chatInput.dispatchEvent(changeEvent);
            
            // Focus the input
            chatInput.focus();
            
            // Find and click the send button
            setTimeout(() => {
                clickSendButton(chatInput);
            }, 100);
            
            console.log('[Auto-Reactor] Message sent successfully');
            return true;
        } else {
            console.warn('[Auto-Reactor] Chat input field not found');
            return false;
        }
    } catch (error) {
        console.error('[Auto-Reactor] Error sending message:', error);
        return false;
    }
}

/**
 * Find and click the send button
 * @param {Element} chatInput - The chat input element
 */
function clickSendButton(chatInput) {
    try {
        // Strategy 1: Find by aria-label
        let sendBtn = document.querySelector('[aria-label="Send a message"]');
        
        // Strategy 2: Find by tooltip
        if (!sendBtn) {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.getAttribute('aria-label')?.includes('Send') ||
                    btn.getAttribute('data-tooltip')?.includes('Send')) {
                    sendBtn = btn;
                    break;
                }
            }
        }
        
        // Strategy 3: Look for button next to chat input
        if (!sendBtn) {
            const parent = chatInput.closest('[role="region"]') || chatInput.parentElement;
            if (parent) {
                sendBtn = parent.querySelector('button[aria-label*="Send"]') ||
                         parent.querySelector('button[type="submit"]');
            }
        }
        
        if (sendBtn) {
            sendBtn.click();
            console.log('[Auto-Reactor] Send button clicked');
            return true;
        } else {
            // Fallback: Try keyboard shortcut
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
            });
            chatInput.dispatchEvent(event);
            console.log('[Auto-Reactor] Sent via Enter key');
            return true;
        }
    } catch (error) {
        console.error('[Auto-Reactor] Error clicking send button:', error);
        return false;
    }
}

/**
 * Send an emoji reaction
 * @param {string} emoji - The emoji to send
 */
function sendEmojiReaction(emoji) {
    try {
        // Find the reactions button
        // In Google Meet, this is usually under the participant video area
        
        // Strategy 1: Look for reactions button by aria-label
        let reactionsBtn = document.querySelector('[aria-label*="Reactions"]') ||
                          document.querySelector('[aria-label*="reaction"]');
        
        // Strategy 2: Look in the bottom toolbar
        if (!reactionsBtn) {
            const toolbar = document.querySelector('[role="toolbar"]');
            if (toolbar) {
                const buttons = toolbar.querySelectorAll('button');
                for (let btn of buttons) {
                    const label = btn.getAttribute('aria-label') || '';
                    if (label.toLowerCase().includes('reaction') ||
                        label.toLowerCase().includes('emoji')) {
                        reactionsBtn = btn;
                        break;
                    }
                }
            }
        }
        
        if (reactionsBtn) {
            reactionsBtn.click();
            
            // Wait for emoji picker to appear
            setTimeout(() => {
                selectEmojiFromPicker(emoji);
            }, 300);
            
            console.log('[Auto-Reactor] Reactions menu opened');
            return true;
        } else {
            console.warn('[Auto-Reactor] Reactions button not found');
            // Fallback: Try keyboard shortcut if available
            return false;
        }
    } catch (error) {
        console.error('[Auto-Reactor] Error sending emoji reaction:', error);
        return false;
    }
}

/**
 * Select emoji from the picker
 * @param {string} emoji - The emoji character
 */
function selectEmojiFromPicker(emoji) {
    try {
        // Find the emoji picker/menu
        const emojiPicker = document.querySelector('[role="menu"]') ||
                           document.querySelector('[role="dialog"]');
        
        if (emojiPicker) {
            // Look for buttons or elements with the emoji
            const emojiButtons = emojiPicker.querySelectorAll('button, [role="button"]');
            
            for (let btn of emojiButtons) {
                if (btn.textContent.includes(emoji) || btn.innerText.includes(emoji)) {
                    btn.click();
                    console.log('[Auto-Reactor] Emoji reaction sent:', emoji);
                    return true;
                }
            }
            
            // If exact match not found, just click the first emoji button
            if (emojiButtons.length > 0) {
                emojiButtons[0].click();
                console.log('[Auto-Reactor] Sent default emoji reaction');
                return true;
            }
        }
        
        // Fallback: Close the picker if still open
        document.body.click();
        return false;
    } catch (error) {
        console.error('[Auto-Reactor] Error selecting emoji:', error);
        document.body.click(); // Close any open menus
        return false;
    }
}

/**
 * Detect if the chat UI has changed and help with debugging
 */
function monitorChatUI() {
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Log when major chat elements appear/change
                const chatElements = document.querySelectorAll('[aria-label*="Chat"], [data-placeholder*="message"]');
                if (chatElements.length > 0) {
                    console.log('[Auto-Reactor] Chat UI detected:', chatElements.length, 'elements');
                }
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Uncomment to enable UI monitoring for debugging
// monitorChatUI();

console.log('[Auto-Reactor] Content script ready for Google Meet');