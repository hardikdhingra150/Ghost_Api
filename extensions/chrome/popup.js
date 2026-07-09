const els = {
  baseUrl: document.querySelector("#baseUrl"),
  startRecorder: document.querySelector("#startRecorder"),
  openDashboard: document.querySelector("#openDashboard"),
  status: document.querySelector("#status")
};

boot();

async function boot() {
  const stored = await chrome.storage.sync.get(["ghostApiBaseUrl"]);
  els.baseUrl.value = stored.ghostApiBaseUrl || "http://127.0.0.1:4000";

  els.baseUrl.addEventListener("change", saveBaseUrl);
  els.startRecorder.addEventListener("click", startRecorder);
  els.openDashboard.addEventListener("click", openDashboard);
}

async function saveBaseUrl() {
  await chrome.storage.sync.set({
    ghostApiBaseUrl: normalizeBaseUrl(els.baseUrl.value)
  });
  els.baseUrl.value = normalizeBaseUrl(els.baseUrl.value);
  setStatus("GhostAPI server saved.");
}

async function startRecorder() {
  await saveBaseUrl();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return setStatus("No active tab found.");
  }

  chrome.runtime.sendMessage({ type: "GHOSTAPI_INJECT_RECORDER", tabId: tab.id }, (response) => {
    if (chrome.runtime.lastError) {
      return setStatus(chrome.runtime.lastError.message);
    }

    if (!response?.ok) {
      return setStatus(response?.error || "Could not open recorder on this page.");
    }

    setStatus("Recorder opened. Use the floating GhostAPI panel on the page.");
  });
}

async function openDashboard() {
  await saveBaseUrl();
  await chrome.tabs.create({
    url: normalizeBaseUrl(els.baseUrl.value) + "/dashboard"
  });
}

function normalizeBaseUrl(value) {
  return String(value || "http://127.0.0.1:4000").replace(/\/+$/, "");
}

function setStatus(message) {
  els.status.textContent = message;
}
