console.log("Content script loaded and ready to receive messages");
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script loaded and ready to receive messages");

    console.log("Received message:", request);
    
    const activeElement = document.activeElement;

    if (request.action === "typeKey") {
        insertText(activeElement, request.key);
        sendResponse({status: "success"});
    } else if (request.action === "backspace") {
        deleteText(activeElement);
        sendResponse({status: "success"});
    } else if (request.action === "enter") {
        insertNewLine(activeElement);
        sendResponse({status: "success"});
    } else {
        sendResponse({status: "unknown action"});
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
    return element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && element.type === 'text');
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
