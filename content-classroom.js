/**
 * Content Script for Google Classroom
 * Handles automated response sending in Classroom assignments and discussions
 */

console.log('[Auto-Reactor] Content script loaded for Google Classroom');

let messageListenerActive = false;

if (!messageListenerActive) {
    messageListenerActive = true;
    
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'AUTO_REACTOR_RESPONSE') {
            console.log('[Auto-Reactor] Sending Classroom response:', event.data.message);
            sendClassroomResponse(event.data.message);
        }
    });
}

/**
 * Send a response in Google Classroom
 * @param {string} message - The message to send
 */
function sendClassroomResponse(message) {
    try {
        // Strategy 1: Find comment/response text area
        let responseInput = document.querySelector('[aria-label*="reply"]') ||
                           document.querySelector('[aria-label*="comment"]') ||
                           document.querySelector('[aria-label*="respond"]');
        
        // Strategy 2: Look for contenteditable text areas in the classroom context
        if (!responseInput) {
            const contentEditables = document.querySelectorAll('[contenteditable="true"]');
            for (let elem of contentEditables) {
                const rect = elem.getBoundingClientRect();
                // Check if it's visible and in the main content area
                if (rect.height > 0 && rect.width > 0) {
                    responseInput = elem;
                    break;
                }
            }
        }
        
        // Strategy 3: Look in assignment/discussion areas
        if (!responseInput) {
            const assignment = document.querySelector('[data-assignment-id]');
            if (assignment) {
                responseInput = assignment.querySelector('[contenteditable="true"]');
            }
        }
        
        if (responseInput) {
            // Set the content
            responseInput.textContent = message;
            responseInput.innerText = message;
            
            // Trigger input events
            const inputEvent = new Event('input', { bubbles: true });
            responseInput.dispatchEvent(inputEvent);
            
            const changeEvent = new Event('change', { bubbles: true });
            responseInput.dispatchEvent(changeEvent);
            
            // Focus the input
            responseInput.focus();
            
            // Find and click submit button
            setTimeout(() => {
                submitClassroomResponse(responseInput);
            }, 100);
            
            console.log('[Auto-Reactor] Classroom response submitted');
            return true;
        } else {
            console.warn('[Auto-Reactor] Classroom response field not found');
            return false;
        }
    } catch (error) {
        console.error('[Auto-Reactor] Error sending Classroom response:', error);
        return false;
    }
}

/**
 * Submit the Classroom response
 * @param {Element} responseInput - The input element
 */
function submitClassroomResponse(responseInput) {
    try {
        // Strategy 1: Find submit/post button nearby
        let submitBtn = null;
        const container = responseInput.closest('[role="region"]') || responseInput.parentElement;
        
        if (container) {
            submitBtn = container.querySelector('button[aria-label*="Post"]') ||
                       container.querySelector('button[aria-label*="Submit"]') ||
                       container.querySelector('button[aria-label*="Send"]') ||
                       container.querySelector('button[type="submit"]');
        }
        
        // Strategy 2: Look for button with text content
        if (!submitBtn) {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('post') || text.includes('submit') || text.includes('send')) {
                    // Check if button is near the input
                    const distance = Math.hypot(
                        btn.getBoundingClientRect().x - responseInput.getBoundingClientRect().x,
                        btn.getBoundingClientRect().y - responseInput.getBoundingClientRect().y
                    );
                    if (distance < 500) { // Within 500px
                        submitBtn = btn;
                        break;
                    }
                }
            }
        }
        
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            console.log('[Auto-Reactor] Classroom response posted');
            return true;
        } else {
            // Try keyboard shortcut
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                ctrlKey: true,
                bubbles: true
            });
            responseInput.dispatchEvent(event);
            console.log('[Auto-Reactor] Submitted via Ctrl+Enter');
            return true;
        }
    } catch (error) {
        console.error('[Auto-Reactor] Error submitting Classroom response:', error);
        return false;
    }
}

/**
 * Monitor Classroom page for relevant elements
 */
function monitorClassroomUI() {
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Log when assignment or discussion elements appear
                const assignments = document.querySelectorAll('[data-assignment-id]');
                const discussions = document.querySelectorAll('[role*="dialog"]');
                
                if (assignments.length > 0 || discussions.length > 0) {
                    console.log('[Auto-Reactor] Classroom content detected');
                }
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize monitoring
monitorClassroomUI();

console.log('[Auto-Reactor] Content script ready for Google Classroom');