document.addEventListener("DOMContentLoaded", function () {
  const keyboard = document.getElementById("keyboard");
  const layoutSelect = document.getElementById("layout-select");
  let shiftActive = false;
  let capsLockActive = false;
  let isDragging = false;
  let offsetX, offsetY;
  let currentLayout = "english-keyboard";

  const specialKeys = {
    Backspace: () => sendMessageToActiveTab("backspace"),
    Tab: () => sendMessageToActiveTab("\t"),
    Caps: () => toggleCapsLock(),
    Enter: () => sendMessageToActiveTab("\n"),
    Shift: () => toggleShift(),
    Space: () => sendMessageToActiveTab(" "),
    Ctrl: () => {},
    Win: () => {},
    Alt: () => {},
  };

  const layout = {
    "english-keyboard": [
      ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
      ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
      ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "enter"],
      ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
      [" "],
    ],
    "english-scrambled": [
      ["Tab","q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "Backspace"],
      ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "enter"],
      ["Shift", "z", "x", "c", "v", "b", "n", "m", "Shift"],
      [" "],
    ],
    "numpad-keyboard": [
      ["+", "-", "*", "/"],
      ["1", "2", "3", "%"],
      ["4", "5", "6", "."],
      ["7", "8", "9", "="],
      ["00", "0", "Backspace"],
    ],
    "scrambled-keyboard": [
      ["+", "-", "*", "/"],
      ["1", "2", "3", "%"],
      ["4", "5", "6", "."],
      ["7", "8", "9", "="],
      ["00", "0", "Backspace"],
    ],
    "Thai-keyboard": [
      ["_", "ๅ", "/", "-", "ภ", "ถ", "ุ", "ึ", "ค", "ต", "จ", "ข", "ช", "Backspace"],
      ["Tab", "ๆ", "ไ", "ำ", "พ", "ะ", "ั", "ี", "ร", "น", "ย", "บ", "ล", "ฃ"],
      ["Caps", "ฟ", "ห", "ก", "ด", "เ", "้", "่", "า", "ส", "ว", "ง", "enter"],
      ["Shift", "ผ", "ป", "แ", "อ", "ิ", "ื", "ท", "ม", "ใ", "ฝ", "Shift"],
      [" "],
    ],
    "Thai-scrambled": [
      ["ก", "ข", "ฃ", "ค", "ฅ", "ฆ", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "Backspace"],
      ["ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด", "ต", "ถ", "ท", "ธ", "น"],
      ["บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร", "ฤ"], 
      ["ล", "ฦ", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ"],
      [" "],
    ],
  };

  createKeyboard(currentLayout);

  layoutSelect.addEventListener("change", function () {
    currentLayout = this.value;
    createKeyboard(currentLayout);
  });

  function createKeyboard(layoutName) {
    keyboard.innerHTML = "";
  
    layout[layoutName].forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "flex mb-2";
      row.forEach((key) => {
        const keyButton = document.createElement("button");
        keyButton.className =
          "key bg-gray-200 p-2 m-1 rounded border border-gray-300 w-9";
        keyButton.textContent = key;
        if (key === " ") {
          keyButton.classList.add("w-80");
          keyButton.style.height = "30px";
        }
        if (
          ["Backspace", "Tab", "Enter", "Shift", "Ctrl", "Alt", "Caps", "enter", "shift"].includes(key)
        ) {
          keyButton.classList.add("w-28");
        }
  
        keyButton.dataset.key = key;
        keyButton.onclick = () => handleKeyPress(keyButton); // ส่ง element แทน string
        rowDiv.appendChild(keyButton);
      });
      keyboard.appendChild(rowDiv);
    });
  
    if (layoutName === "scrambled-keyboard") {
      scrambleKeyboard();
    }
  
    if (layoutName === "english-scrambled") {
      scrambleEnglishKeys();
    }

    if (layoutName === "Thai-scrambled") {
      scrambleThaiKeys();
    }
  
    keyboard.addEventListener("mousedown", function (e) {
      isDragging = true;
      offsetX = e.clientX - keyboard.getBoundingClientRect().left;
      offsetY = e.clientY - keyboard.getBoundingClientRect().top;
    });
  
    document.addEventListener("mouseup", function () {
      isDragging = false;
    });
  
    document.addEventListener("mousemove", function (e) {
      if (isDragging) {
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        keyboard.style.left = x + "px";
        keyboard.style.top = y + "px";
      }
    });
  }

  function handleKeyPress(keyButton) {
    const activeElement = document.activeElement;
    const key = keyButton.dataset.key; 
  
    if (specialKeys[key]) {
      specialKeys[key]();
    } else {
      let messageKey = key;
  
      if (shiftActive) {
        messageKey = messageKey.toUpperCase();
        toggleShift();
      } else if (capsLockActive) {
        messageKey = messageKey.toUpperCase();
      } else {
        messageKey = messageKey.toLowerCase();
      }
  
      if (key === "enter") {
        if (activeElement.tagName === "INPUT" && activeElement.type === "search") {
          activeElement.form.submit();
        } else {
          sendMessageToActiveTab("\n");
        }
      } else if (!["Backspace", "Win", "Alt", "Shift", "Ctrl"].includes(key)) {
        sendMessageToActiveTab(messageKey);
        // sendInputToServer(messageKey);
      }
    }
  }  

  function sendMessageToActiveTab(messageKey) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
            var encryptedMessage = sendInputToServer(messageKey);  // Capture the encrypted message
            console.log("Sending message to tab:", tabs[0].id, encryptedMessage);
            chrome.tabs.sendMessage(
                tabs[0].id,
                {
                    action: messageKey === "backspace" ? "backspace" : "typeKey",
                    key: messageKey,
                    encryptedKey: encryptedMessage 
                }
            );
        } else {
            console.warn("No active tab found.");
        }
    });
  }

  function generateSecureKey() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(array)); 
}

  function sendInputToServer(messageKey) {
      var encryptionKey = generateSecureKey(); 
      var encryptedMessage = CryptoJS.AES.encrypt(messageKey, encryptionKey, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();
      console.log("Encrypted Message:", encryptedMessage);
      return encryptedMessage;
  }

  function toggleCapsLock() {
    capsLockActive = !capsLockActive;
    const capsKey = document.querySelector('.key[data-key="Caps"]');
    capsKey.classList.toggle("active", capsLockActive);
    capsKey.classList.toggle("bg-gray-400", capsLockActive);
  
    document.querySelectorAll(".key").forEach((key) => {
      if (key.dataset.key.length === 1 && /[a-zA-Zก-๙]/.test(key.dataset.key)) {
        key.textContent = capsLockActive
          ? key.dataset.key.toUpperCase()
          : key.dataset.key.toLowerCase();
      }
    });

    const keyboardKeys = document.querySelectorAll(".key:not([data-key='Shift'])");
    keyboardKeys.forEach((key) => {
      const currentChar = key.textContent.trim();
      if (capsLockActive && currentLayout === "Thai-keyboard" && ThaiAlphabetShift[currentChar]) {
        key.textContent = ThaiAlphabetShift[currentChar];
        key.dataset.key = ThaiAlphabetShift[currentChar];
      } else if (!capsLockActive && currentLayout === "Thai-keyboard" && Object.values(ThaiAlphabetShift).includes(currentChar)) {
        const originalKey = Object.keys(ThaiAlphabetShift).find(key => ThaiAlphabetShift[key] === currentChar);
        if (originalKey) {
          key.textContent = originalKey;
          key.dataset.key = originalKey;
        }
      }
    });
  }
  
  function toggleShift() {
    shiftActive = !shiftActive;
    document.querySelectorAll('.key[data-key="Shift"]').forEach((key) => {
      key.classList.toggle("active", shiftActive);
      key.classList.toggle("bg-gray-400", shiftActive);
    });
  
    document.querySelectorAll(".key").forEach((key) => {
      if (key.dataset.key.length === 1 && /[a-zA-Zก-๙]/.test(key.dataset.key)) {
        key.textContent = shiftActive
          ? key.dataset.key.toUpperCase()
          : key.dataset.key.toLowerCase();
      }
    });

    const keyboardKeys = document.querySelectorAll(".key:not([data-key='Shift'])");
    keyboardKeys.forEach((key) => {
      const currentChar = key.textContent.trim();
      if (shiftActive && currentLayout === "Thai-keyboard" && ThaiAlphabetShift[currentChar]) {
        key.textContent = ThaiAlphabetShift[currentChar];
        key.dataset.key = ThaiAlphabetShift[currentChar];
      } else if (!shiftActive && currentLayout === "Thai-keyboard" && Object.values(ThaiAlphabetShift).includes(currentChar)) {
        // เปลี่ยนกลับเมื่อปิด Shift
        const originalKey = Object.keys(ThaiAlphabetShift).find(key => ThaiAlphabetShift[key] === currentChar);
        if (originalKey) {
          key.textContent = originalKey;
          key.dataset.key = originalKey;
        }
      }
    });
  }
  
  const ThaiAlphabetShift = {
    "_":"%", "ๅ":"+", "/":"๑", "-":"๒", "ภ":"๓", "ถ":"๔", "ุ":"ู", "ึ":"฿", "ค":"๕",    
    "ต":"๖", "จ":"๗", "ข":"๘", "ช":"๙", "ๆ":"๐", "ไ":"\"", "ำ":"ฎ", "พ":"ฑ", "ะ":"ธ",    
    "ั":"ํ",  "ี":"๋", "ร":"ณ", "น":"ฯ", "ย":"ญ", "บ":"ฐ", "ล":",", "ฃ":"ฅ", "ฟ":"ฤ", "ห":"ฆ",    
    "ก":"ฏ", "ด":"โ", "เ":"ฌ", "้":"็", "่":"๋", "า":"ษ", "ส":"ศ", "ว":"ซ", "ง":".", "ผ":"(", "ป":")",    
    "แ":"ฉ", "อ":"ฮ", "ิ":"ฺ", "ื":"์", "ท":"?", "ม":"ฒ", "ใ":"ฬ", "ฝ":"ฦ"
  };

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function scrambleKeyboard() {
    const keys = document.querySelectorAll(".key:not([data-key=Backspace]):not([data-key='+']):not([data-key='-']):not([data-key='*']):not([data-key='/']):not([data-key='%']):not([data-key='=']):not([data-key='.']):not([data-key='00'])");
    const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    shuffleArray(numbers);
    keys.forEach((key, index) => {
        key.textContent = numbers[index];
        key.dataset.key = numbers[index];
    });
  }

  function scrambleEnglishKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Caps']):not([data-key='Shift']):not([data-key='enter']):not([data-key='Tab'])"
    );
    const englishAlphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    shuffleArray(englishAlphabet);
    keys.forEach((key, index) => {
      key.textContent = englishAlphabet[index];
      key.dataset.key = englishAlphabet[index];
    });
  }

  function scrambleThaiKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Caps']):not([data-key='Shift']):not([data-key='enter'])"
    );
    const ThaiAlphabet = "กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮ".split("");
    shuffleArray(ThaiAlphabet);
    keys.forEach((key, index) => {
      key.textContent = ThaiAlphabet[index];
      key.dataset.key = ThaiAlphabet[index];
    });
  }
});
// ฟังก์ชันหลักในการป้องกันการจับภาพหน้าจอ
function preventScreenCapture() {
    // ป้องกันการใช้งาน getDisplayMedia
    navigator.mediaDevices.getDisplayMedia = function () {
        showBlackScreen(true);
        return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
    };

    // ป้องกันการใช้งาน getUserMedia
    if (navigator.getUserMedia) {
        navigator.getUserMedia = function () {
            showBlackScreen(true);
            return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
        };
    }

    // ป้องกันการใช้งาน PrintScreen และ F12 พร้อมแจ้งเตือน
    document.addEventListener('keyup', function (event) {
        console.log('Key pressed:', event.key); // บันทึกการกดปุ่มลงใน Console
        if (event.key === "PrintScreen" || event.key === "F12") {
            showBlackScreen(true);
            console.log('Screen capture attempt detected!');
            event.preventDefault();
        }
    });

    // ตรวจจับการใช้งาน screen capture ของ third-party logger พร้อมแจ้งเตือน
    window.addEventListener('beforeprint', function (event) {
        showBlackScreen(true);
        console.log('Screen capture attempt detected!');
        event.preventDefault();
    });

    // ตรวจจับการใช้ screen.capture ของ third-party logger พร้อมแจ้งเตือน
    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = function (constraints) {
            if (constraints && constraints.video && constraints.video.mediaSource === 'screen') {
                showBlackScreen(true);
                console.log('Screen capture attempt detected!');
                return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
            }
            return navigator.mediaDevices.getUserMedia(constraints);
        };
    }
}

