let keyboardFrameMini = null;
let keyboardFrameFull = null;
let settingdFrame = null;
let lastActiveElement = null;
let focusTimeout = null; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  lastActiveElement = document.activeElement;
  
  if (request.action === "typeKey") {
    insertText(lastActiveElement, request.key);
    restoreFocus();
  } else if (request.action === "backspace") {
    deleteText(lastActiveElement);
    restoreFocus();
  } else if (request.action === "Enter") {
    insertNewLine(lastActiveElement);
    restoreFocus();
  } else if (request.action === "SOSK-MINI") {
    handleKeyboardMini();
  } else if (request.action === "SOSK-FULLSCREEN") {
    handleKeyboardFullscreen();
  } else if (request.action === "positionkey") {
    handleSettingsFrame();
  } else if (request.action === "CLOSE_SOSK") {
    hideAllFrames();
  }
});

function insertText(element, key) {
  if (isTextInput(element)) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value || '';
    
    element.value = value.slice(0, start) + key + value.slice(end);
    
    requestAnimationFrame(() => {
      element.setSelectionRange(start + key.length, start + key.length);
      restoreFocus();
    });
  } else {
    document.execCommand("insertText", false, key);
  }
}

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
  } else {
    document.execCommand("delete");
  }
}

function insertNewLine(element) {
  console.log("Element tag:", element.tagName);
  
  document.addEventListener('focusin', (e) => {
    if (isTextInput(e.target)) {
      lastActiveElement = e.target;
      requestAnimationFrame(restoreFocus);
    }
  }, true);

  if (isTextInput(element)) {
    if (element.tagName === "TEXTAREA") {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      const value = element.value;
      element.value = value.slice(0, start) + "\n" + value.slice(end);
      element.setSelectionRange(start + 1, start + 1);
    } else if (element.tagName === "INPUT" || element.type === "password" || element.type === "text") {
      if (element.form) {
        const submitButton = element.form.querySelector('input[type="submit"], button[type="submit"], button[type="button"], button[onclick]');
        if (submitButton) {
          submitButton.setAttribute('autocomplete', 'off');
          submitButton.click();
        } else {
          element.form.submit(); 
        }
      } else {
        element.value += '\n'; 
      }
    }
  } else {
    document.execCommand("insertText", false, "\n");
  }
}

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
    element.form.submit();
  }

  element.dispatchEvent(event);
}

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
          element.type === "number"))))
}

document.querySelectorAll("input, textarea").forEach(input => {
  input.setAttribute('autocomplete', 'off');  
});

function restoreFocus() {
  if (lastActiveElement && isTextInput(lastActiveElement)) {
    if (focusTimeout) {
      clearTimeout(focusTimeout);  
    }

    focusTimeout = setTimeout(() => {
      lastActiveElement.blur();
      requestAnimationFrame(() => {
        lastActiveElement.focus();
        
        if (typeof lastActiveElement.value === 'string') {
          const length = lastActiveElement.value.length;
          lastActiveElement.setSelectionRange(length, length);
        }
        
        lastActiveElement.style.caretColor = 'auto';
        lastActiveElement.style.webkitUserSelect = 'text';
        lastActiveElement.style.userSelect = 'text';
      });
    }, 50); 
  }
}

function handleKeyboardFullscreen() {
  if (!keyboardFrameFull) {
    keyboardFrameFull = createIframe("FullScreen/index.html", "99%", "410px");
    keyboardFrameFull.style.bottom = "0";
    document.body.appendChild(keyboardFrameFull);
  } else {
    toggleFrameDisplay(keyboardFrameFull);
  }
  requestAnimationFrame(restoreFocus);
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
        alert("บันทึกการแก้ไขเรียบร้อยครับ");
        if (keyboardFrameMini) {
          setPosition(selectedPosition, keyboardFrameMini);
        }
        if (settingdFrame) {
          settingdFrame.style.display = "none";
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

function handleKeyboardMini() {
  chrome.storage.sync.get(["keyboardPosition"], (result) => {
    let position = result.keyboardPosition || "bottom-right";
    lastActiveElement = document.activeElement;
    
    if (!keyboardFrameMini) {
      keyboardFrameMini = createIframe("MiniScreen/index.html", "800px", "270px");
      setPosition(position, keyboardFrameMini);
      document.body.appendChild(keyboardFrameMini);
    } else {
      toggleFrameDisplay(keyboardFrameMini);
    }
    
    requestAnimationFrame(restoreFocus);
  });
}

function createIframe(src, width, height) {
  const frame = document.createElement("iframe");
  frame.src = chrome.runtime.getURL(src);
  frame.style.position = "fixed";
  frame.style.width = width;
  frame.style.height = height;
  frame.style.backgroundColor = "#f5f5f5";
  frame.style.border = "2px solid #222";
  frame.style.borderRadius = "15px"; 
  frame.style.zIndex = '9998';
  frame.style.margin = "5px";
  frame.style.padding = "15px";
  frame.style.cursor = "move";  // เพิ่ม cursor ที่เหมาะสมให้รู้ว่าเป็นการลาก

  // เพิ่มการฟังเหตุการณ์การคลิกเพื่อเริ่มลาก
  frame.addEventListener("mousedown", startDrag);

  frame.setAttribute("tabindex", "-1");
  frame.setAttribute("aria-hidden", "true");

  return frame;
}

// ฟังก์ชันเริ่มต้นการลาก
function startDrag(event) {
  this.isDragging = true;  // ตั้งค่า flag ว่าเริ่มลากแล้ว
  this.offsetX = event.clientX - this.offsetLeft;
  this.offsetY = event.clientY - this.offsetTop;

  // เพิ่มการฟังเหตุการณ์การเคลื่อนที่ของเมาส์ขณะลาก
  document.addEventListener("mousemove", drag.bind(this));
  document.addEventListener("mouseup", () => {
    this.isDragging = false;  // เมื่อปล่อยเมาส์ให้หยุดลาก
    document.removeEventListener("mousemove", drag.bind(this));
  });
}

// ฟังก์ชันขณะลาก
function drag(event) {
  if (this.isDragging) {
    this.style.left = `${event.clientX - this.offsetX}px`;
    this.style.top = `${event.clientY - this.offsetY}px`;
  }
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

const style = document.createElement('style');
style.textContent = `
  input, textarea {
    caret-color: auto !important;
    -webkit-user-select: text !important;
    user-select: text !important;
  }
`;
document.head.appendChild(style);
