chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const activeElement = document.activeElement;

    if (request.action === "typeKey") {
        insertText(activeElement, request.key);
    } else if (request.action === "backspace") {
        deleteText(activeElement);
    } else if (request.action === "enter") {
        insertNewLine(activeElement);
    }
});

function insertText(element, key) {
    if (isTextInput(element)) {
        const start = element.selectionStart;
        const value = element.value;

        element.value = value.slice(0, start) + key + value.slice(start);
        element.setSelectionRange(start + key.length, start + key.length);
        element.focus();
    } else {
        document.execCommand('insertText', false, key);
    }
}

function deleteText(element) {
    if (isTextInput(element)) {
        const start = element.selectionStart;
        const value = element.value;

        if (start > 0) {
            element.value = value.slice(0, start - 1) + value.slice(start);
            element.setSelectionRange(start - 1, start - 1);
        }
        element.focus();
    } else {
        // ใช้ document.execCommand เพื่อรองรับการลบตัวอักษรในองค์ประกอบอื่นๆ
        document.execCommand('delete');
    }
}

function insertNewLine(element) {
    if (isTextInput(element)) {
        const start = element.selectionStart;
        const value = element.value;

        element.value = value.slice(0, start) + '\n' + value.slice(start);
        element.setSelectionRange(start + 1, start + 1);
        element.focus();
    } else {
        triggerKeyEvent(element, 'Enter');
    }
}

function isTextInput(element) {
    return element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && element.type === 'text' && element.type === 'password') || element.tagName === 'FORM';
}

function triggerKeyEvent(element, key) {
    const event = new KeyboardEvent('keydown', {
        key: key,
        code: key,
        keyCode: key === 'Enter' ? 13 : 0,
        charCode: key === 'Enter' ? 13 : 0,
        which: key === 'Enter' ? 13 : 0,
        bubbles: true
    });
    element.dispatchEvent(event);
}

document
  .querySelectorAll("input, textarea, form, search, text")
  .forEach((element) => {
    element.addEventListener("focus", (event) => {
      event.stopImmediatePropagation();
      activeInput = element;
    });
  });

  let keyboardFrame = null;
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "openKeyboard") {
          if (!keyboardFrame) {
              keyboardFrame = document.createElement('iframe');
              keyboardFrame.src = chrome.runtime.getURL('index.html');
              keyboardFrame.style.position = 'fixed';
              keyboardFrame.style.bottom = '0';
              keyboardFrame.style.right = '0';
              keyboardFrame.style.left = 'auto';
              keyboardFrame.style.width = '660px';
              keyboardFrame.style.height = '360px';
              keyboardFrame.style.border = 'none';
              keyboardFrame.style.zIndex = '999999999';
              document.body.appendChild(keyboardFrame);
          } else {
              keyboardFrame.style.display = keyboardFrame.style.display === 'none' ? 'block' : 'none';
          }
      } 
  });
  
  
