const els = {
  baseUrl: document.querySelector("#baseUrl"),
  useLocalServer: document.querySelector("#useLocalServer"),
  useCloudServer: document.querySelector("#useCloudServer"),
  checkServer: document.querySelector("#checkServer"),
  startRecorder: document.querySelector("#startRecorder"),
  openDashboard: document.querySelector("#openDashboard"),
  status: document.querySelector("#status"),
  endpointPreview: document.querySelector("#endpointPreview")
};

boot();

async function boot() {
  const stored = await chrome.storage.sync.get(["ghostApiBaseUrl"]);
  els.baseUrl.value = stored.ghostApiBaseUrl || "http://127.0.0.1:4000";
  updateEndpointPreview();

  els.baseUrl.addEventListener("change", saveBaseUrl);
  els.baseUrl.addEventListener("input", updateEndpointPreview);
  els.useLocalServer.addEventListener("click", () => setServer("http://127.0.0.1:4000"));
  els.useCloudServer.addEventListener("click", () => setServer("https://api.ghostapi.app"));
  els.checkServer.addEventListener("click", checkServer);
  els.startRecorder.addEventListener("click", startRecorder);
  els.openDashboard.addEventListener("click", openDashboard);
}

async function setServer(baseUrl) {
  els.baseUrl.value = baseUrl;
  await saveBaseUrl();
  setStatus(baseUrl.includes("127.0.0.1") ? "Local server selected." : "Cloud server selected. Use this after GhostAPI cloud is deployed.");
}

async function saveBaseUrl() {
  await chrome.storage.sync.set({
    ghostApiBaseUrl: normalizeBaseUrl(els.baseUrl.value)
  });
  els.baseUrl.value = normalizeBaseUrl(els.baseUrl.value);
  updateEndpointPreview();
  setStatus("GhostAPI server saved.");
}

async function checkServer() {
  await saveBaseUrl();
  setStatus("Checking GhostAPI server…");

  try {
    const response = await fetch(normalizeBaseUrl(els.baseUrl.value) + "/health");
    const payload = await response.json();

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setStatus("Connected. GhostAPI is running.");
  } catch (error) {
    setStatus("Cannot reach GhostAPI. Start it with: npm start");
  }
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

function updateEndpointPreview() {
  els.endpointPreview.textContent = normalizeBaseUrl(els.baseUrl.value) + "/v1/workflows/YOUR_API/run";
}

function setStatus(message) {
  els.status.textContent = message;
}
