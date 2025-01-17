chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const activeElement = document.activeElement;

  if (request.action === "typeKey") {
    insertText(activeElement, request.key);
  } else if (request.action === "backspace") {
    deleteText(activeElement);
  } else if (request.action === "Enter") {
    insertNewLine(activeElement);
  }
});

// ฟังก์ชันแทรกข้อความ
function insertText(element, key) {
  if (isTextInput(element)) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;

    element.value = value.slice(0, start) + key + value.slice(end);
    element.setSelectionRange(start + key.length, start + key.length);
    element.focus();
  } else {
    document.execCommand("insertText", false, key);
  }
}

// ฟังก์ชันลบข้อความ
function deleteText(element) {
  if (isTextInput(element)) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;

    if (start > 0 && start === end) {
      element.value = value.slice(0, start - 1) + value.slice(end);
      element.setSelectionRange(start - 1, start - 1);
    } else if (start !== end) {
      element.value = value.slice(0, start) + value.slice(end);
      element.setSelectionRange(start, start);
    }
    element.focus();
  } else {
    document.execCommand("delete");
  }
}

// ฟังก์ชันแทรกบรรทัดใหม่
function insertNewLine(element) {
  if (isTextInput(element)) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;

    element.value = value.slice(0, start) + "\n" + value.slice(end);
    element.setSelectionRange(start + 1, start + 1);
    element.focus();
  } else {
    triggerKeyEvent(element, "Enter");
  }
}

// ฟังก์ชันตรวจสอบว่าเป็น input หรือ textarea
function isTextInput(element) {
  return (
    element &&
    (element.tagName === "TEXTAREA" ||
      (element.tagName === "INPUT" &&
        (element.type === "text" ||
          element.type === "password" ||
          element.type === "search" ||
          element.type === "email" ||
          element.type === "tel" ||
          element.type === "number")))
  );
}

// ฟังก์ชันจำลองเหตุการณ์กดปุ่ม
function triggerKeyEvent(element, key) {
  const keyCode = key === "Enter" ? 13 : 0;

  const event = new KeyboardEvent("keydown", {
    key: key,
    code: key,
    keyCode: keyCode,
    charCode: keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
  });

  if (key === "Enter" && element.form) {
    event.preventDefault(); // ป้องกันการ submit ที่ไม่ต้องการ
  }

  element.dispatchEvent(event);

  ["keypress", "keyup"].forEach((eventType) => {
    const event = new KeyboardEvent(eventType, {
      key: key,
      code: key,
      keyCode: keyCode,
      charCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  });
}
let keyboardFrameMini = null;
let keyboardFrameFull = null;
let settingdFrame = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOSK-MINI") {
    handleKeyboardMini();
  } else if (request.action === "SOSK-FULLSCREEN") {
    handleKeyboardFullscreen();
  } else if (request.action === "positionkey") {
    handleSettingsFrame();
  } else if (request.action === "CLOSE_SOSK") {
    hideAllFrames();
  }
});


function handleKeyboardMini() {
  chrome.storage.sync.get(["keyboardPosition"], (result) => {
    let position = result.keyboardPosition || "bottom-right";
    if (!keyboardFrameMini) {
      keyboardFrameMini = createIframe("index.html", "800px", "305px");
      setPosition(position, keyboardFrameMini);
      document.body.appendChild(keyboardFrameMini);
    } else {
      toggleFrameDisplay(keyboardFrameMini);
    }
  });
}

function handleKeyboardFullscreen() {
  if (!keyboardFrameFull) {
    keyboardFrameFull = createIframe("FullScreen/index.html", "100%", "440px");
    keyboardFrameFull.style.bottom = "0";
    document.body.appendChild(keyboardFrameFull);
  } else {
    toggleFrameDisplay(keyboardFrameFull);
  }
}

function handleSettingsFrame() {
  chrome.storage.sync.get(["keyboardPosition"], (result) => {
    let position = result.keyboardPosition || "bottom-right";
    if (!settingdFrame) {
      settingdFrame = createIframe("/set/setting.html", "660px", "300px");
      setPosition(position, settingdFrame);
      document.body.appendChild(settingdFrame);
    } else {
      toggleFrameDisplay(settingdFrame);
    }
  });
}

function createIframe(src, width, height) {
  let frame = document.createElement("iframe");
  frame.src = chrome.runtime.getURL(src);
  frame.style.position = "fixed";
  frame.style.width = width;
  frame.style.height = height;
  frame.style.border = "none";
  frame.style.borderRadius = "10px";
  frame.style.backgroundColor = "transparent";
  frame.style.zIndex = "999999999";
  frame.setAttribute("aria-hidden", "false");
  return frame;
}

function setPosition(position, frame) {
  frame.style.top = "";
  frame.style.bottom = "";
  frame.style.left = "";
  frame.style.right = "";

  if (position === "bottom-left") {
    frame.style.bottom = "0";
    frame.style.left = "0";
  } else if (position === "top-right") {
    frame.style.top = "0";
    frame.style.right = "0";
  } else if (position === "top-left") {
    frame.style.top = "0";
    frame.style.left = "0";
  } else {
    frame.style.bottom = "0";
    frame.style.right = "0";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (keyboardFrameMini) {
    keyboardFrameMini.style.display = "none";
  }

  chrome.storage.sync.get(["keyboardPosition"], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving position:", chrome.runtime.lastError);
    } else if (result.keyboardPosition) {
      document.getElementById("position").value = result.keyboardPosition;
    }
  });

  document.getElementById("save").addEventListener("click", () => {
    const selectedPosition = document.getElementById("position").value;
    chrome.storage.sync.set({ keyboardPosition: selectedPosition }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving position:", chrome.runtime.lastError);
      } else {
        alert("Setting saved!");
        // ย้าย keyboard ทันทีหลังบันทึกตำแหน่ง
        if (keyboardFrameMini) {
          setPosition(selectedPosition, keyboardFrameMini);
        }
        if (settingdFrame) {
          settingdFrame.style.display = "none"; // ปิดหน้า iframe การตั้งค่า
        }
      }
    });
  });

  if (chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(() => {
      hideAllFrames();
    });
  } else {
    console.error("chrome.tabs.onActivated is undefined!");
  }

  window.addEventListener('blur', () => {
    hideAllFrames();
  });

  window.addEventListener("beforeunload", () => {
    hideAllFrames();
  });

});

function toggleFrameDisplay(frame) {
  const isHidden = frame.style.display === "none";
  frame.style.display = isHidden ? "block" : "none";
  frame.setAttribute("aria-hidden", isHidden ? "false" : "true");
}

function hideAllFrames() {
  if (keyboardFrameMini && keyboardFrameMini.style.display !== "none") {
    keyboardFrameMini.style.display = "none";
  }
  if (keyboardFrameFull && keyboardFrameFull.style.display !== "none") {
    keyboardFrameFull.style.display = "none";
  }
}
