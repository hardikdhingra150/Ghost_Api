chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(["ghostApiBaseUrl"]);

  if (!existing.ghostApiBaseUrl) {
    await chrome.storage.sync.set({
      ghostApiBaseUrl: "https://ghostapi-api.onrender.com"
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GHOSTAPI_INJECT_RECORDER") {
    return false;
  }

  injectRecorder(message.tabId)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function injectRecorder(tabId) {
  if (!tabId) {
    throw new Error("No active tab was found.");
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-recorder.js"]
  });
}
