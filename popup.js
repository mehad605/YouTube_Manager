document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startExport" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    } else {
      console.log("Export process started");
    }
  });
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const contents = JSON.parse(e.target.result);
        document.getElementById("fileContents").textContent = JSON.stringify(
          contents,
          null,
          2
        );

        // Send the contents to the background script
        chrome.runtime.sendMessage(
          { action: "startImport", data: contents },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
            } else {
              console.log("Import process started");
            }
          }
        );
      } catch (error) {
        console.error("Error parsing JSON:", error);
        document.getElementById("fileContents").textContent =
          "Error: Invalid JSON file";
      }
    };
    reader.readAsText(file);
  }
});
