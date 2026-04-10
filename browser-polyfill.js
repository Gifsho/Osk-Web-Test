// Browser Compatibility Layer for Chrome/Firefox
// This provides a unified API interface for both browsers

(function() {
  'use strict';
  
  // Check if we're in Firefox or Chrome
  const isFirefox = typeof browser !== 'undefined' && browser.runtime;
  const isChrome = typeof chrome !== 'undefined' && chrome.runtime;
  
  // Create a unified browser API
  window.browserAPI = (function() {
    const api = {};
    
    // Use browser API (Firefox) if available, otherwise use chrome API
    const nativeAPI = isFirefox ? browser : chrome;
    
    // Runtime API
    api.runtime = {
      sendMessage: function(message, callback) {
        if (isFirefox) {
          // Firefox uses promises
          const promise = browser.runtime.sendMessage(message);
          if (callback) {
            promise.then(callback).catch((error) => {
              // Set lastError for compatibility
              api.runtime.lastError = { message: error.message || 'Connection error' };
              callback();
            });
          }
          return promise;
        } else {
          // Chrome uses callbacks
          return chrome.runtime.sendMessage(message, callback);
        }
      },
      
      onMessage: {
        addListener: function(listener) {
          if (isFirefox) {
            browser.runtime.onMessage.addListener((message, sender) => {
              return new Promise((resolve) => {
                const sendResponse = resolve;
                const result = listener(message, sender, sendResponse);
                if (result === true) {
                  // Keep channel open for async response
                  return;
                }
                resolve(result);
              });
            });
          } else {
            chrome.runtime.onMessage.addListener(listener);
          }
        }
      },
      
      onInstalled: {
        addListener: function(listener) {
          nativeAPI.runtime.onInstalled.addListener(listener);
        }
      },
      
      getURL: function(path) {
        return nativeAPI.runtime.getURL(path);
      },
      
      get lastError() {
        if (isFirefox) {
          return api._lastError || null;
        }
        return nativeAPI.runtime.lastError;
      },
      
      set lastError(error) {
        if (isFirefox) {
          api._lastError = error;
        }
      }
    };
    
    // Storage API
    api.storage = {
      sync: {
        get: function(keys, callback) {
          if (isFirefox) {
            const promise = browser.storage.sync.get(keys);
            if (callback) {
              promise.then(callback).catch((error) => {
                api.runtime.lastError = { message: error.message || 'Storage get failed' };
                callback({});
              });
            }
            return promise;
          } else {
            return chrome.storage.sync.get(keys, callback);
          }
        },
        
        set: function(items, callback) {
          if (isFirefox) {
            const promise = browser.storage.sync.set(items);
            if (callback) {
              promise.then(callback).catch((error) => {
                api.runtime.lastError = { message: error.message || 'Storage set failed' };
                callback();
              });
            }
            return promise;
          } else {
            return chrome.storage.sync.set(items, callback);
          }
        }
      }
    };
    
    // Tabs API
    api.tabs = {
      query: function(queryInfo, callback) {
        if (isFirefox) {
          const promise = browser.tabs.query(queryInfo);
          if (callback) {
            promise.then(callback).catch((error) => {
              api.runtime.lastError = { message: error.message || 'Query failed' };
              callback([]);
            });
          }
          return promise;
        } else {
          return chrome.tabs.query(queryInfo, callback);
        }
      },
      
      sendMessage: function(tabId, message, callback) {
        if (isFirefox) {
          const promise = browser.tabs.sendMessage(tabId, message);
          if (callback) {
            promise.then(callback).catch((error) => {
              api.runtime.lastError = { message: error.message || 'Message sending failed' };
              callback();
            });
          }
          return promise;
        } else {
          return chrome.tabs.sendMessage(tabId, message, callback);
        }
      }
    };
    
    // Scripting API (for content script injection)
    api.scripting = {
      executeScript: function(details, callback) {
        if (isFirefox) {
          // Firefox uses tabs.executeScript
          const promise = browser.tabs.executeScript(details.target.tabId, {
            file: details.files ? details.files[0] : undefined,
            code: details.func ? `(${details.func})()` : undefined
          });
          if (callback) {
            promise.then((result) => callback(result)).catch(() => {
              if (callback) callback([]);
            });
          }
          return promise;
        } else {
          if (chrome.scripting) {
            // Chrome MV3
            return chrome.scripting.executeScript(details, callback);
          } else {
            // Chrome MV2 fallback
            return chrome.tabs.executeScript(details.target.tabId, {
              file: details.files ? details.files[0] : undefined
            }, callback);
          }
        }
      }
    };
    
    return api;
  })();
  
  // For backward compatibility, also expose chrome-like API
  if (isFirefox && !window.chrome) {
    window.chrome = window.browserAPI;
  }
  
})();