/**
 * @fileoverview SOSK Extension – Content Script
 * Injected into every page. Manages the floating keyboard iframe and text insertion.
 * Fixes:
 *   - Drag: uses wrapper div + drag handle bar (iframes block mouse events)
 *   - Size: wrapper holds dimensions; iframe fills 100%
 *   - ←/→ scroll: uses Selection API for contenteditable; preserves focus
 */

(function () {
  'use strict';

  /**
   * The wrapper div that contains the drag handle + keyboard iframe.
   * @type {HTMLDivElement|null}
   */
  let keyboardWrapper = null;

  /** @type {number|null} Focus restoration timeout handle */
  let focusTimeout = null;
  /** @type {Element|null} Last focused text input element */
  let lastActiveElement = null;
  /** @type {boolean} Whether a typing operation is in progress */
  let isTyping = false;

  /** Cross-browser API */
  const api = (typeof browser !== 'undefined' ? browser : chrome);

  /** @type {string} Storage key for AES-GCM encryption key */
  const SOSK_KEY_NAME = 'soskKey';

  // ─── Crypto Helpers (Delegated to Background Service Worker) ───────────────

  /**
   * Decrypts an encrypted payload using the background service worker.
   * This bypasses the window.crypto.subtle HTTP restriction.
   * @param {{ iv: string, data: string }} payload
   * @returns {Promise<string>}
   */
  function decryptText(payload) {
    return new Promise((resolve, reject) => {
      try {
        api.runtime.sendMessage({ action: 'bg_decrypt', payload }, (res) => {
          if (api.runtime.lastError) {
            const msg = api.runtime.lastError.message || '';
            if (msg.includes('Extension context invalidated')) {
              return reject(new Error('EXTENSION_INVALIDATED'));
            }
            return reject(new Error(msg));
          }
          if (!res || !res.success) return reject(new Error(res ? res.error : 'Decryption failed in background'));
          resolve(res.plainText);
        });
      } catch (err) {
        if (err.message && err.message.includes('Extension context invalidated')) {
          reject(new Error('EXTENSION_INVALIDATED'));
        } else {
          reject(err);
        }
      }
    });
  }

  /**
   * Encrypts plain text using the background service worker.
   * @param {string} plainText
   * @returns {Promise<{ iv: string, data: string }>}
   */
  function encryptText(plainText) {
    return new Promise((resolve, reject) => {
      try {
        api.runtime.sendMessage({ action: 'bg_encrypt', text: plainText }, (res) => {
          if (api.runtime.lastError) {
            const msg = api.runtime.lastError.message || '';
            if (msg.includes('Extension context invalidated')) {
              return reject(new Error('EXTENSION_INVALIDATED'));
            }
            return reject(new Error(msg));
          }
          if (!res || !res.success) return reject(new Error(res ? res.error : 'Encryption failed in background'));
          resolve(res.payload);
        });
      } catch (err) {
        if (err.message && err.message.includes('Extension context invalidated')) {
          reject(new Error('EXTENSION_INVALIDATED'));
        } else {
          reject(err);
        }
      }
    });
  }

  // ─── Iframe Resize Listener ────────────────────────────────────────────────
  // The keyboard iframe sends its natural size via postMessage so the wrapper
  // can resize itself to fit exactly.

  window.addEventListener('message', (event) => {
    if (!keyboardWrapper) return;
    try {
      if (event.data && event.data.type === 'sosk:resize') {
        const width = Math.max(320, Math.ceil(event.data.width));
        const height = Math.max(180, Math.ceil(event.data.height));
        // Only update wrapper – iframe sizing is handled by CSS flex (flex:1).
        // Setting iframe size here would conflict with flex layout and cause oscillation.
        keyboardWrapper.style.width = width + 'px';
        keyboardWrapper.style.height = (height + 28) + 'px'; // 28px = drag handle
      }
    } catch (_) {
      // Ignore cross-origin errors
    }
  });

  // ─── Runtime Message Handler ───────────────────────────────────────────────

  api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || typeof request !== 'object' || !request.action) {
      sendResponse({ success: false, error: 'Invalid message format' });
      return true;
    }

    const currentElement = document.activeElement;
    if (currentElement && isTextInput(currentElement)) {
      lastActiveElement = currentElement;
    }

    if (!lastActiveElement || !isTextInput(lastActiveElement) || !document.contains(lastActiveElement)) {
      const inputs = document.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], textarea, [contenteditable="true"]'
      );
      if (inputs.length > 0) lastActiveElement = inputs[0];
    }

    const checkLastActiveElement = !!(lastActiveElement && isTextInput(lastActiveElement));

    if (request.action === 'SOSK-MINI') {
      handleKeyboardMini(false);
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'SOSK-SHOW') {
      handleKeyboardMini(true);
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'typeKey') {
      if (request.key && typeof request.key === 'object' && request.key.enc) {
        decryptText(request.key.enc)
          .then((plain) => { insertText(lastActiveElement, plain); sendResponse({ success: true, decrypted: true }); })
          .catch((err) => { console.warn('Content: Decryption failed:', err); sendResponse({ success: false, error: 'Decryption failed' }); });
        return true;
      }
      if (typeof request.key === 'string') {
        insertText(lastActiveElement, request.key);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Invalid key value' });
      }
      return true;
    }

    if (request.action === 'backspace') { deleteText(lastActiveElement); sendResponse({ success: true }); return true; }
    if (request.action === 'Enter') { insertNewLine(lastActiveElement); sendResponse({ success: true }); return true; }
    if (request.action === 'esc') { escapes(); sendResponse({ success: true }); return true; }

    if (request.action === 'del⌦' && checkLastActiveElement) { deleteTextStart(lastActiveElement); sendResponse({ success: true }); return true; }
    if (request.action === 'home' && checkLastActiveElement) { moveCursorHome(lastActiveElement); sendResponse({ success: true }); return true; }
    if (request.action === 'end' && checkLastActiveElement) { moveCursorEnd(lastActiveElement); sendResponse({ success: true }); return true; }
    if (request.action === '←' && checkLastActiveElement) { moveCursor(lastActiveElement, -1); sendResponse({ success: true }); return true; }
    if (request.action === '→' && checkLastActiveElement) { moveCursor(lastActiveElement, +1); sendResponse({ success: true }); return true; }

    if (request.action === 'keyboardStatus') { sendResponse({ success: true }); return true; }

    sendResponse({ success: false, error: 'Unknown action: ' + request.action });
    return true;
  });

  // ─── PostMessage Handler (from keyboard iframe) ────────────────────────────

  window.addEventListener('message', (evt) => {
    try {
      const data = evt.data;
      if (!data || typeof data !== 'object') return;

      if (data.source === 'SOSK_KEYBOARD' && data.type === 'keyAction' && data.data) {
        handleIframeKeyAction(data.data);
        return;
      }

      if (data.source !== 'SOSK_PAGE') return;

      const handleCryptoErr = (err, reqId) => {
         if (err.message === 'EXTENSION_INVALIDATED') {
           alert("⚠️ ตัวส่วนขยาย SOSK ของคุณได้รับการอัปเดต หรือรีโหลด \nกรุณากด F5 (Refresh) หน้านี้ก่อนใช้งานต่อครับ");
         }
         window.postMessage({ source: 'SOSK_CONTENT', ok: false, requestId: reqId, error: String(err) }, '*');
      };

      if (data.action === 'encrypt' && typeof data.text === 'string') {
        encryptText(data.text)
          .then((payload) => window.postMessage({ source: 'SOSK_CONTENT', ok: true, requestId: data.requestId, result: { enc: payload } }, '*'))
          .catch((err) => handleCryptoErr(err, data.requestId));
      } else if (data.action === 'decrypt' && data.payload && data.payload.iv && data.payload.data) {
        decryptText(data.payload)
          .then((plain) => window.postMessage({ source: 'SOSK_CONTENT', ok: true, requestId: data.requestId, result: { text: plain } }, '*'))
          .catch((err) => handleCryptoErr(err, data.requestId));
      }
    } catch (_) { }
  });

  // ─── Focus Tracking ─────────────────────────────────────────────────────────

  document.addEventListener('focusin', (e) => {
    if (isTextInput(e.target)) {
      lastActiveElement = e.target;
      if (!isTyping) restoreFocus();
    }
  }, true);

  // FIX: removed aggressive click-blur that was clearing lastActiveElement on any click.
  // Removed the old document click listener that called lastActiveElement.blur() –
  // this was causing focus loss when clicking keyboard buttons.

  // ─── Iframe Key Action Processor ───────────────────────────────────────────

  /**
   * Handles key action data received from the keyboard iframe via postMessage.
   * Focus is NOT re-checked here because clicking the iframe steals focus from the page.
   * We intentionally preserve lastActiveElement even when iframe has focus.
   * @param {{ action: string, key?: string|{enc: {iv:string, data:string}} }} actionData
   */
  function handleIframeKeyAction(actionData) {
    if (!actionData || typeof actionData.action !== 'string') return;

    // Only update lastActiveElement if the current focus is on a real input
    // (NOT the iframe or body), so typing always targets the last real input.
    const currentElement = document.activeElement;
    if (currentElement && isTextInput(currentElement)) {
      lastActiveElement = currentElement;
    }

    // Fallback: scan visible inputs if nothing tracked
    if (!lastActiveElement || !isTextInput(lastActiveElement) || !document.contains(lastActiveElement)) {
      const inputs = document.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], textarea, [contenteditable="true"]'
      );
      for (const input of inputs) {
        const rect = input.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) { lastActiveElement = input; break; }
      }
    }

    const checkElem = !!(lastActiveElement && isTextInput(lastActiveElement));

    switch (actionData.action) {
      case 'typeKey':
        if (actionData.key && typeof actionData.key === 'object' && actionData.key.enc) {
          decryptText(actionData.key.enc)
            .then((plain) => insertText(lastActiveElement, plain))
            .catch((err) => {
               if (err.message === 'EXTENSION_INVALIDATED') {
                 alert("⚠️ ตัวส่วนขยาย SOSK ของคุณได้รับการอัปเดต หรือรีโหลด \nกรุณากด F5 (Refresh) หน้านี้ก่อนใช้งานต่อครับ");
               } else {
                 console.warn('SOSK: Decryption failed:', err);
               }
            });
        } else if (typeof actionData.key === 'string') {
          insertText(lastActiveElement, actionData.key);
        }
        break;
      case 'backspace': deleteText(lastActiveElement); break;
      case 'Enter': insertNewLine(lastActiveElement); break;
      case 'esc': escapes(); break;
      case 'del⌦': if (checkElem) deleteTextStart(lastActiveElement); break;
      case 'home': if (checkElem) moveCursorHome(lastActiveElement); break;
      case 'end': if (checkElem) moveCursorEnd(lastActiveElement); break;
      case '←': if (checkElem) moveCursor(lastActiveElement, -1); break;
      case '→': if (checkElem) moveCursor(lastActiveElement, +1); break;
      default: console.debug('SOSK: Unknown iframe action:', actionData.action);
    }
  }

  // ─── Cursor Movement (FIX: supports both input/textarea and contenteditable) ──

  /**
   * Moves the text cursor left (−1) or right (+1) by one character.
   * Handles both input/textarea (selectionStart) and contenteditable (Selection API).
   * @param {Element} element
   * @param {-1|1} direction
   */
  function moveCursor(element, direction) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const pos = element.selectionStart || 0;
      const newPos = Math.max(0, Math.min(element.value.length, pos + direction));
      element.focus({ preventScroll: true });
      element.setSelectionRange(newPos, newPos);
    } else if (element.isContentEditable) {
      element.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      try {
        if (direction === -1) {
          sel.modify('move', 'backward', 'character');
        } else {
          sel.modify('move', 'forward', 'character');
        }
      } catch (_) {
        // Fallback: collapse to start or end
        range.collapse(direction === -1);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  /**
   * Moves cursor to the beginning of the input.
   * @param {Element} element
   */
  function moveCursorHome(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.focus({ preventScroll: true });
      element.setSelectionRange(0, 0);
    } else if (element.isContentEditable) {
      element.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) sel.modify('move', 'backward', 'lineboundary');
    }
  }

  /**
   * Moves cursor to the end of the input.
   * @param {Element} element
   */
  function moveCursorEnd(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.focus({ preventScroll: true });
      element.setSelectionRange(element.value.length, element.value.length);
    } else if (element.isContentEditable) {
      element.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) sel.modify('move', 'forward', 'lineboundary');
    }
  }

  // ─── DOM Helpers ────────────────────────────────────────────────────────────

  /**
   * Ensures the given element is focused, restoring previous cursor safely
   * because focus() often automatically selects all text in some browsers.
   * @param {Element} element
   * @returns {boolean}
   */
  function ensureElementFocus(element) {
    if (!element || !isTextInput(element)) return false;
    try {
      if (element.style.display === 'none' || element.disabled) return false;
      if (document.activeElement !== element) {
        let _start = null, _end = null;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          _start = element.selectionStart;
          _end = element.selectionEnd;
        }
        element.focus({ preventScroll: true });
        if (_start !== null && _end !== null) {
          try { element.setSelectionRange(_start, _end); } catch (_) {}
        }
      }
      return true;
    } catch (error) {
      console.error('Content: Error focusing element:', error);
      return false;
    }
  }

  /**
   * Deletes the character before the cursor (Backspace).
   * @param {Element|null} element
   */
  function deleteText(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (!ensureElementFocus(element)) return;
      setTimeout(() => {
        try {
          const start = typeof element.selectionStart === 'number' ? element.selectionStart : (element.value ? element.value.length : 0);
          const end = typeof element.selectionEnd === 'number' ? element.selectionEnd : start;
          const value = element.value || '';
          
          if (start !== end) {
            // Delete the highlighted selection
            element.value = value.slice(0, start) + value.slice(end);
            element.setSelectionRange(start, start);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (start > 0) {
            // Delete character before cursor
            element.value = value.slice(0, start - 1) + value.slice(start);
            element.setSelectionRange(start - 1, start - 1);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch (_) {}
      }, 20);
    } else if (element && element.isContentEditable) {
      if (!ensureElementFocus(element)) return;
      setTimeout(() => document.execCommand('delete'), 20);
    }
  }

  /**
   * Deletes the character after the cursor (Delete/Del⌦).
   * @param {Element} element
   */
  function deleteTextStart(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (!ensureElementFocus(element)) return;
      setTimeout(() => {
        try {
          const start = typeof element.selectionStart === 'number' ? element.selectionStart : (element.value ? element.value.length : 0);
          const end = typeof element.selectionEnd === 'number' ? element.selectionEnd : start;
          const value = element.value || '';
          
          if (start !== end) {
            // Delete selection
            element.value = value.slice(0, start) + value.slice(end);
            element.setSelectionRange(start, start);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (start < value.length) {
            // Delete character after cursor
            element.value = value.slice(0, start) + value.slice(end + 1);
            element.setSelectionRange(start, start);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch (_) {}
      }, 20);
    } else if (element && element.isContentEditable) {
      if (!ensureElementFocus(element)) return;
      setTimeout(() => document.execCommand('forwardDelete'), 20);
    }
  }

  /**
   * Dismisses modals or exits fullscreen (Escape).
   */
  function escapes() {
    const modals = document.querySelectorAll('.modal');
    if (modals.length > 0) {
      modals.forEach((modal) => modal.classList.add('hidden'));
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  /**
   * Inserts text at the cursor position in the target element.
   * @param {Element|null} element
   * @param {string} key
   */
  function insertText(element, key) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (!ensureElementFocus(element)) return;
      setTimeout(() => {
        try {
          const start = typeof element.selectionStart === 'number' ? element.selectionStart : (element.value ? element.value.length : 0);
          const end = typeof element.selectionEnd === 'number' ? element.selectionEnd : start;
          element.value = element.value.slice(0, start) + key + element.value.slice(end);
          try { element.setSelectionRange(start + key.length, start + key.length); } catch (_) { }
          element.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) {
          console.error('Content: Text insertion error:', err);
        }
      }, 50);
    } else if (element && element.isContentEditable) {
      element.focus({ preventScroll: true });
      setTimeout(() => {
        try {
          // Use execCommand for contenteditable – most compatible
          document.execCommand('insertText', false, key);
        } catch (err) {
          console.error('Content: contenteditable insertion error:', err);
        }
      }, 50);
    }
  }

  /**
   * Inserts a newline or submits a form.
   * @param {Element|null} element
   */
  function insertNewLine(element) {
    if (!element) { document.execCommand('insertText', false, '\n'); return; }
    if (element.tagName === 'TEXTAREA') {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      element.value = element.value.slice(0, start) + '\n' + element.value.slice(end);
      element.setSelectionRange(start + 1, start + 1);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.tagName === 'INPUT' && element.form) {
      const submitBtn = element.form.querySelector('input[type="submit"], button[type="submit"]');
      if (submitBtn) { submitBtn.click(); } else { element.form.submit(); }
    } else if (element.isContentEditable) {
      element.focus({ preventScroll: true });
      document.execCommand('insertParagraph', false, null);
    }
  }

  /**
   * Returns true if element is a usable text input.
   * @param {Element|null} element
   * @returns {boolean}
   */
  function isTextInput(element) {
    if (!element) return false;
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable === true
    );
  }

  /**
   * Restores focus to the last active element after a short delay.
   */
  function restoreFocus() {
    const el = lastActiveElement;
    if (!el || !isTextInput(el) || !document.contains(el)) return;
    if (focusTimeout) clearTimeout(focusTimeout);
    focusTimeout = setTimeout(() => {
      const target = lastActiveElement;
      if (!target || !isTextInput(target) || !document.contains(target)) return;
      requestAnimationFrame(() => {
        const now = lastActiveElement || target;
        if (!now || !isTextInput(now) || !document.contains(now)) return;
        try {
          if (document.activeElement !== now) now.focus({ preventScroll: true });
          now.style.caretColor = 'auto';
          now.style.webkitUserSelect = 'text';
          now.style.userSelect = 'text';
        } catch (_) { }
      });
    }, 55);
  }

  // ─── Keyboard Wrapper Management ────────────────────────────────────────────
  // FIX (Drag): iframe captures all mouse events.
  // Solution: wrap iframe in a host-page div + add a drag handle bar div on top.
  // The handle bar lives in the HOST page DOM → mouse events work correctly.

  /**
   * Toggles or explicitly shows the floating keyboard.
   * @param {boolean} forceShow - If true, ensures the keyboard is visible instead of toggling.
   */
  function handleKeyboardMini(forceShow = false) {
    if (window !== window.top) return; // Prevent iframes from spawning their own keyboards

    try {
      api.storage.sync.get(['keyboardPosition'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('handleKeyboardMini storage error:', chrome.runtime.lastError.message);
          return;
        }
        const position = (result && result.keyboardPosition) || 'bottom-right';
        lastActiveElement = document.activeElement;

        if (!keyboardWrapper) {
          keyboardWrapper = createKeyboardWrapper('MiniScreen/index.html');
          setPosition(position, keyboardWrapper);
          document.body.appendChild(keyboardWrapper);
          api.runtime.sendMessage({ action: 'keyboardStatus', status: 'on' }, () => {
            if (chrome.runtime.lastError) {
              console.debug('Could not notify background of keyboard ON:', chrome.runtime.lastError.message);
            }
          });
        } else {
          // Fix for Single Page Applications (SPAs) that might wipe the DOM element
          if (!document.body.contains(keyboardWrapper)) {
            document.body.appendChild(keyboardWrapper);
            keyboardWrapper.style.display = 'flex';
            keyboardWrapper.setAttribute('aria-hidden', 'false');
            api.runtime.sendMessage({ action: 'keyboardStatus', status: 'on' }, () => {
              if (chrome.runtime.lastError) {
                console.debug('Could not notify background of keyboard ON:', chrome.runtime.lastError.message);
              }
            });
          } else {
            if (forceShow) {
              keyboardWrapper.style.display = 'flex';
              keyboardWrapper.setAttribute('aria-hidden', 'false');
              api.runtime.sendMessage({ action: 'keyboardStatus', status: 'on' }, () => {});
            } else {
              toggleWrapperDisplay(keyboardWrapper);
              api.runtime.sendMessage(
                { action: 'keyboardStatus', status: keyboardWrapper.style.display === 'none' ? 'off' : 'on' },
                () => { if (chrome.runtime.lastError) { console.debug('Keyboard status notify error:', chrome.runtime.lastError.message); } }
              );
            }
          }
        }
      });
    } catch (err) {
      console.error('handleKeyboardMini error:', err);
    }
  }

  /**
   * Creates the keyboard wrapper: a host-page div with drag handle + iframe inside.
   * The drag handle is a normal DOM element so mouse events fire correctly.
   * @param {string} src - Extension-relative path to MiniScreen/index.html
   * @returns {HTMLDivElement}
   */
  function createKeyboardWrapper(src) {
    requestAnimationFrame(restoreFocus);

    // ── Wrapper (outer container) ──────────────────────
    const wrapper = document.createElement('div');
    wrapper.id = 'sosk-keyboard-wrapper';
    wrapper.setAttribute('aria-label', 'SOSK Virtual Keyboard');
    Object.assign(wrapper.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      // Start at a generous width so the iframe can measure its natural scrollWidth
      // correctly before the first sosk:resize fires. sosk:resize will correct these.
      width: '1000px',
      height: '260px',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      overflow: 'hidden',
      userSelect: 'none',
    });

    // ── Drag Handle Bar (in HOST page, not iframe) ─────
    const handle = document.createElement('div');
    handle.id = 'sosk-drag-handle';
    Object.assign(handle.style, {
      width: '100%',
      height: '28px',
      background: 'linear-gradient(90deg, #e0e7ff 0%, #ede9fe 100%)',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      flexShrink: '0',
      boxSizing: 'border-box',
    });

    // Dots indicator
    const dots = document.createElement('span');
    dots.textContent = '⠿';
    dots.style.cssText = 'color:#818cf8;font-size:14px;letter-spacing:2px;pointer-events:none;';
    handle.appendChild(dots);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close keyboard';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      color: '#6366f1',
      padding: '2px 4px',
      borderRadius: '4px',
      lineHeight: '1',
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWrapperDisplay(wrapper);
      api.runtime.sendMessage({ action: 'keyboardStatus', status: 'off' }, () => {});
    });
    handle.appendChild(closeBtn);

    // Attach drag to the handle bar
    handle.addEventListener('mousedown', (e) => startDrag(e, wrapper));

    // ── Keyboard iFrame ────────────────────────────────
    // Uses flex:1 + min-height:0 so the wrapper height controls it via flexbox.
    // We do NOT set explicit px height in JS – that would fight with flex layout
    // and cause the same oscillation problem as the old +16 padding approach.
    const frame = document.createElement('iframe');
    frame.src = api.runtime.getURL(src);
    Object.assign(frame.style, {
      width: '100%',
      flex: '1',
      minHeight: '0',
      border: 'none',
      display: 'block',
    });
    frame.setAttribute('aria-label', 'SOSK keyboard input');

    wrapper.appendChild(handle);
    wrapper.appendChild(frame);

    return wrapper;
  }

  /**
   * Handles mouse-down on the drag handle to start dragging the wrapper.
   * All mouse listeners are on the HOST document – not blocked by iframe.
   * @param {MouseEvent} event
   * @param {HTMLElement} wrapper
   */
  function startDrag(event, wrapper) {
    event.preventDefault();

    const handle = wrapper.querySelector('#sosk-drag-handle');
    if (handle) handle.style.cursor = 'grabbing';

    // Use current bounding rect for accurate offset calculation
    const rect = wrapper.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    // While dragging, overlay a transparent div over the iframe so mouse
    // events are captured by the host page (not stolen by iframe content).
    const shield = document.createElement('div');
    Object.assign(shield.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh',
      zIndex: '2147483646',
      cursor: 'grabbing',
    });
    document.body.appendChild(shield);

    function onMouseMove(e) {
      const newLeft = e.clientX - offsetX;
      const newTop = e.clientY - offsetY;
      // Keep within viewport bounds
      const maxLeft = window.innerWidth - wrapper.offsetWidth;
      const maxTop = window.innerHeight - wrapper.offsetHeight;
      wrapper.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
      wrapper.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';
      wrapper.style.right = '';
      wrapper.style.bottom = '';
    }

    function onMouseUp() {
      if (handle) handle.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (shield.parentNode) shield.parentNode.removeChild(shield);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Sets the initial screen position of the keyboard wrapper.
   * @param {string} position
   * @param {HTMLElement} wrapper
   */
  function setPosition(position, wrapper) {
    wrapper.style.top = '';
    wrapper.style.bottom = '';
    wrapper.style.left = '';
    wrapper.style.right = '';

    switch (position) {
      case 'bottom-left':
        wrapper.style.bottom = '10px';
        wrapper.style.left = '10px';
        break;
      case 'top-right':
        wrapper.style.top = '10px';
        wrapper.style.right = '10px';
        break;
      case 'top-left':
        wrapper.style.top = '10px';
        wrapper.style.left = '10px';
        break;
      default: // bottom-right
        wrapper.style.bottom = '10px';
        wrapper.style.right = '10px';
    }
  }

  /**
   * Toggles visibility of the keyboard wrapper.
   * @param {HTMLElement} wrapper
   */
  function toggleWrapperDisplay(wrapper) {
    const isHidden = wrapper.style.display === 'none';
    wrapper.style.display = isHidden ? 'flex' : 'none';
    wrapper.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
  }

  // ─── Initialize ────────────────────────────────────────────────────────────

  console.log('SOSK Content script loaded and ready');

  try {
    api.runtime.sendMessage({ action: 'contentScriptReady' }, () => {
      if (chrome.runtime.lastError) {
        console.debug('Background not ready:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.debug('Extension context may be invalidated on load');
  }
})();
