document.addEventListener("DOMContentLoaded", function () {
  document.body.innerHTML = `
    <div class="bgC rounded" id="content">
      <div class="bgC flex items-center justify-center p-1">
        <select id="layout-select" class="p-1 border border-gray-300 rounded">
          <option value="full" selected>Full keyboard</option>
          <option value="english-keyboard">English Keyboard</option>
          <option value="english-scrambled">English Scrambled</option>
          <option value="Thai-keyboard">Thai Keyboard</option>
          <option value="Thai-scrambled">Thai Scrambled</option>
          <option value="numpad-keyboard">Numpad Keyboard</option>
          <option value="scrambled-keyboard">Scrambled Keyboard</option>
        </select>
        
      </div>
      <div id="keyboard" class="bgC p-1 rounded" tabindex="-1" aria-hidden="true"></div>
    </div>
  `;
  const keyboard = document.getElementById("keyboard");
  const layoutSelect = document.getElementById("layout-select");
  let shiftActive = false;
  let capsLockActive = false;
  let currentLayout = "full";

  const specialKeys = {
    Backspace: () => sendMessageToActiveTab("backspace"),
    "Tab ↹": () => sendMessageToActiveTab("\t"),
    "Caps 🄰": () => toggleCapsLock(),
    Enter: () => sendMessageToActiveTab("Enter"),
    "Shift ⇧": () => toggleShift(),
    Space: () => sendMessageToActiveTab(" "),
    Ctrl: () => {},
    Esc: () => {},
    F1: () => {},
    F2: () => {},
    F3: () => {},
    F4: () => {},
    F5: () => {},
    F6: () => {},
    F7: () => {},
    F8: () => {},
    F9: () => {},
    F10: () => {},
    F11: () => {},
    F12: () => {},
  };

  const layout = {
    full: [
      [
        "Esc",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
        "DEL⌦",
        "HOME",
        "END",
      ],
      [
        "`",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "0",
        "-",
        "=",
        "Backspace",
      ].concat(["+", "-", "*", "/"]),
      [
        "Tab ↹",
        "q",
        "w",
        "e",
        "r",
        "t",
        "y",
        "u",
        "i",
        "o",
        "p",
        "[",
        "]",
        "\\",
      ].concat(["7", "8", "9", "%"]),
      [
        "Caps 🄰",
        "a",
        "s",
        "d",
        "f",
        "g",
        "h",
        "j",
        "k",
        "l",
        ";",
        "'",
        "Enter",
      ].concat(["4", "5", "6", "_"]),
      [
        "Shift ⇧",
        "z",
        "x",
        "c",
        "v",
        "b",
        "n",
        "m",
        ",",
        ".",
        "/",
        "Shift ⇧",
        "↑",
      ].concat(["1", "2", "3", "="]),
      ["Space", "←", "↓", "→"].concat(["0", "."]),
    ],
    "english-keyboard": [
      [
        "`",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "0",
        "-",
        "=",
        "Backspace",
      ],
      [
        "Tab ↹",
        "q",
        "w",
        "e",
        "r",
        "t",
        "y",
        "u",
        "i",
        "o",
        "p",
        "[",
        "]",
        "\\",
      ],
      [
        "Caps 🄰",
        "a",
        "s",
        "d",
        "f",
        "g",
        "h",
        "j",
        "k",
        "l",
        ";",
        "'",
        "Enter",
      ],
      ["Shift ⇧", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift ⇧"],
      ["Space"],
    ],
    "english-scrambled": [
      ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "="],
      ["Tab ↹", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "Backspace"],
      ["Caps 🄰", "a", "s", "d", "f", "g", "h", "j", "k", "l", "Enter"],
      ["Shift ⇧", "z", "x", "c", "v", "b", "n", "m", "Shift ⇧"],
      ["Space"],
    ],
    "numpad-keyboard": [
      ["+", "-", "*", "/"],
      ["1", "2", "3", "%"],
      ["4", "5", "6", "_"],
      ["7", "8", "9", "."],
      ["(", "0", ")", "="],
      ["Backspace"],
    ],
    "scrambled-keyboard": [
      ["+", "-", "*", "/"],
      ["1", "2", "3", "%"],
      ["4", "5", "6", "."],
      ["7", "8", "9", "="],
      ["(", "0", ")", "Backspace"],
    ],
    "Thai-keyboard": [
      [
        "_",
        "ๅ",
        "/",
        "-",
        "ภ",
        "ถ",
        "ุ",
        "ึ",
        "ค",
        "ต",
        "จ",
        "ข",
        "ช",
        "Backspace",
      ],
      [
        "Tab ↹",
        "ๆ",
        "ไ",
        "ำ",
        "พ",
        "ะ",
        "ั",
        "ี",
        "ร",
        "น",
        "ย",
        "บ",
        "ล",
        "ฃ",
      ],
      [
        "Caps 🄰",
        "ฟ",
        "ห",
        "ก",
        "ด",
        "เ",
        "้",
        "่",
        "า",
        "ส",
        "ว",
        "ง",
        "Enter",
      ],
      ["Shift ⇧", "ผ", "ป", "แ", "อ", "ิ", "ื", "ท", "ม", "ใ", "ฝ", "Shift ⇧"],
      ["Space"],
    ],
    "Thai-scrambled": [
      ["ก", "ข", "ฃ", "ค", "ฅ", "ฆ", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "Backspace"],
      ["ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด", "ต", "ถ", "ท", "ธ", "น"],
      ["บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร", "ฤ", "Enter"],
      ["ล", "ฦ", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ"],
      ["Space"],
    ],
  };

  createKeyboard(currentLayout);

  layoutSelect.addEventListener("change", function () {
    currentLayout = this.value;
    createKeyboard(currentLayout);
  });

  function updateKeyboard() {
    var select = document.getElementById("layout-select");
    var keyboardDiv = document.getElementById("keyboard");

    // อัปเดต class ด้วยชื่อ layout ที่เลือก
    var selectedLayout = select.value;
    keyboardDiv.className = `p-1 rounded ${selectedLayout}`;
    keyboardDiv.innerHTML = select.options[select.selectedIndex].text;
  }

  function createKeyboard(layoutName) {
    const keyboard = document.getElementById("keyboard");
    const layoutSelect = document.getElementById("layout-select");

    // อัปเดต class ด้วยชื่อ layout ที่เลือก
    keyboard.className = `p-1 rounded ${layoutSelect.value}`;

    keyboard.innerHTML = ""; // Clear existing keys

    layout[layoutName].forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = `flex`;
      row.forEach((key, index) => {
        const keyButton = document.createElement("button");
        keyButton.className = "key p-2 m-1 rounded border border-gray-300";
        keyButton.textContent = key;

        if (index >= row.length - 4) {
          keyButton.classList = "key p-2 m-1 rounded border border-gray-300 concat-keys";
        }

        if (key === "backspace" || key === "Backspace") {
          keyButton.innerHTML = '<i class="fa fa-backspace"></i>';
        }

        if (
          [
            "Backspace",
            "Tab ↹",
            "Enter",
            "Shift ⇧",
            "Ctrl",
            "Alt",
            "Caps 🄰",
            "Space",
          ].includes(key)
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
        messageKey = messageKey.toUpperCase() || toggleCapsLock();
      } else {
        messageKey = messageKey.toLowerCase();
      }

      if (key === "Enter") {
        if (
          activeElement.tagName === "INPUT" ||
          activeElement.type === "text"
        ) {
          if (activeElement.form) {
            activeElement.form.submit();
          }
        } else {
          sendMessageToActiveTab("\n");
        }
      } else if (
        !["Backspace", "Win", "Alt", "Shift ⇧", "Ctrl"].includes(key)
      ) {
        sendMessageToActiveTab(messageKey);
      }
    }
  }

  function sendMessageToActiveTab(messageKey) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        var encryptedMessage = sendInputToServer(messageKey);
        // console.log("Sending message to tab:", tabs[0].id, encryptedMessage);
        chrome.tabs.sendMessage(tabs[0].id, {
          action:
            messageKey === "backspace"
              ? "backspace"
              : messageKey === "Enter"
              ? "Enter"
              : messageKey === "esc"
              ? "esc"
              : messageKey === "del⌦"
              ? "del⌦"
              : messageKey === "home"
              ? "home"
              : messageKey === "end"
              ? "end"
              : "typeKey",
          key: messageKey,
          encryptedKey: encryptedMessage,
        });
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
    // console.log("Encrypted Message:", encryptedMessage);
    return encryptedMessage;
  }

  function toggleCapsLock() {
    capsLockActive = !capsLockActive;
    document.querySelectorAll('.key[data-key="Caps 🄰"]').forEach((key) => {
      key.classList.toggle("active", capsLockActive);
    });

    document.querySelectorAll(".key").forEach((key) => {
      if (key.dataset.key.length === 1 && /[a-zA-Zก-๙]/.test(key.dataset.key)) {
        key.textContent = capsLockActive
          ? key.dataset.key.toUpperCase()
          : key.dataset.key.toLowerCase();
      }
    });

    const keyboardKeys = document.querySelectorAll(
      ".key:not([data-key='Caps 🄰'])"
    );
    keyboardKeys.forEach((key) => {
      const currentChar = key.textContent.trim();
      if (
        capsLockActive &&
        currentLayout === "Thai-keyboard" &&
        ThaiAlphabetShift[currentChar]
      ) {
        key.textContent = ThaiAlphabetShift[currentChar];
        key.dataset.key = ThaiAlphabetShift[currentChar];
      } else if (
        !capsLockActive &&
        currentLayout === "Thai-keyboard" &&
        Object.values(ThaiAlphabetShift).includes(currentChar)
      ) {
        const originalKey = Object.keys(ThaiAlphabetShift).find(
          (key) => ThaiAlphabetShift[key] === currentChar
        );
        if (originalKey) {
          key.textContent = originalKey;
          key.dataset.key = originalKey;
        }
      }

      if (
        capsLockActive &&
        (currentLayout === "english-keyboard" ||
          currentLayout === "english-scrambled")
      ) {
        if (EngAlphabetShift[key.dataset.key]) {
          key.textContent = EngAlphabetShift[key.dataset.key];
          key.dataset.key = EngAlphabetShift[key.dataset.key];
        }
      } else if (
        !capsLockActive &&
        (currentLayout === "english-keyboard" ||
          currentLayout === "english-scrambled")
      ) {
        if (Object.values(EngAlphabetShift).includes(currentChar)) {
          const originalKey = Object.keys(EngAlphabetShift).find(
            (key) => EngAlphabetShift[key] === currentChar
          );
          if (originalKey) {
            key.textContent = originalKey;
            key.dataset.key = originalKey;
          }
        }
      }
    });
  }

  function toggleShift() {
    if (capsLockActive) {
      return toggleCapsLock();
    }

    shiftActive = !shiftActive;
    document.querySelectorAll('.key[data-key="Shift ⇧"]').forEach((key) => {
      key.classList.toggle("active", shiftActive);
    });

    document.querySelectorAll(".key").forEach((key) => {
      if (key.dataset.key.length === 1 && /[a-zA-Zก-๙]/.test(key.dataset.key)) {
        key.textContent = shiftActive
          ? key.dataset.key.toUpperCase()
          : key.dataset.key.toLowerCase();
      }
    });

    const keyboardKeys = document.querySelectorAll(
      ".key:not([data-key='Shift ⇧'])"
    );
    keyboardKeys.forEach((key) => {
      const currentChar = key.textContent.trim();
      if (
        shiftActive &&
        currentLayout === "Thai-keyboard" &&
        ThaiAlphabetShift[currentChar]
      ) {
        key.textContent = ThaiAlphabetShift[currentChar];
        key.dataset.key = ThaiAlphabetShift[currentChar];
      } else if (
        !shiftActive &&
        currentLayout === "Thai-keyboard" &&
        Object.values(ThaiAlphabetShift).includes(currentChar)
      ) {
        const originalKey = Object.keys(ThaiAlphabetShift).find(
          (key) => ThaiAlphabetShift[key] === currentChar
        );
        if (originalKey) {
          key.textContent = originalKey;
          key.dataset.key = originalKey;
        }
      }

      if (
        shiftActive &&
        (currentLayout === "english-keyboard" ||
          currentLayout === "english-scrambled")
      ) {
        if (EngAlphabetShift[key.dataset.key]) {
          key.textContent = EngAlphabetShift[key.dataset.key];
          key.dataset.key = EngAlphabetShift[key.dataset.key];
        }
      } else if (
        !shiftActive &&
        (currentLayout === "english-keyboard" ||
          currentLayout === "english-scrambled")
      ) {
        if (Object.values(EngAlphabetShift).includes(currentChar)) {
          const originalKey = Object.keys(EngAlphabetShift).find(
            (key) => EngAlphabetShift[key] === currentChar
          );
          if (originalKey) {
            key.textContent = originalKey;
            key.dataset.key = originalKey;
          }
        }
      }
    });
  }

  const EngAlphabetShift = {
    "`": "~",
    1: "!",
    2: "@",
    3: "#",
    4: "$",
    5: "%",
    6: "^",
    7: "&",
    8: "*",
    9: "(",
    0: ")",
    "-": "_",
    "=": "+",
    "[": "{",
    "]": "}",
    "\\": "|",
    ";": ":",
    "'": '"',
    ",": "<",
    ".": ">",
    "/": "?",
  };

  const ThaiAlphabetShift = {
    _: "%",
    ๅ: "+",
    "/": "๑",
    "-": "๒",
    ภ: "๓",
    ถ: "๔",
    "ุ": "ู",
    "ึ": "฿",
    ค: "๕",
    ต: "๖",
    จ: "๗",
    ข: "๘",
    ช: "๙",
    ๆ: "๐",
    ไ: '"',
    ำ: "ฎ",
    พ: "ฑ",
    ะ: "ธ",
    "ั": "ํ",
    "ี": "๋",
    ร: "ณ",
    น: "ฯ",
    ย: "ญ",
    บ: "ฐ",
    ล: ",",
    ฃ: "ฅ",
    ฟ: "ฤ",
    ห: "ฆ",
    ก: "ฏ",
    ด: "โ",
    เ: "ฌ",
    "้": "็",
    "่": "๋",
    า: "ษ",
    ส: "ศ",
    ว: "ซ",
    ง: ".",
    ผ: "(",
    ป: ")",
    แ: "ฉ",
    อ: "ฮ",
    "ิ": "ฺ",
    "ื": "์",
    ท: "?",
    ม: "ฒ",
    ใ: "ฬ",
    ฝ: "ฦ",
  };

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function scrambleKeyboard() {
    const keys = document.querySelectorAll(
      ".key:not([data-key=Backspace]):not([data-key='+']):not([data-key='-']):not([data-key='*']):not([data-key='/']):not([data-key='%']):not([data-key='=']):not([data-key='.']):not([data-key='(']):not([data-key=')'])"
    );
    const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    shuffleArray(numbers);
    keys.forEach((key, index) => {
      key.textContent = numbers[index];
      key.dataset.key = numbers[index];
    });
  }

  function scrambleEnglishKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹']):not([data-key='`']):not([data-key='1']):not([data-key='2']):not([data-key='3']):not([data-key='4']):not([data-key='5']):not([data-key='6']):not([data-key='7']):not([data-key='8']):not([data-key='9']):not([data-key='0']):not([data-key='-']):not([data-key='+']):not([data-key='=']):not([data-key='-']):not([data-key='+']):not([data-key='=']):not([data-key='~']):not([data-key='!']):not([data-key='@']):not([data-key='#']):not([data-key='$']):not([data-key='%']):not([data-key='^']):not([data-key='&']):not([data-key='*']):not([data-key='(']):not([data-key=')']):not([data-key='_'])"
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
      ".key:not([data-key='Backspace']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter'])"
    );
    const ThaiAlphabet = "กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮ".split(
      ""
    );
    shuffleArray(ThaiAlphabet);
    keys.forEach((key, index) => {
      key.textContent = ThaiAlphabet[index];
      key.dataset.key = ThaiAlphabet[index];
    });
  }
});

// //----------------
// // ฟังก์ชันหลักในการป้องกันการจับภาพหน้าจอ
// function preventScreenCapture() {
//     // ป้องกันการใช้งาน getDisplayMedia
//     navigator.mediaDevices.getDisplayMedia = function () {
//         showBlackScreen(true);
//         return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
//     };

//     // ป้องกันการใช้งาน getUserMedia
//     if (navigator.getUserMedia) {
//         navigator.getUserMedia = function () {
//             showBlackScreen(true);
//             return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
//         };
//     }

//     // ป้องกันการใช้งาน PrintScreen และ F12 พร้อมแจ้งเตือน
//     document.addEventListener('keyup', function (event) {
//         console.log('Key pressed:', event.key); // บันทึกการกดปุ่มลงใน Console
//         if (event.key === "PrintScreen" || event.key === "F12") {
//             showBlackScreen(true);
//             console.log('Screen capture attempt detected!');
//             event.preventDefault();
//         }
//     });

//     // ตรวจจับการใช้งาน screen capture ของ third-party logger พร้อมแจ้งเตือน
//     window.addEventListener('beforeprint', function (event) {
//         showBlackScreen(true);
//         console.log('Screen capture attempt detected!');
//         event.preventDefault();
//     });

//     // ตรวจจับการใช้ screen.capture ของ third-party logger พร้อมแจ้งเตือน
//     if (navigator.mediaDevices) {
//         navigator.mediaDevices.getUserMedia = function (constraints) {
//             if (constraints && constraints.video && constraints.video.mediaSource === 'screen') {
//                 showBlackScreen(true);
//                 console.log('Screen capture attempt detected!');
//                 return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
//             }
//             return navigator.mediaDevices.getUserMedia(constraints);
//         };
//     }
// }

// // ฟังก์ชันเพื่อแสดงหน้าจอสีดำ
// function showBlackScreen(autoClose = false) {
//     const blackScreen = document.createElement('div');
//     blackScreen.style.position = 'fixed';
//     blackScreen.style.zIndex = '10000';
//     blackScreen.style.left = '0';
//     blackScreen.style.top = '0';
//     blackScreen.style.width = '100%';
//     blackScreen.style.height = '100%';
//     blackScreen.style.backgroundColor = 'black';

//     const button = document.createElement('button');
//     button.textContent = 'Close';
//     button.style.position = 'absolute';
//     button.style.top = '10px';
//     button.style.right = '10px';
//     button.style.padding = '10px';
//     button.style.backgroundColor = 'red';
//     button.style.color = 'white';
//     button.style.border = 'none';
//     button.style.cursor = 'pointer';
//     button.addEventListener('click', () => {
//         if (document.fullscreenElement) {
//             document.exitFullscreen();
//         }
//         blackScreen.remove();
//     });
//     blackScreen.appendChild(button);

//     document.body.appendChild(blackScreen);

//     // เรียก Fullscreen API เพื่อทำให้ blackScreen เต็มหน้าจอ
//     if (blackScreen.requestFullscreen) {
//         blackScreen.requestFullscreen();
//     } else if (blackScreen.mozRequestFullScreen) { // Firefox
//         blackScreen.mozRequestFullScreen();
//     } else if (blackScreen.webkitRequestFullscreen) { // Chrome, Safari and Opera
//         blackScreen.webkitRequestFullscreen();
//     } else if (blackScreen.msRequestFullscreen) { // IE/Edge
//         blackScreen.msRequestFullscreen();
//     }

//     // ปิด blackScreen อัตโนมัติหลังจาก 3 วินาที (3000 มิลลิวินาที) ถ้า autoClose เป็น true
//     if (autoClose) {
//         setTimeout(() => {
//             if (document.fullscreenElement) {
//                 document.exitFullscreen();
//             }
//             blackScreen.remove();
//         }, 3000); // สามารถปรับเวลาได้ตามที่ต้องการ
//     }
// }

// // เรียกใช้งานฟังก์ชันเพื่อป้องกันการจับภาพหน้าจอ
// preventScreenCapture();
