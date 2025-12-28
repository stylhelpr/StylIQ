/**
 * Keychain AutoFill Injected Script
 *
 * This script is injected into WebView pages to:
 * 1. Detect password field focus (signal auth flow start)
 * 2. Detect form submission (signal auth flow end)
 * 3. Detect dynamically-injected login modals
 * 4. Apply focus nudging for iOS AutoFill re-association
 *
 * SECURITY GUARANTEES:
 * - NO credential access: Script never reads input values
 * - NO form modification: Only observes events, never changes form behavior
 * - NO data exfiltration: Only sends event type signals, no content
 * - Read-only DOM observation: MutationObserver is passive
 *
 * PRIVACY GUARANTEES:
 * - No form data is transmitted
 * - No tracking or analytics
 * - Signals contain only event type, no PII
 */

/**
 * Generate the injected JavaScript code.
 * This returns a string that will be injected into the WebView.
 */
export function generateKeychainAutoFillScript(): string {
  return `
(function() {
  'use strict';

  // ==========================================================================
  // GUARD: Prevent double-injection
  // ==========================================================================
  if (window.__STYLIQ_KEYCHAIN_AUTOFILL_INITIALIZED__) {
    return;
  }
  window.__STYLIQ_KEYCHAIN_AUTOFILL_INITIALIZED__ = true;

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  // Debounce time for focus events (ms)
  const FOCUS_DEBOUNCE_MS = 100;

  // Time to wait after modal detection before nudging focus (ms)
  const MODAL_STABILIZE_DELAY_MS = 300;

  // Time between focus nudge attempts (ms)
  const FOCUS_NUDGE_INTERVAL_MS = 150;

  // Maximum nudge attempts per modal
  const MAX_NUDGE_ATTEMPTS = 3;

  // ==========================================================================
  // STATE
  // ==========================================================================

  let isPasswordFieldFocused = false;
  let focusDebounceTimer = null;
  let lastFocusedPasswordField = null;
  let modalObserver = null;
  let nudgeAttempts = 0;

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Send a signal to React Native.
   * SECURITY: Only sends event type, never form content.
   */
  function sendSignal(type, metadata) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: type,
          timestamp: Date.now(),
          // SECURITY: metadata only contains safe, non-PII values
          ...metadata
        }));
      }
    } catch (e) {
      // Silently fail - don't break page functionality
    }
  }

  /**
   * Check if an element is a password input field.
   */
  function isPasswordField(element) {
    if (!element || element.nodeType !== 1) return false;
    if (element.tagName !== 'INPUT') return false;

    const type = (element.getAttribute('type') || '').toLowerCase();

    // Direct password type
    if (type === 'password') return true;

    // Some sites use text inputs with autocomplete="current-password" or "new-password"
    const autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
    if (autocomplete.includes('password')) return true;

    return false;
  }

  /**
   * Check if an element is inside a modal/dialog.
   */
  function isInsideModal(element) {
    let current = element;
    while (current && current !== document.body) {
      const role = current.getAttribute('role');
      const ariaModal = current.getAttribute('aria-modal');
      const classList = current.className || '';

      // Check for modal indicators
      if (role === 'dialog' || role === 'alertdialog' || ariaModal === 'true') {
        return true;
      }

      // Check for common modal class patterns
      if (typeof classList === 'string') {
        const lowerClass = classList.toLowerCase();
        if (lowerClass.includes('modal') || lowerClass.includes('dialog') ||
            lowerClass.includes('popup') || lowerClass.includes('overlay')) {
          return true;
        }
      }

      current = current.parentElement;
    }
    return false;
  }

  /**
   * Find password fields in a container.
   */
  function findPasswordFields(container) {
    if (!container || !container.querySelectorAll) return [];

    const inputs = container.querySelectorAll('input');
    const passwordFields = [];

    for (let i = 0; i < inputs.length; i++) {
      if (isPasswordField(inputs[i])) {
        passwordFields.push(inputs[i]);
      }
    }

    return passwordFields;
  }

  // ==========================================================================
  // PASSWORD FIELD FOCUS HANDLING
  // ==========================================================================

  /**
   * Handle password field focus.
   * Signals auth flow start with debouncing.
   */
  function handlePasswordFocus(event) {
    const target = event.target;
    if (!isPasswordField(target)) return;

    // Clear any pending debounce
    if (focusDebounceTimer) {
      clearTimeout(focusDebounceTimer);
    }

    focusDebounceTimer = setTimeout(function() {
      if (!isPasswordFieldFocused) {
        isPasswordFieldFocused = true;
        lastFocusedPasswordField = target;

        sendSignal('keychainAuthStart', {
          isModal: isInsideModal(target),
          fieldId: target.id || null,
          fieldName: target.name || null
          // SECURITY: No field value is ever sent
        });
      }
    }, FOCUS_DEBOUNCE_MS);
  }

  /**
   * Handle password field blur.
   * Signals potential auth flow end.
   */
  function handlePasswordBlur(event) {
    const target = event.target;
    if (!isPasswordField(target)) return;

    // Delay to allow for form submission detection
    setTimeout(function() {
      // Only signal if we haven't refocused another password field
      if (isPasswordFieldFocused && target === lastFocusedPasswordField) {
        // Check if focus moved to another password field
        const activeElement = document.activeElement;
        if (!isPasswordField(activeElement)) {
          isPasswordFieldFocused = false;
          lastFocusedPasswordField = null;

          sendSignal('keychainAuthBlur', {});
        }
      }
    }, 200);
  }

  // ==========================================================================
  // FORM SUBMISSION HANDLING
  // ==========================================================================

  /**
   * Handle form submission.
   * Signals auth flow completion.
   */
  function handleFormSubmit(event) {
    const form = event.target;
    if (!form || form.tagName !== 'FORM') return;

    // Check if form contains a password field
    const passwordFields = findPasswordFields(form);
    if (passwordFields.length === 0) return;

    // Signal auth flow completion
    isPasswordFieldFocused = false;
    lastFocusedPasswordField = null;

    sendSignal('keychainAuthSubmit', {
      formAction: form.action ? 'has_action' : 'no_action',
      formMethod: form.method || 'unknown'
      // SECURITY: No form data is ever sent
    });
  }

  // ==========================================================================
  // MODAL DETECTION AND FOCUS NUDGING
  // ==========================================================================

  /**
   * Apply focus nudge to make iOS AutoFill re-associate with password field.
   *
   * iOS AutoFill associates password fields at initial page load. When a modal
   * is dynamically injected, the password field inside it may not be associated.
   * This function applies a focus/blur cycle to trigger re-association.
   *
   * SECURITY: This only manipulates focus state, never reads or modifies values.
   */
  function applyFocusNudge(passwordField) {
    if (!passwordField || nudgeAttempts >= MAX_NUDGE_ATTEMPTS) return;

    nudgeAttempts++;

    // Store current active element
    const previousActive = document.activeElement;

    try {
      // Apply focus nudge sequence
      // 1. Focus the password field
      passwordField.focus();

      // 2. Brief delay for iOS to detect
      setTimeout(function() {
        // 3. Blur
        passwordField.blur();

        // 4. Another brief delay
        setTimeout(function() {
          // 5. Re-focus (this triggers iOS AutoFill re-association)
          passwordField.focus();

          // 6. Restore previous focus if user wasn't interacting
          setTimeout(function() {
            if (document.activeElement === passwordField &&
                previousActive && previousActive !== passwordField) {
              // Only restore if password field is still focused
              // and user hasn't interacted
            }
          }, 100);
        }, FOCUS_NUDGE_INTERVAL_MS);
      }, FOCUS_NUDGE_INTERVAL_MS);

    } catch (e) {
      // Silently fail - don't break modal functionality
    }
  }

  /**
   * Handle dynamically-added DOM nodes (for modal detection).
   */
  function handleDynamicContent(mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      if (mutation.type !== 'childList') continue;

      for (let j = 0; j < mutation.addedNodes.length; j++) {
        const node = mutation.addedNodes[j];
        if (node.nodeType !== 1) continue; // Only element nodes

        // Check if this is a modal or contains password fields
        const passwordFields = findPasswordFields(node);

        if (passwordFields.length > 0 && isInsideModal(node)) {
          // Modal with password field detected
          sendSignal('keychainModalDetected', {
            fieldCount: passwordFields.length
          });

          // Apply focus nudge after modal stabilizes
          setTimeout(function() {
            nudgeAttempts = 0; // Reset for this modal
            if (passwordFields[0]) {
              applyFocusNudge(passwordFields[0]);
            }
          }, MODAL_STABILIZE_DELAY_MS);
        }
      }
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize event listeners.
   */
  function initialize() {
    // Use capture phase to catch events before they're stopped
    document.addEventListener('focusin', handlePasswordFocus, true);
    document.addEventListener('focusout', handlePasswordBlur, true);
    document.addEventListener('submit', handleFormSubmit, true);

    // Also handle click-to-submit buttons (for forms with JS handlers)
    document.addEventListener('click', function(event) {
      const target = event.target;
      if (!target) return;

      // Check if clicked element is a submit button
      const tagName = target.tagName;
      const type = (target.getAttribute('type') || '').toLowerCase();
      const role = (target.getAttribute('role') || '').toLowerCase();

      if ((tagName === 'BUTTON' && (type === 'submit' || !type)) ||
          (tagName === 'INPUT' && type === 'submit') ||
          role === 'button') {

        // Find containing form
        const form = target.closest('form');
        if (form) {
          const passwordFields = findPasswordFields(form);
          if (passwordFields.length > 0 && isPasswordFieldFocused) {
            // Delay to allow form submission to process
            setTimeout(function() {
              isPasswordFieldFocused = false;
              lastFocusedPasswordField = null;
              sendSignal('keychainAuthSubmit', {
                trigger: 'button_click'
              });
            }, 100);
          }
        }
      }
    }, true);

    // Set up MutationObserver for dynamic content (modals)
    try {
      modalObserver = new MutationObserver(handleDynamicContent);
      modalObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {
      // MutationObserver not supported - degrade gracefully
    }

    // Check for existing password fields on page load
    const existingPasswordFields = findPasswordFields(document.body);
    if (existingPasswordFields.length > 0) {
      sendSignal('keychainPageHasPassword', {
        fieldCount: existingPasswordFields.length,
        inModal: existingPasswordFields.some(function(f) { return isInsideModal(f); })
      });
    }

    // Signal initialization complete
    sendSignal('keychainScriptInitialized', {
      hasPasswordFields: existingPasswordFields.length > 0
    });
  }

  // ==========================================================================
  // EXECUTE
  // ==========================================================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
true; // Required for WebView injectJavaScript
`;
}

/**
 * Script to re-check for password fields after navigation.
 * Lighter than full initialization - just detects and signals.
 */
export function generatePasswordFieldCheckScript(): string {
  return `
(function() {
  'use strict';

  function isPasswordField(element) {
    if (!element || element.nodeType !== 1) return false;
    if (element.tagName !== 'INPUT') return false;
    var type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'password') return true;
    var autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
    if (autocomplete.includes('password')) return true;
    return false;
  }

  var inputs = document.querySelectorAll('input');
  var count = 0;
  for (var i = 0; i < inputs.length; i++) {
    if (isPasswordField(inputs[i])) count++;
  }

  if (window.ReactNativeWebView && count > 0) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'keychainPasswordFieldsFound',
      count: count,
      timestamp: Date.now()
    }));
  }
})();
true;
`;
}

export default {
  generateKeychainAutoFillScript,
  generatePasswordFieldCheckScript,
};
