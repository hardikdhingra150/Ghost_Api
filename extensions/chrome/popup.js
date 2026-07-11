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

const CLOUD_BASE_URL = "https://ghostapi-api.onrender.com";
const LOCAL_BASE_URL = "http://127.0.0.1:4000";
const WORKSPACE_STORAGE_KEY = "ghostApiWorkspace";

boot();

async function boot() {
  const stored = await chrome.storage.sync.get(["ghostApiBaseUrl"]);
  els.baseUrl.value = stored.ghostApiBaseUrl || CLOUD_BASE_URL;
  if (!stored.ghostApiBaseUrl) {
    await chrome.storage.sync.set({ ghostApiBaseUrl: CLOUD_BASE_URL });
  }
  updateEndpointPreview();

  els.baseUrl.addEventListener("change", saveBaseUrl);
  els.baseUrl.addEventListener("input", updateEndpointPreview);
  els.useLocalServer.addEventListener("click", () => setServer(LOCAL_BASE_URL));
  els.useCloudServer.addEventListener("click", () => setServer(CLOUD_BASE_URL));
  els.checkServer.addEventListener("click", checkServer);
  els.startRecorder.addEventListener("click", startRecorder);
  els.openDashboard.addEventListener("click", openDashboard);
}

async function setServer(baseUrl) {
  els.baseUrl.value = baseUrl;
  await saveBaseUrl();
  setStatus(baseUrl.includes("127.0.0.1") ? "Local dev selected. Start GhostAPI locally only for development." : "Cloud server selected. No local command is needed.");
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
    setStatus(normalizeBaseUrl(els.baseUrl.value) === CLOUD_BASE_URL
      ? "Cannot reach GhostAPI cloud. Check the Render deployment and environment."
      : "Cannot reach local GhostAPI. Local dev requires npm start.");
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
    window.setTimeout(() => window.close(), 120);
  });
}

async function openDashboard() {
  await saveBaseUrl();

  try {
    const workspace = await ensureWorkspace();
    await chrome.tabs.create({
      url: normalizeBaseUrl(els.baseUrl.value) + "/dashboard#ghostapi_key=" + encodeURIComponent(workspace.apiKey.key)
    });
  } catch (error) {
    setStatus("Could not open private dashboard: " + error.message);
  }
}

async function ensureWorkspace() {
  const stored = await chrome.storage.sync.get([WORKSPACE_STORAGE_KEY]);

  if (stored[WORKSPACE_STORAGE_KEY]?.apiKey?.key) {
    return stored[WORKSPACE_STORAGE_KEY];
  }

  const workspaceId = createWorkspaceId();
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  const response = await fetch(baseUrl + "/v1/accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `extension-${workspaceId}@workspace.ghostapi.local`,
      name: "GhostAPI Extension User",
      organizationName: "My GhostAPI Workspace"
    })
  });
  const payload = await response.json();

  if (!response.ok || payload.ok === false || !payload.apiKey?.key) {
    throw new Error(payload.error || "Could not create extension workspace");
  }

  const workspace = {
    account: payload.account,
    apiKey: payload.apiKey,
    createdAt: new Date().toISOString()
  };

  await chrome.storage.sync.set({ [WORKSPACE_STORAGE_KEY]: workspace });
  return workspace;
}

function normalizeBaseUrl(value) {
  return String(value || CLOUD_BASE_URL).replace(/\/+$/, "");
}

function createWorkspaceId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateEndpointPreview() {
  els.endpointPreview.textContent = normalizeBaseUrl(els.baseUrl.value) + "/v1/workflows/YOUR_API/run";
}

function setStatus(message) {
  els.status.textContent = message;
}
