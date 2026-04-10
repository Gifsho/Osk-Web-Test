/**
 * @fileoverview SOSK Extension – Popup Script (Manifest V3)
 * Controls the browser action popup UI. Handles keyboard toggle and status display.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {
  /** Cross-browser API */
  const api = (typeof browser !== 'undefined' ? browser : chrome);

  // ─── DOM References ──────────────────────────────────────────────────────

  /** @type {HTMLButtonElement|null} */
  const soskMiniBtn = document.getElementById('SOSK-MINI');
  /** @type {HTMLButtonElement|null} */
  const settingsBtn = document.getElementById('settings');
  /** @type {HTMLElement|null} */
  const statusBadge = document.getElementById('status-badge');
  /** @type {HTMLElement|null} */
  const statusText = document.getElementById('status-text');
  /** @type {HTMLElement|null} */
  const tabErrorBox = document.getElementById('tab-error');
  /** @type {HTMLElement|null} */
  const tabErrorMsg = document.getElementById('tab-error-msg');

  // ─── URL Scriptability Check ─────────────────────────────────────────────

  /**
   * URL prefixes that Chrome does NOT allow content scripts to run on.
   * Attempting to sendMessage or executeScript on these will produce errors.
   * @type {string[]}
   */
  const UNSCRIPTABLE_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'https://chrome.google.com/webstore',
    'https://chromewebstore.google.com',
    'about:',
    'edge://',
    'data:',
    'file://',
  ];

  /**
   * Returns true if the extension is allowed to inject scripts into the given URL.
   * @param {string|undefined} url
   * @returns {boolean}
   */
  function isScriptableUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return !UNSCRIPTABLE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  // ─── Tab Error UI ────────────────────────────────────────────────────────

  /**
   * Shows a user-friendly notice when the current tab cannot be scripted.
   * @param {string} message
   */
  function showTabError(message) {
    if (!tabErrorBox || !tabErrorMsg) return;
    tabErrorMsg.textContent = message;
    tabErrorBox.style.display = 'flex';
    if (soskMiniBtn) soskMiniBtn.disabled = true;
  }

  /** Hides the tab error notice and re-enables the toggle button. */
  function clearTabError() {
    if (!tabErrorBox) return;
    tabErrorBox.style.display = 'none';
    if (soskMiniBtn) soskMiniBtn.disabled = false;
  }

  // ─── Status UI Helper ────────────────────────────────────────────────────

  /**
   * Updates the status badge and button text to reflect keyboard state.
   * @param {'on'|'off'} status
   */
  function updateStatusUI(status) {
    if (!statusBadge || !statusText || !soskMiniBtn) return;
    const isOn = status === 'on';
    statusBadge.className = `status-badge ${isOn ? 'status-badge--on' : 'status-badge--off'}`;
    statusText.textContent = isOn ? 'ON' : 'OFF';
    soskMiniBtn.textContent = isOn ? 'Hide Keyboard' : 'Show Keyboard';
  }

  // ─── Fetch Initial Status ────────────────────────────────────────────────

  try {
    api.runtime.sendMessage({ action: 'getKeyboardStatus' }, (response) => {
      if (api.runtime.lastError) {
        console.warn('Popup: Error getting keyboard status:', api.runtime.lastError.message);
        return;
      }
      if (response && response.status) {
        updateStatusUI(response.status);
      }
    });
  } catch (err) {
    console.error('Popup: Failed to get keyboard status:', err);
  }

  // ─── Check Active Tab on Open ─────────────────────────────────────────────
  // Immediately check if the current tab is scriptable, and show error if not.

  try {
    api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (api.runtime.lastError || !tabs || tabs.length === 0) return;
      const tab = tabs[0];
      if (!isScriptableUrl(tab.url)) {
        showTabError('Go to a regular webpage to use SOSK Keyboard.');
      } else {
        clearTabError();
      }
    });
  } catch (err) {
    console.error('Popup: Tab check on open error:', err);
  }

  // ─── Toggle Keyboard Button ──────────────────────────────────────────────

  if (soskMiniBtn) {
    soskMiniBtn.addEventListener('click', function () {
      try {
        api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (api.runtime.lastError) {
            console.warn('Popup: tabs.query error:', api.runtime.lastError.message);
            return;
          }
          if (!tabs || tabs.length === 0) return;

          const tab = tabs[0];
          if (!tab.id) return;

          // Guard: never attempt scripting on restricted URLs
          if (!isScriptableUrl(tab.url)) {
            showTabError('Cannot use SOSK on this page. Please go to a regular website.');
            return;
          }

          clearTabError();
          sendMessageToTab(tab.id, { action: 'SOSK-MINI' });
        });
      } catch (err) {
        console.error('Popup: Toggle keyboard error:', err);
      }
    });
  }

  // ─── Settings Button ─────────────────────────────────────────────────────

  if (settingsBtn) {
    settingsBtn.addEventListener('click', function () {
      try {
        api.tabs.create({ url: api.runtime.getURL('/set/setting.html') });
      } catch (err) {
        console.error('Popup: Failed to open settings:', err);
      }
    });
  }

  // ─── Send Message to Tab ─────────────────────────────────────────────────

  /**
   * Sends a message to the specified tab's content script.
   * If the content script is not yet loaded, falls back to injecting it.
   * @param {number} tabId
   * @param {{ action: string }} message
   */
  function sendMessageToTab(tabId, message) {
    try {
      api.tabs.sendMessage(tabId, message, function (response) {
        if (api.runtime.lastError) {
          const errMsg = api.runtime.lastError.message || '';

          if (errMsg.includes('Receiving end does not exist')) {
            // Content script not yet active on this tab – inject it first
            injectContentScript(tabId, message);
          } else {
            // Other errors (e.g. tab closed) – log only, not shown to user
            console.debug('Popup: sendMessage non-critical error:', errMsg);
          }
        } else {
          console.log('Popup: Message sent to tab', tabId, '– response:', response);
        }
      });
    } catch (err) {
      console.error('Popup: sendMessageToTab thrown error:', err);
    }
  }

  /**
   * Programmatically injects the content scripts into a tab then retries the message.
   * Handles and translates known injection-failure errors into user-visible messages.
   * @param {number} tabId
   * @param {{ action: string }} retryMessage
   */
  function injectContentScript(tabId, retryMessage) {
    try {
      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ['browser-polyfill.js', 'utils/validation.js', 'content/content.js'],
        },
        () => {
          if (chrome.runtime.lastError) {
            const injErr = chrome.runtime.lastError.message || '';

            // Known restriction messages – show friendly UI notice, not console error
            const isRestricted =
              injErr.includes('cannot be scripted') ||
              injErr.includes('Cannot access') ||
              injErr.includes('gallery cannot be scripted') ||
              injErr.includes('cannot script');

            if (isRestricted) {
              showTabError('Cannot use SOSK on this page. Please go to a regular website.');
            } else {
              console.error('Popup: Content script injection failed:', injErr);
            }
            return;
          }

          console.log('Popup: Content script injected, retrying message...');
          setTimeout(() => {
            api.tabs.sendMessage(tabId, retryMessage, () => {
              if (api.runtime.lastError) {
                console.debug('Popup: Post-injection retry error:', api.runtime.lastError.message);
              } else {
                console.log('Popup: Message sent after injection.');
              }
            });
          }, 500);
        }
      );
    } catch (err) {
      console.error('Popup: injectContentScript thrown error:', err);
    }
  }

  // ─── Listen for Status Updates from Background ───────────────────────────

  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (!message || typeof message !== 'object') {
        sendResponse({ success: false, error: 'Invalid message' });
        return true;
      }

      if (message.action === 'keyboardStatus' && message.status) {
        updateStatusUI(message.status);
        sendResponse({ success: true });
        return true;
      }

      if (message.action === 'ping') {
        sendResponse({ pong: true });
        return true;
      }

      sendResponse({ success: false, error: 'Unknown action' });
    } catch (err) {
      console.error('Popup: onMessage handler error:', err);
      sendResponse({ success: false, error: 'Internal error' });
    }
    return true;
  });
});
