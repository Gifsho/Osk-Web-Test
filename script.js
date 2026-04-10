document.addEventListener("DOMContentLoaded", function () {
  // Use browserAPI for cross-browser compatibility
  const api = window.browserAPI || chrome;

  document.body.innerHTML = `
    <div class="rounded">
      <div class="keyboard-header">
        <select id="layout-select">
          <option value="full" selected>Full keyboard</option>
          <option value="english-keyboard">English Keyboard</option>
          <option value="Thai-keyboard">Thai Keyboard</option>
          <option value="numpad-keyboard">Numpad Keyboard</option>
          <option value="symbols">Symbols Keyboard</option>
        </select>
      </div>
      <div id="keyboard"></div>
    </div>
  `;
  const layoutSelect = document.getElementById("layout-select");

  const EngAlphabetShift = { "`": "~", 1: "!", 2: "@", 3: "#", 4: "$", 5: "%", 6: "^", 7: "&", 8: "*", 9: "(", 0: ")", "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|", ";": ":", "'": '"', ",": "<", ".": ">", "/": "?", };
  const ThaiAlphabetShift = { _: "%", ๅ: "+", "/": "๑", "-": "๒", ภ: "๓", ถ: "๔", "ุ": "ู", "ึ": "฿", ค: "๕", ต: "๖", จ: "๗", ข: "๘", ช: "๙", ๆ: "๐", ไ: '"', ำ: "ฎ", พ: "ฑ", ะ: "ธ", "ั": "ํ", "ี": "๋", ร: "ณ", น: "ฯ", ย: "ญ", บ: "ฐ", ล: ",", ฃ: "ฅ", ฟ: "ฤ", ห: "ฆ", ก: "ฏ", ด: "โ", เ: "ฌ", "้": "็", "่": "๋", า: "ษ", ส: "ศ", ว: "ซ", ง: ".", ผ: "(", ป: ")", แ: "ฉ", อ: "ฮ", "ิ": "ฺ", "ื": "์", ท: "?", ม: "ฒ", ใ: "ฬ", ฝ: "ฦ" };
  let shiftActive = false;
  let capsLockActive = false;
  let currentLayout = "full";
  let isScrambled = false;
  let isNumpadScrambled = false;
  let isThaiScrambled = false;
  let isSymbolsScrambled = false;

  const SOSK_KEY_NAME = "soskKey";

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
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function storageGet(keys) {
    return new Promise((resolve) => api.storage.sync.get(keys, resolve));
  }

  function storageSet(obj) {
    return new Promise((resolve) => api.storage.sync.set(obj, resolve));
  }

  async function getOrCreateSoskKey() {
    const data = await storageGet([SOSK_KEY_NAME]);
    if (data && data[SOSK_KEY_NAME]) {
      return data[SOSK_KEY_NAME];
    }
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const keyB64 = arrayBufferToBase64(raw.buffer);
    await storageSet({ [SOSK_KEY_NAME]: keyB64 });
    return keyB64;
  }

  async function importKeyFromBase64(base64Key) {
    const keyData = base64ToArrayBuffer(base64Key);
    return crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
  }

  async function encryptText(plainText) {
    const keyB64 = await getOrCreateSoskKey();
    const cryptoKey = await importKeyFromBase64(keyB64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded);
    return { iv: arrayBufferToBase64(iv.buffer), data: arrayBufferToBase64(cipherBuffer) };
  }

  const specialKeys = {
    Backspace: () => sendMessageToActiveTab("backspace"),
    "Tab ↹": () => sendMessageToActiveTab("\t"),
    "Caps 🄰": () => toggleCapsLock(),
    Enter: () => sendMessageToActiveTab("Enter"),
    "Shift ⇧": () => toggleShift(),
    Space: () => sendMessageToActiveTab(" "),
    Ctrl: () => { },
    Esc: () => { },
    F1: () => { },
    F2: () => { },
    F3: () => { },
    F4: () => { },
    F5: () => { },
    F6: () => { },
    F7: () => { },
    F8: () => { },
    F9: () => { },
    F10: () => { },
    F11: () => { },
    F12: () => { },
    "↓": () => { },
    "↑": () => { },
    "←": () => sendMessageToActiveTab("←"),
    "→": () => sendMessageToActiveTab("→"),
  };

  const layout = {
    "full": [
      // [ "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "DEL⌦", "HOME", "END"],
      ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"].concat(["+", "-", "*", "/"]),
      ["Tab ↹", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"].concat(["7", "8", "9", "%"]),
      ["Caps 🄰", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"].concat(["4", "5", "6", "_"]),
      ["Shift ⇧", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift ⇧", "↑"].concat(["1", "2", "3", "="]),
      ["scr", " ", "←", "↓", "→"].concat(["0", "."]),
    ],
    "english-keyboard": [
      ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
      ["Tab ↹", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
      ["Caps 🄰", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
      ["Shift ⇧", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift ⇧"],
      ["scr", " "],
    ],
    "numpad-keyboard": [
      ["Scr", "+", "-", "*"],
      ["1", "2", "3", "/"],
      ["4", "5", "6", "%"],
      ["7", "8", "9", "."],
      ["(", "0", ")", "="],
      ["Backspace"],
    ],
    "Thai-keyboard": [
      ["_", "ๅ", "/", "-", "ภ", "ถ", "ุ", "ึ", "ค", "ต", "จ", "ข", "ช", "Backspace"],
      ["Tab ↹", "ๆ", "ไ", "ำ", "พ", "ะ", "ั", "ี", "ร", "น", "ย", "บ", "ล", "ฃ"],
      ["Caps 🄰", "ฟ", "ห", "ก", "ด", "เ", "้", "่", "า", "ส", "ว", "ง", "Enter"],
      ["Shift ⇧", "ผ", "ป", "แ", "อ", "ิ", "ื", "ท", "ม", "ใ", "ฝ", "Shift ⇧"],
      ["scr", " "],
    ],
    "symbols": [
      ['Scr', '@', '#', '$', '%', '^', '&', '*'],
      ['(', ')', '_', '+', '~', '`', '{', '}'],
      ['|', '\\', ':', '!', "'", '<', '>', '?'],
      ['/', '[', ']', '±', '§', '¶', '€', '£'],
      ['¥', '¢', '©', '®', '™', '℅', '‰', '†'],
      ["Backspace"]
    ]
  };

  createKeyboard(currentLayout);

  let _resizeTimer = null;
  let _lastReportedW = 0;
  let _lastReportedH = 0;

  function postIframeSize() {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      try {
        // body has `width: max-content; height: max-content` in styles.css
        // so scrollWidth/scrollHeight = the TRUE intrinsic content dimensions,
        // not constrained by the current iframe viewport.
        const w = document.body.scrollWidth;
        const h = document.body.scrollHeight;

        // Only send if size actually changed – prevents resize feedback loops
        if (w === _lastReportedW && h === _lastReportedH) return;
        _lastReportedW = w;
        _lastReportedH = h;

        window.parent.postMessage({ type: "sosk:resize", width: w, height: h }, "*");
      } catch (e) {
        // Ignore cross-origin / postMessage errors silently
      }
    }, 40);
  }

  window.addEventListener("load", () => requestAnimationFrame(postIframeSize));
  window.addEventListener("resize", () => requestAnimationFrame(postIframeSize));

  layoutSelect.addEventListener("change", function () {
    currentLayout = this.value;
    createKeyboard(currentLayout);
    requestAnimationFrame(postIframeSize);
  });

  function createKeyboard(layoutName) {
    const keyboard = document.getElementById("keyboard");
    const layoutSelect = document.getElementById("layout-select");

    // Apply layout-specific class (e.g. full, english-keyboard) to container
    keyboard.className = layoutSelect.value;
    keyboard.innerHTML = "";

    layout[layoutName].forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "flex"; // Handled by CSS display: flex

      row.forEach((key, index) => {
        const keyButton = document.createElement("button");
        keyButton.className = "key";
        keyButton.textContent = key;

        // Add backspace icon
        if (key === "backspace" || key === "Backspace") {
          keyButton.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
        }

        // Special classes for scramble button
        if (key === "scr" || key === "Scr") {
          keyButton.className = "scr";
        }

        // Add concat-keys class to the last 4 keys of a row, or the scr key
        if (index >= row.length - 4 || key === "scr" || key === "Scr") {
          keyButton.classList.add("concat-keys");
        }

        keyButton.dataset.key = key;
        keyButton.onclick = () => handleKeyPress(keyButton);
        rowDiv.appendChild(keyButton);
      });
      keyboard.appendChild(rowDiv);
    });

    requestAnimationFrame(postIframeSize);
  }

  function handleKeyPress(keyButton) {
    const key = keyButton.dataset.key;

    // scr สำหรับ english-keyboard
    if (key === "scr" && currentLayout === "english-keyboard") {
      if (!isScrambled) {
        scrambleEnglishKeys();
        isScrambled = true;
      } else {
        resetEnglishKeys();
        isScrambled = false;
      }
      requestAnimationFrame(postIframeSize);
      return;
    }
    // scr สำหรับ numpad-keyboard
    if (key === "Scr" && currentLayout === "numpad-keyboard") {
      if (!isNumpadScrambled) {
        scrambleNumpadKeys();
        isNumpadScrambled = true;
      } else {
        resetNumpadKeys();
        isNumpadScrambled = false;
      }
      requestAnimationFrame(postIframeSize);
      return;
    }
    // scr สำหรับ Thai-keyboard
    if (key === "scr" && currentLayout === "Thai-keyboard") {
      if (!isThaiScrambled) {
        scrambleThaiKeys();
        isThaiScrambled = true;
      } else {
        resetThaiKeys();
        isThaiScrambled = false;
      }
      requestAnimationFrame(postIframeSize);
      return;
    }
    // scr สำหรับ symbols
    if (key === "Scr" && currentLayout === "symbols") {
      if (!isSymbolsScrambled) {
        scrambleSymbolsKeys();
        isSymbolsScrambled = true;
      } else {
        resetSymbolsKeys();
        isSymbolsScrambled = false;
      }
      requestAnimationFrame(postIframeSize);
      return;
    }
    // scr สำหรับ full
    if (key === "scr" && currentLayout === "full") {
      if (!isSymbolsScrambled) {
        scramblefullKeys();
        isSymbolsScrambled = true;
      } else {
        // resetEnglishKeys()
        resetfullKeys();
        isSymbolsScrambled = false;
      }
      requestAnimationFrame(postIframeSize);
      return;
    }

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

      if (!["Backspace", "Shift ⇧", "Ctrl", "Enter"].includes(key)) {
        encryptText(messageKey).then((payload) => {
          sendMessageToActiveTab({ type: "enc", payload });
          // console.log("Encrypted Message:", payload);
        }).catch(() => {
          sendMessageToActiveTab(messageKey);
        });
      }
    }
  }

  function sendMessageToActiveTab(message) {
    try {
      const messageKey = typeof message === 'string' ? message : undefined;
      const encPayload = typeof message === 'object' && message?.type === 'enc' ? message.payload : undefined;

      const messageData = {
        source: 'SOSK_KEYBOARD',
        type: 'keyAction',
        data: encPayload ? {
          action: "typeKey",
          key: { enc: encPayload }
        } : {
          action:
            messageKey === "backspace" ? "backspace" :
              messageKey === "Enter" ? "Enter" :
                messageKey === "esc" ? "esc" :
                  messageKey === "del⌦" ? "del⌦" :
                    messageKey === "home" ? "home" :
                      messageKey === "end" ? "end" :
                        messageKey === "←" ? "←" :
                          messageKey === "→" ? "→" :
                            "typeKey",
          key: messageKey,
        }
      };

      window.parent.postMessage(messageData, '*');
      console.debug('SOSK: Message sent to parent:', messageData.data.action, messageData.data.key);
    } catch (error) {
      console.warn('Error sending message to active tab:', error);
    }
  }

  function toggleCapsLock() {
    capsLockActive = !capsLockActive;
    document.querySelectorAll('.key[data-key="Caps 🄰"]').forEach((key) => {
      key.classList.toggle("active", capsLockActive);
    });

    document.querySelectorAll(".key").forEach((key) => {
      if (currentLayout === 'full' && key.classList.contains('concat-keys')) {
        return;
      }
      const isLetter = key.dataset.key.length === 1 && /[a-zA-Z\u0E00-\u0E7F]/.test(key.dataset.key);
      if (isLetter) {
        key.textContent = capsLockActive
          ? key.dataset.key.toUpperCase()
          : key.dataset.key.toLowerCase();
      }
      updateKeyContent(key, capsLockActive);
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
      // Skip concat-keys for 'full' layout so they don't change on Shift
      if (currentLayout === 'full' && key.classList.contains('concat-keys')) {
        return;
      }

      const isLetter = key.dataset.key.length === 1 && /[a-zA-Zก-๙]/.test(key.dataset.key);

      if (isLetter) {
        key.textContent = shiftActive
          ? key.dataset.key.toUpperCase()
          : key.dataset.key.toLowerCase();
      }
      updateKeyContent(key, shiftActive);
    });
  }

  /**
   * Updates a key button's display and dataset when shift/capsLock is toggled.
   * Unified function (was duplicated for capsLock and shift separately).
   * @param {HTMLButtonElement} key
   * @param {boolean} isActive - Whether shift or capsLock is active
   */
  function updateKeyContent(key, isActive) {
    const currentChar = key.textContent.trim();

    const shiftMaps = {
      'Thai-keyboard': ThaiAlphabetShift,
      'english-keyboard': EngAlphabetShift,
      'full': EngAlphabetShift,
    };
    const shiftMap = shiftMaps[currentLayout];

    if (!shiftMap) return;

    if (isActive && shiftMap[currentChar]) {
      key.textContent = shiftMap[currentChar];
      key.dataset.key = shiftMap[currentChar];
    } else if (!isActive && Object.values(shiftMap).includes(currentChar)) {
      const originalKey = Object.keys(shiftMap).find((k) => shiftMap[k] === currentChar);
      if (originalKey) {
        key.textContent = originalKey;
        key.dataset.key = originalKey;
      }
    }
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function scrambleKeyboard() {
    const keys = document.querySelectorAll(
      ".key:not([data-key=Backspace]):not([data-key='+']):not([data-key='-']):not([data-key='*']):not([data-key='/']):not([data-key='%']):not([data-key='=']):not([data-key='.']):not([data-key='(']):not([data-key=')']):not([data-key='_'])"
    );
    const numbers = "1234567890".split("");
    shuffleArray(numbers);
    keys.forEach((key, index) => {
      key.textContent = numbers[index];
      key.dataset.key = numbers[index];
    });
  }

  function scrambleEnglishKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Space']):not([data-key='scr']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹'])"
    );
    const englishAlphabet = "abcdefghijklmnopqrstuvwxyz[]\\;',./`1234567890-=".split("");
    shuffleArray(englishAlphabet);
    keys.forEach((key, index) => {
      key.textContent = englishAlphabet[index];
      key.dataset.key = englishAlphabet[index];
    });
  }

  function scrambleThaiKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='scr']):not([data-key='Space']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹'])"
    );
    const ThaiAlphabet = "_ๅ/-ภถุึคตจขชๆไำพะัีรนยบลฃงวสา่้เดกหฟผปแอิืทมใฝ".split(
      ""
    );
    shuffleArray(ThaiAlphabet);
    keys.forEach((key, index) => {
      key.textContent = ThaiAlphabet[index];
      key.dataset.key = ThaiAlphabet[index];
    });
  }

  function resetEnglishKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Space']):not([data-key='scr']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹'])"
    );
    const original = [
      "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
      "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\",
      "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'",
      "z", "x", "c", "v", "b", "n", "m", ",", ".", "/"
    ];
    let i = 0;
    keys.forEach((key) => {
      if (i < original.length) {
        key.textContent = original[i];
        key.dataset.key = original[i];
        i++;
      }
    });
  }
  function resetNumpadKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Scr']):not([data-key='Space'])"
    );
    const original = [
      "+", "-", "*",
      "1", "2", "3", "/",
      "4", "5", "6", "%",
      "7", "8", "9", ".",
      "(", "0", ")", "=",
    ];
    let i = 0;
    keys.forEach((key) => {
      if (i < original.length) {
        key.textContent = original[i];
        key.dataset.key = original[i];
        i++;
      }
    });
  }

  function scrambleNumpadKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Scr']):not([data-key='Space'])"
    );
    const original = [
      "+", "-", "*", "/",
      "1", "2", "3", "%",
      "4", "5", "6", "_",
      "7", "8", "9", ".",
      "(", "0", ")", "=",
    ];
    shuffleArray(original);
    keys.forEach((key, index) => {
      key.textContent = original[index];
      key.dataset.key = original[index];
    });
  }
  function resetThaiKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='scr']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹']):not([data-key='Space'])"
    );
    const original = [
      "_", "ๅ", "/", "-", "ภ", "ถ", "ุ", "ึ", "ค", "ต", "จ", "ข", "ช",
      "ๆ", "ไ", "ำ", "พ", "ะ", "ั", "ี", "ร", "น", "ย", "บ", "ล", "ฃ",
      "ฟ", "ห", "ก", "ด", "เ", "้", "่", "า", "ส", "ว", "ง",
      "ผ", "ป", "แ", "อ", "ิ", "ื", "ท", "ม", "ใ", "ฝ"
    ];
    let i = 0;
    keys.forEach((key) => {
      if (i < original.length) {
        key.textContent = original[i];
        key.dataset.key = original[i];
        i++;
      }
    });
  }

  function scramblefullKeys() {
    const keys = document.querySelectorAll(
      ".key:not(.concat-keys):not([data-key='scr']):not([data-key='std']):not([data-key='scr']):not([data-key=' ']):not([data-key='Backspace']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹'])"
    );
    const original = "abcdefghijklmnopqrstuvwxyz1234567890;'\\/][`,.-=".split("");
    shuffleArray(original);
    keys.forEach((key, index) => {
      if (index < original.length) {
        key.textContent = original[index];
        key.dataset.key = original[index];
      }
    });
  }
  function resetfullKeys() {
    const keys = document.querySelectorAll(
      ".key:not(.concat-keys):not([data-key='scr']):not([data-key='std']):not([data-key='scr']):not([data-key=' ']):not([data-key='Backspace']):not([data-key='Caps 🄰']):not([data-key='Shift ⇧']):not([data-key='Enter']):not([data-key='Tab ↹'])"
    );
    const original = [
      "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
      "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\",
      "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'",
      "z", "x", "c", "v", "b", "n", "m", ",", ".", "/"
    ];
    keys.forEach((key, index) => {
      if (index < original.length) {
        key.textContent = original[index];
        key.dataset.key = original[index];
      }
    });
  }

  function scrambleSymbolsKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Scr']):not([data-key='Space'])"
    );
    const original = [
      '"', '@', '#', '$', '%', '^', '&', '*',
      '(', ')', '_', '+', '~', '`', '{', '}',
      '|', '\\', ':', '!', "'", '<', '>', '?',
      '/', '[', ']', '±', '§', '¶', '€', '£',
      '¥', '¢', '©', '®', '™', '℅', '‰', '†'
    ];
    shuffleArray(original);
    keys.forEach((key, index) => {
      key.textContent = original[index];
      key.dataset.key = original[index];
    });
  }
  function resetSymbolsKeys() {
    const keys = document.querySelectorAll(
      ".key:not([data-key='Backspace']):not([data-key='Scr']):not([data-key='Space'])"
    );
    const original = [
      '"', '@', '#', '$', '%', '^', '&', '*',
      '(', ')', '_', '+', '~', '`', '{', '}',
      '|', '\\', ':', '!', "'", '<', '>', '?',
      '/', '[', ']', '±', '§', '¶', '€', '£',
      '¥', '¢', '©', '®', '™', '℅', '‰', '†'
    ];
    let i = 0;
    keys.forEach((key) => {
      if (i < original.length) {
        key.textContent = original[i];
        key.dataset.key = original[i];
        i++;
      }
    });
  }
});
