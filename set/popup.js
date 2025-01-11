document.addEventListener("DOMContentLoaded", function() {
    let soskMini = document.getElementById("SOSK-MINI");
    if (soskMini) {
      soskMini.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "SOSK-MINI" });
        });
      });
    }
  
    let soskFullscreen = document.getElementById("SOSK-FULLSCREEN");
    if (soskFullscreen) {
      soskFullscreen.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "SOSK-FULLSCREEN" });
        });
      });
    }
  
    let settings = document.getElementById("settings");
    if (settings) {
      settings.addEventListener("click", function () {
        window.open("/set/setting.html");
      });
    }
  
    let closeSosk = document.getElementById("CLOSE_SOSK");
    if (closeSosk) {
      closeSosk.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "CLOSE_SOSK" });
        });
      });
    }
  });
  