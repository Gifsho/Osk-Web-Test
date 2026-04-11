/**
 * @fileoverview SOSK Extension – Background Service Worker (Manifest V3)
 * Handles keyboard status state management and cross-tab messaging.
 * NOTE: In MV3, background runs as a service worker. No `window` available.
 *       Use `self` or `chrome` directly. No persistent intervals – use chrome.alarms.
 */

'use strict';

importScripts('../utils/validation.js');

/** @type {'on'|'off'} Current virtual keyboard status */
let keyboardStatus = 'off';

// Load initial status from storage to prevent reset when Service Worker wakes up
chrome.storage.local.get(['keyboardStatus'], (data) => {
  if (data && data.keyboardStatus) {
    keyboardStatus = data.keyboardStatus;
  }
});

// ─── Crypto Helpers (For HTTP pages where window.crypto.subtle is undefined) ──
const SOSK_KEY_NAME = 'soskKey';

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getSyncStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
}

async function decryptTextBackground(payload) {
  const data = await getSyncStorage([SOSK_KEY_NAME]);
  const keyB64 = data && data[SOSK_KEY_NAME];
  if (!keyB64) throw new Error('Missing encryption key in storage');
  const keyData = base64ToArrayBuffer(keyB64);
  const cryptoKey = await self.crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const cipher = base64ToArrayBuffer(payload.data);
  const plainBuffer = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, cipher);
  return new TextDecoder().decode(plainBuffer);
}

async function encryptTextBackground(plainText) {
  const data = await getSyncStorage([SOSK_KEY_NAME]);
  const keyB64 = data && data[SOSK_KEY_NAME];
  if (!keyB64) throw new Error('Missing encryption key in storage');
  const keyData = base64ToArrayBuffer(keyB64);
  const cryptoKey = await self.crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = self.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuffer = await self.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
  return { iv: arrayBufferToBase64(iv.buffer), data: arrayBufferToBase64(cipherBuffer) };
}


// ─── Installation ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.storage.sync.get(['keyboardPosition'], (data) => {
      if (chrome.runtime.lastError) {
        console.error('onInstalled storage.get error:', chrome.runtime.lastError.message);
        return;
      }
      if (!data || !data.keyboardPosition) {
        chrome.storage.sync.set({ keyboardPosition: 'bottom-right' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to set default keyboardPosition:', chrome.runtime.lastError.message);
          }
        });
      }
    });
  } catch (err) {
    console.error('onInstalled error:', err);
  }
});

// ─── Message Handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('Background received message:', message);

    // Validate message structure
    const validation = (self.SOSKValidation || {}).validateMessage;
    if (validation) {
      const result = validation(message);
      if (!result.ok) {
        console.warn('Background: Invalid message received:', result.error);
        sendResponse({ success: false, error: 'Invalid message format' });
        return true;
      }
    } else if (!message || typeof message !== 'object' || !message.action) {
      sendResponse({ success: false, error: 'Invalid message format' });
      return true;
    }

    // ── keyboardStatus (from content script / popup) ──
    if (
      (message.action === 'keyboardStatus' || message.action === 'setKeyboardStatus') &&
      (message.status === 'on' || message.status === 'off')
    ) {
      keyboardStatus = message.status;
      chrome.storage.local.set({ keyboardStatus });
      broadcastStatusUpdate(keyboardStatus);
      sendResponse({ success: true, status: keyboardStatus });
      return true;
    }

    // ── getKeyboardStatus (from popup) ──
    if (message.action === 'getKeyboardStatus') {
      console.log('Background: Sending keyboard status:', keyboardStatus);
      sendResponse({ status: keyboardStatus });
      return true;
    }

    // ── contentScriptReady (from content script on page load) ──
    if (message.action === 'contentScriptReady') {
      console.log('Content script ready in tab:', sender.tab ? sender.tab.id : 'unknown');
      // If keyboard was ON, tell the newly loaded content script to show keyboard.
      // We only do this for the TOP frame (frameId === 0) to avoid toggling when iframes load asynchronously.
      if (keyboardStatus === 'on' && sender.tab && sender.tab.id && sender.frameId === 0) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'SOSK-SHOW' }, () => {
          if (chrome.runtime.lastError) {
            console.debug('Could not auto-show keyboard:', chrome.runtime.lastError.message);
          }
        });
      }
      sendResponse({ ok: true });
      return true;
    }
    // ── crypto operations (delegated from content script) ──
    if (message.action === 'bg_encrypt') {
      encryptTextBackground(message.text)
        .then(payload => sendResponse({ success: true, payload }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.action === 'bg_decrypt') {
      decryptTextBackground(message.payload)
        .then(plainText => sendResponse({ success: true, plainText }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // ── ping (keepalive / listener check) ──
    if (message.action === 'ping') {
      sendResponse({ pong: true });
      return true;
    }

    // Unknown action
    console.warn('Background: Unknown action received:', message.action);
    sendResponse({ success: false, error: 'Unknown action: ' + message.action });
  } catch (err) {
    console.error('Background message handler error:', err);
    sendResponse({ success: false, error: 'Internal error' });
  }
  return true;
});

// ─── Broadcast Helper ──────────────────────────────────────────────────────────

/**
 * Broadcasts keyboard status update to all active tabs via content scripts.
 * In MV3, background cannot send to itself; must send to tabs directly.
 * @param {'on'|'off'} status - New keyboard status
 */
function broadcastStatusUpdate(status) {
  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('broadcastStatusUpdate tabs.query error:', chrome.runtime.lastError.message);
        return;
      }
      for (const tab of tabs) {
        if (!tab.id) continue;
        chrome.tabs.sendMessage(tab.id, { action: 'keyboardStatus', status }, () => {
          // Suppress errors for tabs without content scripts (e.g. chrome:// pages)
          if (chrome.runtime.lastError) {
            console.debug(`Tab ${tab.id}: no content script listener –`, chrome.runtime.lastError.message);
          }
        });
      }
    });
  } catch (err) {
    console.error('broadcastStatusUpdate error:', err);
  }
}

console.log('SOSK Background service worker started');
