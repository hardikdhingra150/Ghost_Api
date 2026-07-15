const els = {
  baseUrl: document.querySelector("#baseUrl"),
  useLocalServer: document.querySelector("#useLocalServer"),
  useCloudServer: document.querySelector("#useCloudServer"),
  checkServer: document.querySelector("#checkServer"),
  startRecorder: document.querySelector("#startRecorder"),
  openDashboard: document.querySelector("#openDashboard"),
  status: document.querySelector("#status"),
  endpointPreview: document.querySelector("#endpointPreview"),
  accountStatus: document.querySelector("#accountStatus"),
  authModeBadge: document.querySelector("#authModeBadge"),
  showSignIn: document.querySelector("#showSignIn"),
  showSignUp: document.querySelector("#showSignUp"),
  authUsername: document.querySelector("#authUsername"),
  authPassword: document.querySelector("#authPassword"),
  authSubmitAccount: document.querySelector("#authSubmitAccount"),
  googleAccount: document.querySelector("#googleAccount"),
  logoutAccount: document.querySelector("#logoutAccount")
};

const CLOUD_BASE_URL = "https://ghostapi-api.onrender.com";
const LOCAL_BASE_URL = "http://127.0.0.1:4000";
const WORKSPACE_STORAGE_KEY = "ghostApiWorkspace";
let authMode = "signin";

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
  els.showSignIn.addEventListener("click", () => setAuthMode("signin"));
  els.showSignUp.addEventListener("click", () => setAuthMode("signup"));
  els.authSubmitAccount.addEventListener("click", () => authenticate(authMode));
  els.googleAccount.addEventListener("click", openGoogleAuth);
  els.logoutAccount.addEventListener("click", logoutAccount);
  els.authPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") authenticate(authMode);
  });

  setAuthMode("signin");
  updateAccountStatus();
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

async function openGoogleAuth() {
  await saveBaseUrl();
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  await chrome.tabs.create({ url: baseUrl + "/dashboard/login.html" });
  setStatus("Use Google sign-in on the dashboard, then return here and sign in if needed.");
}

async function authenticate(mode) {
  await saveBaseUrl();
  const username = els.authUsername.value.trim();
  const password = els.authPassword.value;

  if (!username || !password) {
    return setAccountStatus("Enter a username and password.");
  }

  setAccountStatus(mode === "signup" ? "Creating account..." : "Signing in...");

  try {
    const baseUrl = normalizeBaseUrl(els.baseUrl.value);
    const response = await fetch(baseUrl + (mode === "signup" ? "/v1/auth/signup" : "/v1/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        organizationName: `${username}'s GhostAPI Workspace`
      })
    });
    const payload = await response.json();

    if (!response.ok || payload.ok === false || !payload.apiKey?.key) {
      throw new Error(payload.error || "Authentication failed");
    }

    await chrome.storage.sync.set({
      [WORKSPACE_STORAGE_KEY]: {
        account: payload.account,
        apiKey: payload.apiKey,
        createdAt: new Date().toISOString()
      }
    });
    els.authPassword.value = "";
    updateAccountStatus(payload.account);
    setStatus("Account connected. Saves will appear on your dashboard.");
  } catch (error) {
    setAccountStatus((mode === "signup" ? "Create failed: " : "Sign in failed: ") + error.message);
  }
}

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "signin";
  els.authModeBadge.textContent = authMode === "signup" ? "Sign up" : "Sign in";
  els.authSubmitAccount.textContent = authMode === "signup" ? "Create account" : "Sign in";
  els.authPassword.autocomplete = authMode === "signup" ? "new-password" : "current-password";
  els.showSignIn.classList.toggle("active", authMode === "signin");
  els.showSignUp.classList.toggle("active", authMode === "signup");
  setAccountStatus(authMode === "signup"
    ? "Create a workspace from the extension, then every saved API syncs to your dashboard."
    : "Sign in so saved APIs appear on your dashboard.");
}

async function ensureWorkspace() {
  const stored = await chrome.storage.sync.get([WORKSPACE_STORAGE_KEY]);

  if (stored[WORKSPACE_STORAGE_KEY]?.apiKey?.key) {
    return stored[WORKSPACE_STORAGE_KEY];
  }

  throw new Error("Sign in or create an account first.");
}

async function logoutAccount() {
  await chrome.storage.sync.remove(WORKSPACE_STORAGE_KEY);
  updateAccountStatus();
  setStatus("Signed out.");
}

function normalizeBaseUrl(value) {
  return String(value || CLOUD_BASE_URL).replace(/\/+$/, "");
}

function updateEndpointPreview() {
  chrome.storage.sync.get([WORKSPACE_STORAGE_KEY], (stored) => {
    const key = stored[WORKSPACE_STORAGE_KEY]?.apiKey?.key;
    const url = new URL(normalizeBaseUrl(els.baseUrl.value) + "/v1/workflows/YOUR_API/run");
    if (key) url.searchParams.set("ghostapi_key", key);
    els.endpointPreview.textContent = url.toString();
  });
}

function setStatus(message) {
  els.status.textContent = message;
}

async function updateAccountStatus(account) {
  const resolvedAccount = account || (await chrome.storage.sync.get([WORKSPACE_STORAGE_KEY]))[WORKSPACE_STORAGE_KEY]?.account;
  setAccountStatus(resolvedAccount
    ? `Signed in as ${resolvedAccount.user?.email?.split("@")[0] || resolvedAccount.user?.name || "workspace"}.`
    : "Sign in so saved APIs appear on your dashboard.");
}

function setAccountStatus(message) {
  els.accountStatus.textContent = message;
}
