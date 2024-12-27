// ฟังก์ชันหลักในการป้องกันการจับภาพหน้าจอ
function preventScreenCapture() {
    // ป้องกันการใช้งาน getDisplayMedia
    navigator.mediaDevices.getDisplayMedia = function() {
        alert("ไม่สามารถจับภาพหน้าจอได้!");
        return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
    };

    // ป้องกันการใช้งาน getUserMedia
    if (navigator.getUserMedia) {
        navigator.getUserMedia = function() {
            alert("การจับภาพหน้าจอไม่สามารถใช้งานได้!");
            return Promise.reject("ถูกป้องกัน");
        };
    }

    // ป้องกันการใช้งาน PrintScreen และ F12
    document.addEventListener('keydown', function(event) {
        if (event.key === "PrintScreen" || event.key === "F12") {
            alert('การจับภาพหน้าจอถูกจำกัด!');
            event.preventDefault();
        }
    });

    // ตรวจจับการใช้งาน screen capture ของ third-party logger
    window.addEventListener('beforeprint', function(event) {
        alert('การพิมพ์หรือจับภาพหน้าจอไม่สามารถใช้งานได้!');
        event.preventDefault();
    });

    // ตรวจจับการใช้ screen.capture ของ third-party logger
    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            if (constraints && constraints.video && constraints.video.mediaSource === 'screen') {
                alert("ไม่สามารถจับภาพหน้าจอได้!");
                return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
            }
            return navigator.mediaDevices.getUserMedia(constraints);
        };
    }
}

// เรียกใช้งานฟังก์ชันเพื่อป้องกันการจับภาพหน้าจอ
preventScreenCapture();

// ส่วนที่มีอยู่แล้วใน background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log("Virtual Keyboard Extension Installed");

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/18561/18561183.png',
        title: 'Virtual Keyboard Installed',
        message: 'The virtual keyboard extension was successfully installed.'
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getTabInfo") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                sendResponse({ tabId: activeTab.id, url: activeTab.url });
            });
            return true; // Keep the message channel open for sendResponse
        } else if (request.action === "typeKey" || request.action === "backspace" || request.action === "enter") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, request, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                    } else {
                        sendResponse(response);
                    }
                });
            });
            return true; // Keep the message channel open for sendResponse
        } else if (request.action === "saveState") {
            chrome.storage.local.set({ keyboardState: request.state }, () => {
                sendResponse({ success: true });
            });
            return true; // Keep the message channel open for sendResponse
        } else if (request.action === "getState") {
            chrome.storage.local.get(['keyboardState'], (result) => {
                sendResponse(result.keyboardState);
            });
            return true; // Keep the message channel open for sendResponse
        } else if (request.action === "createBookmark") {
            chrome.bookmarks.create({
                title: request.title,
                url: request.url
            }, (newBookmark) => {
                sendResponse({ success: true, bookmark: newBookmark });
            });
            return true; // Keep the message channel open for sendResponse
        }
    });
});