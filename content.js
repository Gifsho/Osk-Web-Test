chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);

    const activeElement = document.activeElement;

    if (request.action === "typeKey") {
        insertText(activeElement, request.key);
        sendResponse({ status: "success", action: "typeKey" });
    } else if (request.action === "backspace") {
        deleteText(activeElement);
        sendResponse({ status: "success", action: "backspace" });
    } else if (request.action === "enter") {
        insertNewLine(activeElement);
        sendResponse({ status: "success", action: "enter" });
    } else {
        sendResponse({ status: "error", message: "Unknown action" });
    }

    return true; 
});



function insertText(element, key) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(key));
    range.collapse(false);
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

  let replacementImageUrl = 'https://png.pngtree.com/thumb_back/fh260/background/20220509/pngtree-burglar-wearing-a-mask-shows-fuck-gesture-aggression-fuck-middle-photo-image_2853469.jpg'; 

function detectScreenCapture() {
    let videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.width = 0;
    videoElement.height = 0;
    document.body.appendChild(videoElement);

    navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
        videoElement.srcObject = stream;
        videoElement.onplay = () => {
            alert('Screen capture detected. Displaying replacement image.');
            document.body.style.backgroundImage = `url(${replacementImageUrl})`;
        };
    }).catch(error => {
        console.error('Error: ', error);
    });
}

detectScreenCapture();
