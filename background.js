// ฟังก์ชันหลักในการป้องกันการจับภาพหน้าจอและแจ้งเตือน
function preventScreenCapture() {
    // ป้องกันการใช้งาน getDisplayMedia
    navigator.mediaDevices.getDisplayMedia = function() {
        showNotification("ไม่สามารถจับภาพหน้าจอได้!", "การจับภาพหน้าจอถูกป้องกัน");
        return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
    };

    // ป้องกันการใช้งาน getUserMedia
    if (navigator.getUserMedia) {
        navigator.getUserMedia = function() {
            showNotification("การจับภาพหน้าจอไม่สามารถใช้งานได้!", "การจับภาพหน้าจอถูกป้องกัน");
            return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
        };
    }

    // ป้องกันการใช้งาน PrintScreen และ F12 พร้อมแจ้งเตือน
    document.addEventListener('keydown', function(event) {
        if (event.key === "PrintScreen" || event.key === "F12") {
            showNotification('การจับภาพหน้าจอถูกจำกัด!', 'การจับภาพหน้าจอถูกตรวจพบ!');
            console.log('Screen capture attempt detected!');
            event.preventDefault();
        }
    });

    // ตรวจจับการใช้งาน screen capture ของ third-party logger พร้อมแจ้งเตือน
    window.addEventListener('beforeprint', function(event) {
        showNotification('การพิมพ์หรือจับภาพหน้าจอไม่สามารถใช้งานได้!', 'การจับภาพหน้าจอถูกตรวจพบ!');
        console.log('Screen capture attempt detected!');
        event.preventDefault();
    });

    // ตรวจจับการใช้ screen.capture ของ third-party logger พร้อมแจ้งเตือน
    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            if (constraints && constraints.video && constraints.video.mediaSource === 'screen') {
                showNotification("ไม่สามารถจับภาพหน้าจอได้!", "การจับภาพหน้าจอถูกตรวจพบ!");
                console.log('Screen capture attempt detected!');
                return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
            }
            return navigator.mediaDevices.getUserMedia(constraints);
        };
    }
}

// ฟังก์ชันแสดงการแจ้งเตือน
function showNotification(title, message) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body: message });
            }
        });
    }
}

// เรียกใช้งานฟังก์ชันเพื่อป้องกันการจับภาพหน้าจอ
preventScreenCapture();

// ฟังก์ชันหลักในการป้องกันการจับภาพหน้าจอในระดับ OS
function preventTaskLoggerCapture() {
    // Script to disable various screen capture tools (Windows)
    const shell = require('node-powershell');

    let ps = new shell({
        executionPolicy: 'Bypass',
        noProfile: true
    });

    ps.addCommand(`
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "DisableSnippingTool" -Value 1
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "DisableLockScreenCamera" -Value 1
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "IsGameDVR_Enabled" -Value 0
        Stop-Process -Name explorer -Force
        Start-Process explorer
    `);

    ps.invoke()
        .then(output => {
            console.log(output);
        })
        .catch(err => {
            console.log(err);
        })
        .finally(() => {
            ps.dispose();
        });
}

// เรียกใช้งานฟังก์ชันเพื่อป้องกันการจับภาพหน้าจอในระดับ OS
preventTaskLoggerCapture();

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
