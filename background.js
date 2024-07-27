chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startExport") {
    chrome.tabs.create(
      { url: "https://www.youtube.com/feed/channels" },
      (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: exportSubscriptions,
            });
          }
        });
      }
    );
    sendResponse({ status: "Export started" });
  } else if (request.action === "startImport") {
    const { data } = request;
    subscribeToChannels(data);
    sendResponse({ status: "Import started" });
  }
  return true;
});
function subscribeToChannels(channels) {
  let currentIndex = 0;

  function openNextChannel() {
    if (currentIndex < channels.length) {
      const channelUrl = channels[currentIndex];
      currentIndex++;
      chrome.tabs.create({ url: channelUrl }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: clickSubscribeButton,
            });
          }
        });
      });
    } else {
      console.log("All channels processed.");
    }
  }

  function clickSubscribeButton() {
    const subscribeButton = document.querySelector(
      'button[aria-label^="Subscribe"]'
    );
    if (subscribeButton) {
      subscribeButton.click();
      console.log("Subscribe button clicked!");
    } else {
      console.log("Subscribe button not found.");
    }
    // Close the tab after attempting to subscribe
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "closeTab" });
    }, 2000);
  }

  openNextChannel();

  chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.action === "closeTab") {
      chrome.tabs.remove(sender.tab.id, () => {
        openNextChannel();
      });
    }
  });
}
function exportSubscriptions() {
  console.log("Export function started");
  const subscriptions = [];
  let scrollAttempts = 0;
  const maxScrollAttempts = 20;

  function scanForChannels() {
    const selectors = [
      "ytd-channel-renderer",
      "ytd-grid-channel-renderer",
      "ytd-channel-renderer #text.ytd-channel-name-renderer",
      "ytd-grid-channel-renderer #text.ytd-channel-name-renderer",
    ];

    let channelElements = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        channelElements = Array.from(elements);
        console.log(
          `Found ${channelElements.length} channel elements using selector: ${selector}`
        );
        break;
      }
    }

    channelElements.forEach((element) => {
      let channelName;
      if (element.querySelector) {
        const nameElement =
          element.querySelector("#text.ytd-channel-name-renderer") ||
          element.querySelector("yt-formatted-string#text");
        channelName = nameElement ? nameElement.textContent.trim() : null;
      } else {
        channelName = element.textContent.trim();
      }

      if (channelName) {
        if (!channelName.startsWith("@")) {
          channelName = "@" + channelName;
        }
        const channelUrl = `https://www.youtube.com/${channelName}`;
        if (!subscriptions.includes(channelUrl)) {
          subscriptions.push(channelUrl);
          console.log("Added channel:", channelUrl);
        }
      }
    });
  }

  function scrollAndContinue() {
    const oldHeight = document.documentElement.scrollHeight;
    window.scrollTo(0, oldHeight);
    console.log("Scrolled to height:", oldHeight);

    setTimeout(() => {
      const newHeight = document.documentElement.scrollHeight;
      console.log("New height after scroll:", newHeight);

      if (newHeight > oldHeight && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++;
        scanForChannels();
        scrollAndContinue();
      } else {
        console.log(
          "Finished scanning, found",
          subscriptions.length,
          "channels"
        );
        if (subscriptions.length > 0) {
          console.log("Preparing to download file...");
          const blob = new Blob([JSON.stringify(subscriptions, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);

          // Create a link element and trigger the download
          const a = document.createElement("a");
          a.href = url;
          a.download = "youtube_subscriptions.json";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          console.log(
            "Download initiated. If file did not download, check browser download settings."
          );
        } else {
          console.log("No channels found");
          alert(
            "No channels found. Please make sure you're on the correct YouTube page and try again."
          );
        }
      }
    }, 2000);
  }

  scanForChannels();
  scrollAndContinue();
}
// -------------------------------------------------------------------- //
