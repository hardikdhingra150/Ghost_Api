const dashboardWorkspaceStorageKey = "ghostapi.dashboard.workspace.v1";
const mode = document.body.dataset.authMode === "signup" ? "signup" : "signin";

const els = {
  status: document.querySelector("#authStatus"),
  username: document.querySelector("#authUsername"),
  password: document.querySelector("#authPassword"),
  submit: document.querySelector("#authSubmitButton"),
  google: document.querySelector("#authGoogleButton")
};

els.submit.addEventListener("click", authenticate);
els.google.addEventListener("click", () => {
  window.location.href = "/v1/auth/google/start";
});
els.password.addEventListener("keydown", (event) => {
  if (event.key === "Enter") authenticate();
});

async function authenticate() {
  const username = els.username.value.trim();
  const password = els.password.value;

  if (!username || !password) {
    setStatus("Enter a username and password.");
    return;
  }

  setLoading(true);
  setStatus(mode === "signup" ? "Creating your workspace..." : "Signing in...");

  try {
    const response = await fetch(mode === "signup" ? "/v1/auth/signup" : "/v1/auth/login", {
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

    window.localStorage.setItem(dashboardWorkspaceStorageKey, JSON.stringify({
      account: payload.account,
      apiKey: payload.apiKey,
      createdAt: new Date().toISOString()
    }));
    setStatus("Workspace connected. Opening dashboard...");
    window.location.href = "/dashboard";
  } catch (error) {
    setStatus((mode === "signup" ? "Create account failed: " : "Sign in failed: ") + error.message);
    setLoading(false);
  }
}

function setStatus(message) {
  els.status.textContent = message;
}

function setLoading(isLoading) {
  els.submit.disabled = isLoading;
  els.google.disabled = isLoading;
}