// ฟังก์ชันเพื่อแสดงหน้าจอสีดำ
function showBlackScreen(autoClose = false) {
    const blackScreen = document.createElement('div');
    blackScreen.style.position = 'fixed';
    blackScreen.style.zIndex = '10000';
    blackScreen.style.left = '0';
    blackScreen.style.top = '0';
    blackScreen.style.width = '100%';
    blackScreen.style.height = '100%';
    blackScreen.style.backgroundColor = 'black';

    const button = document.createElement('button');
    button.textContent = 'Close';
    button.style.position = 'absolute';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.padding = '10px';
    button.style.backgroundColor = 'red';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        blackScreen.remove();
    });
    blackScreen.appendChild(button);

    document.body.appendChild(blackScreen);

    // เรียก Fullscreen API เพื่อทำให้ blackScreen เต็มหน้าจอ
    if (blackScreen.requestFullscreen) {
        blackScreen.requestFullscreen();
    } else if (blackScreen.mozRequestFullScreen) { // Firefox
        blackScreen.mozRequestFullScreen();
    } else if (blackScreen.webkitRequestFullscreen) { // Chrome, Safari and Opera
        blackScreen.webkitRequestFullscreen();
    } else if (blackScreen.msRequestFullscreen) { // IE/Edge
        blackScreen.msRequestFullscreen();
    }

    // ปิด blackScreen อัตโนมัติหลังจาก 3 วินาที (3000 มิลลิวินาที) ถ้า autoClose เป็น true
    if (autoClose) {
        setTimeout(() => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            blackScreen.remove();
        }, 3000); // สามารถปรับเวลาได้ตามที่ต้องการ
    }
}

// เรียกใช้งานฟังก์ชันเพื่อป้องกันการจับภาพหน้าจอ
preventScreenCapture();
