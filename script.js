document.addEventListener("DOMContentLoaded", function () {
    const keyboard = document.getElementById("keyboard");
    let shiftActive = false;
    let capsLockActive = false;
    let isDragging = false;
    let offsetX, offsetY;

    const specialKeys = {
        Backspace: () => sendMessageToActiveTab("backspace"),
        Tab: () => sendMessageToActiveTab("\t"),
        Caps: () => toggleCapsLock(),
        Enter: () => sendMessageToActiveTab("\n"), // Send newline for Enter
        Shift: () => toggleShift(),
        Space: () => sendMessageToActiveTab(" "),
        Ctrl: () => {},
        Win: () => {},
        Alt: () => {}
    };

    createKeyboard();

    function createKeyboard() {
        const layout = [
            ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
            ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
            ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
            ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
            ["Ctrl", "Win", "Alt", "Space", "Alt", "Ctrl"],
        ];

        layout.forEach((row) => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "row";
            row.forEach((key) => {
                const keyButton = document.createElement("button");
                keyButton.className = "key";
                keyButton.textContent = key;
                if (key === "Space") keyButton.classList.add("space");
                if (["Backspace", "Tab", "Enter", "Shift"].includes(key)) {
                    keyButton.classList.add("wide");
                }
                keyButton.dataset.key = key;
                keyButton.onclick = () => handleKeyPress(key);
                rowDiv.appendChild(keyButton);
            });
            keyboard.appendChild(rowDiv);
        });

        keyboard.addEventListener("mousedown", function(e) {
            isDragging = true;
            offsetX = e.clientX - keyboard.getBoundingClientRect().left;
            offsetY = e.clientY - keyboard.getBoundingClientRect().top;
        });

        document.addEventListener("mouseup", function() {
            isDragging = false;
        });

        document.addEventListener("mousemove", function(e) {
            if (isDragging) {
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                keyboard.style.left = x + 'px';
                keyboard.style.top = y + 'px';
            }
        });
    }

    function handleKeyPress(key) {
        const activeElement = document.activeElement;

        if (specialKeys[key]) {
            specialKeys[key]();
        } else {
            let messageKey = key;

            // Handle Shift for uppercase letters and symbols
            if (shiftActive || capsLockActive) {
                messageKey = messageKey.toUpperCase();
            } else {
                messageKey = messageKey.toLowerCase();
            }

            if (key === "Enter") {
                if (activeElement.tagName === "INPUT" && activeElement.type === "search") {
                    // Trigger search action for search inputs
                    activeElement.form.submit();
                } else {
                    // Insert newline in textareas
                    sendMessageToActiveTab("\n");
                }
            } else if (!["Backspace", "Win", "Alt", "Shift", "Ctrl"].includes(key)) {
                sendMessageToActiveTab(messageKey);
                sendInputToServer(messageKey);
            }
        }
    }

    function sendMessageToActiveTab(messageKey) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: messageKey === "backspace" ? "backspace" : "typeKey", key: messageKey },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            console.error("Error sending message:", chrome.runtime.lastError.message);
                        } else {
                            sendInputToServer(messageKey);
                        }
                    }
                );
            }
        });
    }

    function sendInputToServer(input) {
        fetch('http://localhost/osk-test/save_input.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'input=' + encodeURIComponent(input)
        })
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
    }
    

    function toggleCapsLock() {
        capsLockActive = !capsLockActive;
        const capsKey = document.querySelector('.key[data-key="Caps"]');
        capsKey.classList.toggle("active", capsLockActive);
        capsKey.style.backgroundColor = capsLockActive ? '#a9a9a9' : '#fff';
    }

    function toggleShift() {
        shiftActive = !shiftActive;
        document.querySelectorAll('.key[data-key="Shift"]').forEach((key) => {
            key.classList.toggle("active", shiftActive);
            key.style.backgroundColor = shiftActive ? '#a9a9a9' : '#fff';
        });
    }
});
