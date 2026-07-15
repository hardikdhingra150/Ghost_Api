const dashboardWorkspaceStorageKey = "ghostapi.dashboard.workspace.v1";

const api = {
  getHealth: () => requestJson("/health", {}, { auth: false }),
  getMe: () => requestJson("/v1/me"),
  getCloudPlan: () => requestJson("/v1/cloud/plan", {}, { auth: false }),
  getDeploymentPlan: () => requestJson("/v1/deployment/plan", {}, { auth: false }),
  getDatabasePlan: () => requestJson("/v1/database/plan", {}, { auth: false }),
  getApiKeys: () => requestJson("/v1/api-keys"),
  getRuns: (limit, offset) => requestJson(`/v1/runs/page?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`),
  getWorkflow: (workflowId) => requestJson(`/v1/workflows/${encodeURIComponent(workflowId)}`),
  getWorkflowVersions: (workflowId) => requestJson(`/v1/workflows/${encodeURIComponent(workflowId)}/versions`),
  getWorkflowVersion: (workflowId, version) => requestJson(`/v1/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(version)}`),
  restoreWorkflowVersion: (workflowId, version) => requestJson(`/v1/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(version)}/restore`, { method: "POST" }),
  diffWorkflowVersions: (workflowId, from, to) => requestJson(`/v1/workflows/${encodeURIComponent(workflowId)}/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  saveWorkflow: (workflowId, workflow) => requestJson(`/v1/workflows/${encodeURIComponent(workflowId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(workflow)
  }),
  runDemoWorkflow: () => requestJson("/v1/workflows/portal-summary/run"),
  getWorkflows: () => requestJson("/v1/workflows"),
  signUp: (username, password) => requestJson("/v1/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      organizationName: `${username}'s GhostAPI Workspace`
    })
  }, { auth: false }),
  signIn: (username, password) => requestJson("/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  }, { auth: false })
};

const state = {
  apiKey: null,
  account: null,
  runs: [],
  selectedRunId: null,
  workflowStepCount: 0,
  runLimit: 10,
  runOffset: 0,
  runTotal: 0,
  selectedWorkflowId: null,
  workflows: [],
  workflowVersion: null,
  workflowVersions: [],
  publicApiUrl: window.location.origin
};

const els = {
  runButton: document.querySelector("#runButton"),
  heroRunButton: document.querySelector("#heroRunButton"),
  refreshButton: document.querySelector("#refreshButton"),
  heroRefreshButton: document.querySelector("#heroRefreshButton"),
  prevRunsButton: document.querySelector("#prevRunsButton"),
  nextRunsButton: document.querySelector("#nextRunsButton"),
  runPageStatus: document.querySelector("#runPageStatus"),
  loadWorkflowButton: document.querySelector("#loadWorkflowButton"),
  saveWorkflowButton: document.querySelector("#saveWorkflowButton"),
  workflowVersionSelect: document.querySelector("#workflowVersionSelect"),
  loadVersionButton: document.querySelector("#loadVersionButton"),
  restoreVersionButton: document.querySelector("#restoreVersionButton"),
  diffVersionButton: document.querySelector("#diffVersionButton"),
  workflowDiff: document.querySelector("#workflowDiff"),
  status: document.querySelector("#status"),
  workflowStatus: document.querySelector("#workflowStatus"),
  runs: document.querySelector("#runsList"),
  runCount: document.querySelector("#runCount"),
  selectedRun: document.querySelector("#selectedRun"),
  selectedRunStatus: document.querySelector("#selectedRunStatus"),
  workflowJson: document.querySelector("#workflowJson"),
  runsMetric: document.querySelector("#runsMetric"),
  stepsMetric: document.querySelector("#stepsMetric"),
  statusMetric: document.querySelector("#statusMetric"),
  workflowsMetric: document.querySelector("#workflowsMetric"),
  publicApiUrl: document.querySelector("#publicApiUrl"),
  modeMetric: document.querySelector("#modeMetric"),
  providerMetric: document.querySelector("#providerMetric"),
  serviceStatus: document.querySelector("#serviceStatus"),
  apiKeyBadge: document.querySelector("#apiKeyBadge"),
  apiKeySummary: document.querySelector("#apiKeySummary"),
  apiExample: document.querySelector("#apiExample"),
  extensionApiOrigin: document.querySelector("#extensionApiOrigin"),
  launchPublicUrl: document.querySelector("#launchPublicUrl"),
  launchRuntime: document.querySelector("#launchRuntime"),
  deploymentHealthBadge: document.querySelector("#deploymentHealthBadge"),
  databasePlanBadge: document.querySelector("#databasePlanBadge"),
  databasePlanSummary: document.querySelector("#databasePlanSummary"),
  workflowCards: document.querySelector("#workflowCards"),
  deploymentCards: document.querySelector("#deploymentCards"),
  downloadExtensionButton: document.querySelector("#downloadExtensionButton"),
  navAuthLink: document.querySelector("#navAuthLink"),
  authSummaryTitle: document.querySelector("#authSummaryTitle"),
  authSummaryCopy: document.querySelector("#authSummaryCopy"),
  authSignInLink: document.querySelector("#authSignInLink"),
  authCreateLink: document.querySelector("#authCreateLink"),
  authStatus: document.querySelector("#authStatus"),
  authLogoutButton: document.querySelector("#authLogoutButton")
};

wireEvents();
boot();

function wireEvents() {
  els.runButton.addEventListener("click", runDemoWorkflow);
  els.heroRunButton.addEventListener("click", runDemoWorkflow);
  els.refreshButton.addEventListener("click", loadRuns);
  els.heroRefreshButton.addEventListener("click", refreshOverview);
  els.prevRunsButton.addEventListener("click", () => changeRunPage(-1));
  els.nextRunsButton.addEventListener("click", () => changeRunPage(1));
  els.loadWorkflowButton.addEventListener("click", reloadSavedApis);
  els.saveWorkflowButton.addEventListener("click", saveWorkflow);
  els.loadVersionButton.addEventListener("click", loadSelectedWorkflowVersion);
  els.restoreVersionButton.addEventListener("click", restoreSelectedWorkflowVersion);
  els.diffVersionButton.addEventListener("click", diffSelectedWorkflowVersion);
  els.downloadExtensionButton?.addEventListener("click", () => {
    setStatus("Extension download started.");
  });
  els.authLogoutButton.addEventListener("click", logout);
  document.querySelectorAll(".copy-command").forEach((button) => {
    button.addEventListener("click", () => copyCommand(button.dataset.command, button));
  });
}

async function boot() {
  const signedIn = await restoreDashboardWorkspace();
  setAuthUi();

  if (!signedIn) {
    window.location.replace("/dashboard/login.html");
    return;
  }

  await refreshOverview();
  await Promise.allSettled([loadRuns(), loadWorkflows()]);
}

async function restoreDashboardWorkspace() {
  const hashWorkspace = readWorkspaceFromHash();
  const storedWorkspace = hashWorkspace || readStoredWorkspace();

  if (storedWorkspace?.apiKey?.key) {
    state.apiKey = storedWorkspace.apiKey.key;
    state.account = storedWorkspace.account || null;
    writeStoredWorkspace(storedWorkspace);
  }

  if (state.apiKey) {
    try {
      const payload = await api.getMe();
      state.account = payload.account || state.account;
      writeStoredWorkspace({
        account: state.account,
        apiKey: { key: state.apiKey },
        createdAt: storedWorkspace?.createdAt || new Date().toISOString()
      });
      return true;
    } catch {
      state.apiKey = null;
      state.account = null;
      clearStoredWorkspace();
    }
  }

  return false;
}

function saveAuthenticatedWorkspace(payload) {
  state.apiKey = payload.apiKey.key;
  state.account = payload.account;
  writeStoredWorkspace({
    account: payload.account,
    apiKey: payload.apiKey,
    createdAt: new Date().toISOString()
  });
}

function logout() {
  state.apiKey = null;
  state.account = null;
  state.runs = [];
  state.workflows = [];
  state.selectedRunId = null;
  state.selectedWorkflowId = null;
  clearStoredWorkspace();
  window.location.href = "/dashboard/login.html";
}

function setAuthUi() {
  const signedIn = Boolean(state.apiKey && state.account);
  const username = state.account?.user?.email?.split("@")[0] || state.account?.user?.name || "workspace";
  els.authStatus.textContent = signedIn
    ? `Signed in as ${username}. Dashboard and extension saves now use this workspace.`
    : "Sign in or create an account so saved APIs appear everywhere you use GhostAPI.";
  els.authSummaryTitle.textContent = signedIn ? "Workspace connected" : "Workspace login required";
  els.authSummaryCopy.textContent = signedIn
    ? "Your dashboard is using a private workspace. Extension captures saved with this account will appear here."
    : "Use a GhostAPI account to keep saved APIs, run history, and extension captures separated per user.";
  els.navAuthLink.textContent = signedIn ? "Workspace" : "Sign in";
  els.navAuthLink.href = signedIn ? "#workflows" : "/dashboard/login.html";
  els.authSignInLink.hidden = signedIn;
  els.authCreateLink.hidden = signedIn;
  els.authLogoutButton.disabled = !signedIn;
  els.authLogoutButton.hidden = !signedIn;
  els.runButton.disabled = !signedIn;
  els.heroRunButton.disabled = !signedIn;
  els.refreshButton.disabled = !signedIn;
  els.loadWorkflowButton.disabled = !signedIn;
  els.saveWorkflowButton.disabled = !signedIn;
}

function renderSignedOutState() {
  els.apiKeyBadge.textContent = "Sign in";
  els.apiKeySummary.textContent = "Create an account or sign in to see your saved APIs and run history.";
  els.workflowsMetric.textContent = "0";
  els.runsMetric.textContent = "0";
  els.stepsMetric.textContent = "0";
  els.statusMetric.textContent = "Sign in";
  els.workflowCards.innerHTML = '<p class="empty">Sign in to load your saved website APIs.</p>';
  els.workflowJson.value = "Sign in to edit saved APIs.";
  els.workflowVersionSelect.innerHTML = '<option value="">Sign in required</option>';
  els.runs.innerHTML = '<p class="empty">Sign in to see your run history.</p>';
  els.runCount.textContent = "Sign in";
  els.selectedRun.innerHTML = '<p class="empty">Sign in to inspect run details.</p>';
  els.selectedRunStatus.textContent = "none";
}

function readWorkspaceFromHash() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const encodedSession = hash.get("ghostapi_session");
  const key = hash.get("ghostapi_key");
  const authError = hash.get("auth_error");

  if (authError) {
    hash.delete("auth_error");
    const nextHash = hash.toString();
    window.history.replaceState(null, "", window.location.pathname + window.location.search + (nextHash ? `#${nextHash}` : ""));
    window.setTimeout(() => {
      els.authStatus.textContent = "Google sign-in failed: " + authError;
    }, 0);
  }

  if (encodedSession) {
    hash.delete("ghostapi_session");
    const nextHash = hash.toString();
    window.history.replaceState(null, "", window.location.pathname + window.location.search + (nextHash ? `#${nextHash}` : ""));

    try {
      const session = JSON.parse(decodeBase64UrlJson(encodedSession));

      if (session?.apiKey?.key) {
        return {
          apiKey: session.apiKey,
          account: session.account || null,
          createdAt: new Date().toISOString()
        };
      }
    } catch {
      window.setTimeout(() => {
        els.authStatus.textContent = "Google sign-in failed: invalid session response.";
      }, 0);
    }
  }

  if (!key) return null;

  hash.delete("ghostapi_key");
  const nextHash = hash.toString();
  window.history.replaceState(null, "", window.location.pathname + window.location.search + (nextHash ? `#${nextHash}` : ""));

  return {
    apiKey: { key },
    account: null,
    createdAt: new Date().toISOString()
  };
}

function decodeBase64UrlJson(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readStoredWorkspace() {
  try {
    return JSON.parse(window.localStorage.getItem(dashboardWorkspaceStorageKey) || "null");
  } catch {
    return null;
  }
}

function writeStoredWorkspace(workspace) {
  try {
    window.localStorage.setItem(dashboardWorkspaceStorageKey, JSON.stringify(workspace));
  } catch {
    // Private browsing can block localStorage; the current page session still keeps the key in memory.
  }
}

function clearStoredWorkspace() {
  try {
    window.localStorage.removeItem(dashboardWorkspaceStorageKey);
  } catch {
    // Ignore storage cleanup failures.
  }
}

async function refreshOverview() {
  setStatus("Refreshing deployment status...");
  const accountRequests = state.apiKey
    ? [api.getMe(), api.getApiKeys()]
    : [Promise.reject(new Error("Signed out")), Promise.reject(new Error("Signed out"))];
  const [health, me, cloud, deployment, database, apiKeys] = await Promise.allSettled([
    api.getHealth(),
    accountRequests[0],
    api.getCloudPlan(),
    api.getDeploymentPlan(),
    api.getDatabasePlan(),
    accountRequests[1]
  ]);

  if (health.status === "fulfilled") {
    const value = health.value;
    state.publicApiUrl = value.publicApiUrl || window.location.origin;
    els.serviceStatus.textContent = value.ok ? "API online" : "API status unknown";
    els.publicApiUrl.textContent = state.publicApiUrl;
    els.modeMetric.textContent = value.mode || "local";
    els.providerMetric.textContent = value.deploymentProvider || "local";
    els.launchPublicUrl.textContent = state.publicApiUrl;
    els.launchRuntime.textContent = `${value.mode || "local"} on ${value.deploymentProvider || "local"}`;
    els.deploymentHealthBadge.textContent = value.ok ? "Production API online" : "Production API needs attention";
  } else {
    els.serviceStatus.textContent = "Health check unavailable";
    els.deploymentHealthBadge.textContent = "Health check unavailable";
  }

  if (deployment.status === "fulfilled") {
    renderDeployment(deployment.value, cloud.status === "fulfilled" ? cloud.value : null);
    updateCommandExamples(deployment.value.publicApiUrl || state.publicApiUrl);
  } else {
    renderLockedCloudState(deployment.reason);
  }

  if (database.status === "fulfilled") {
    renderDatabasePlan(database.value);
  } else {
    els.databasePlanBadge.textContent = "Database status locked";
    els.databasePlanSummary.textContent = "Database readiness requires an API key on this deployment.";
  }

  if (apiKeys.status === "fulfilled") {
    renderApiKeys(apiKeys.value);
  } else {
    els.apiKeyBadge.textContent = "Protected";
    els.apiKeySummary.textContent = "This deployment protects account APIs. Public health and extension download remain available.";
  }

  if (me.status === "fulfilled" && me.value.account) {
    state.account = me.value.account;
    const orgName = me.value.account.organization?.name || me.value.account.orgName || "Default workspace";
    els.serviceStatus.textContent = `${els.serviceStatus.textContent} · ${orgName}`;
  }

  setStatus("Dashboard refreshed.");
}

function renderApiKeys(payload) {
  const keys = payload.apiKeys || [];
  const workspaceName = state.account?.organization?.name || "Private workspace";
  els.apiKeyBadge.textContent = keys.length === 0 ? "Private workspace" : `${keys.length} key${keys.length === 1 ? "" : "s"}`;
  els.apiKeySummary.textContent = keys.length === 0
    ? `${workspaceName} is isolated in this browser. New users get their own workspace instead of shared demo data.`
    : `${workspaceName} is isolated in this browser. GhostAPI only displays key metadata after creation.`;
}

function renderDeployment(payload, cloudPayload) {
  const services = payload.services || [];
  const readiness = cloudPayload?.readiness || {};
  const readyCount = Object.values(readiness).filter(Boolean).length;
  const totalCount = Object.keys(readiness).length;

  els.deploymentCards.innerHTML = [
    miniCard("Public endpoint", payload.publicApiUrl || state.publicApiUrl, payload.currentMode || "local"),
    miniCard("Readiness", totalCount ? `${readyCount}/${totalCount} foundations ready` : "Plan loaded", payload.currentProvider || "local"),
    ...services.map((service) => miniCard(service.name, service.role, service.status))
  ].join("");
}

function renderLockedCloudState(error) {
  els.deploymentCards.innerHTML = [
    miniCard("Cloud API protected", "Account, workflow, and deployment details require an API key on this deployment.", "protected"),
    miniCard("Public health", "The public /health endpoint still verifies the running Render service.", "configured")
  ].join("");

  if (error?.message) {
    setStatus("Cloud details locked: " + error.message, true);
  }
}

function renderDatabasePlan(payload) {
  const postgres = payload.postgres || {};
  const isPostgresReady = payload.activeStore === "postgres";
  els.databasePlanBadge.textContent = isPostgresReady ? "Postgres active" : "Database readiness";
  els.databasePlanSummary.textContent = isPostgresReady
    ? "Cloud persistence is pointed at Postgres. Keep SQLite only as the local fallback."
    : `Active store: ${payload.activeStore || "sqlite"}. Set DATABASE_URL and GHOSTAPI_DATABASE_DRIVER=postgres when ready.`;
  els.deploymentCards.insertAdjacentHTML(
    "afterbegin",
    miniCard(
      "Database readiness",
      `Active store: ${payload.activeStore || "sqlite"}. Postgres URL: ${postgres.connectionStringConfigured ? "configured" : "not configured"}.`,
      isPostgresReady ? "configured" : "planned"
    )
  );
}

function miniCard(title, body, status) {
  return `<article class="mini-card">
    <div class="row space">
      <h3>${escapeHtml(title)}</h3>
      <span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>
    </div>
    <p>${escapeHtml(body)}</p>
  </article>`;
}

async function loadWorkflows() {
  try {
    const payload = await api.getWorkflows();
    const workflows = payload.workflows || [];
    state.workflows = workflows;
    els.workflowsMetric.textContent = String(workflows.length);

    if (!workflows.length) {
      state.selectedWorkflowId = null;
      state.workflowVersion = null;
      state.workflowVersions = [];
      els.workflowCards.innerHTML = '<p class="empty">No saved APIs yet. Install the recorder, capture a website task, and save it as your first API.</p>';
      els.workflowJson.value = "No saved API selected yet.";
      els.workflowVersionSelect.innerHTML = '<option value="">No versions</option>';
      return;
    }

    if (!state.selectedWorkflowId || !workflows.some((workflow) => workflow.id === state.selectedWorkflowId)) {
      state.selectedWorkflowId = workflows[0].id;
    }

    renderWorkflowCards();
    await loadWorkflow(state.selectedWorkflowId);
  } catch (error) {
    els.workflowCards.innerHTML = `<p class="failed">Could not load workflows: ${escapeHtml(error.message)}</p>`;
  }
}

async function reloadSavedApis() {
  setWorkflowStatus("Reloading saved APIs...");
  await loadWorkflows();
}

function renderWorkflowCards() {
  els.workflowCards.innerHTML = state.workflows.map(renderWorkflowCard).join("");
  els.workflowCards.querySelectorAll(".workflow-card").forEach((button) => {
    button.addEventListener("click", () => {
      const workflowId = button.dataset.workflowId;
      if (!workflowId) return;

      state.selectedWorkflowId = workflowId;
      renderWorkflowCards();
      loadWorkflow(workflowId).catch((error) => setWorkflowStatus("Load failed: " + error.message, true));
    });
  });
}

function renderWorkflowCard(workflow) {
  const endpoint = workflow.id === "get-attendance"
    ? "/v1/actions/get-attendance/run"
    : `/v1/workflows/${workflow.id}/run`;
  const active = workflow.id === state.selectedWorkflowId ? " active" : "";
  return `<button class="mini-card workflow-card${active}" data-workflow-id="${escapeHtml(workflow.id)}" type="button">
    <div class="row space">
      <div>
        <h3>${escapeHtml(workflow.name || workflow.id)}</h3>
        <span class="muted tiny">${escapeHtml(workflow.portal || "captured website")}</span>
      </div>
      <span class="badge">v${escapeHtml(String(workflow.version || 1))}</span>
    </div>
    <p>${escapeHtml(workflow.description || "Recorded browser workflow ready to run as an API.")}</p>
    <code>${escapeHtml(endpoint)}</code>
  </button>`;
}

function updateCommandExamples(baseUrl) {
  const cleanBase = String(baseUrl || window.location.origin).replace(/\/$/, "");
  els.apiExample.textContent = `curl \\\n  ${cleanBase}/v1/workflows`;
  els.extensionApiOrigin.textContent = cleanBase;
}

async function copyCommand(command, button) {
  await copyToClipboard(command, button);
  setStatus("Copied command.");
}

async function copyToClipboard(text, button) {
  showCopied(button);

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function showCopied(button) {
  if (!button) return;

  const originalText = button.dataset.originalText || button.textContent;
  button.dataset.originalText = originalText;
  button.textContent = "Copied";
  button.classList.add("copied");

  window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("copied");
  }, 1400);
}

async function requestJson(url, options = {}, settings = { auth: true }) {
  const headers = new Headers(options.headers || {});

  if (settings.auth !== false && !state.apiKey) {
    throw new Error("Sign in required");
  }

  if (settings.auth !== false && state.apiKey) {
    headers.set("x-ghostapi-key", state.apiKey);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });
  const payload = await response.json();

  if (!response.ok || payload.ok === false) {
    const details = typeof payload.details === "string" ? payload.details : payload.details ? JSON.stringify(payload.details) : "";
    const error = new Error(details || payload.error || `Request failed: ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function runDemoWorkflow() {
  setBusy(true);
  setStatus("Running hosted demo workflow...");

  try {
    const payload = await api.runDemoWorkflow();
    setStatus("Demo completed: " + payload.runId);
    state.selectedRunId = payload.runId;
    await loadRuns();
  } catch (error) {
    setStatus("Demo failed: " + error.message, true);
  } finally {
    setBusy(false);
  }
}

async function loadRuns() {
  try {
    const payload = await api.getRuns(state.runLimit, state.runOffset);
    state.runs = payload.runs || [];
    state.runTotal = payload.total || state.runs.length;
    state.runLimit = payload.limit || state.runLimit;
    state.runOffset = payload.offset || state.runOffset;
    els.runCount.textContent = `${state.runTotal} run${state.runTotal === 1 ? "" : "s"}`;
    els.runsMetric.textContent = String(state.runTotal);
    els.statusMetric.textContent = state.runs[0]?.status || "Ready";
    renderRunPager();
    renderRuns();

    if (!state.selectedRunId && state.runs[0]) {
      state.selectedRunId = state.runs[0].id;
    }

    if (state.selectedRunId) {
      const selected = state.runs.find((run) => run.id === state.selectedRunId) || state.runs[0];
      if (selected) {
        state.selectedRunId = selected.id;
        renderSelectedRun(selected);
      }
    }
  } catch (error) {
    els.runs.innerHTML = `<p class="failed">Could not load runs: ${escapeHtml(error.message)}</p>`;
    els.runCount.textContent = "protected";
    els.runsMetric.textContent = "-";
  }
}

function changeRunPage(direction) {
  const nextOffset = state.runOffset + direction * state.runLimit;
  state.runOffset = Math.min(Math.max(nextOffset, 0), Math.max(state.runTotal - 1, 0));
  state.selectedRunId = null;
  loadRuns().catch((error) => setStatus("Error: " + error.message, true));
}

async function loadWorkflow(workflowId = state.selectedWorkflowId) {
  if (!workflowId) {
    return setWorkflowStatus("Select a saved API first.", true);
  }

  try {
    state.selectedWorkflowId = workflowId;
    const payload = await api.getWorkflow(workflowId);
    const workflow = payload.workflow || payload;
    state.selectedWorkflowId = workflow.id;
    state.workflowVersion = workflow.version;
    state.workflowStepCount = Array.isArray(workflow.steps) ? workflow.steps.length : 0;
    els.stepsMetric.textContent = String(state.workflowStepCount);
    els.workflowJson.value = JSON.stringify(workflow, null, 2);
    setWorkflowStatus(`Loaded ${workflow.name || workflow.id}.`);
    renderWorkflowCards();
    await loadWorkflowVersions();
  } catch (error) {
    els.stepsMetric.textContent = "-";
    els.workflowJson.value = "Workflow details are protected on this deployment.";
    setWorkflowStatus("Workflow details require API access.", true);
  }
}

async function saveWorkflow() {
  setWorkflowStatus("Validating workflow...");

  try {
    const workflow = JSON.parse(els.workflowJson.value);
    if (!workflow.id) {
      throw new Error("Workflow JSON must include an id.");
    }

    const payload = await api.saveWorkflow(workflow.id, workflow);
    const savedWorkflow = payload.workflow;
    state.selectedWorkflowId = savedWorkflow.id;
    state.workflowVersion = savedWorkflow.version;
    state.workflowStepCount = Array.isArray(savedWorkflow.steps) ? savedWorkflow.steps.length : 0;
    els.stepsMetric.textContent = String(state.workflowStepCount);
    els.workflowJson.value = JSON.stringify(savedWorkflow, null, 2);
    setWorkflowStatus("Workflow saved. Version " + savedWorkflow.version + ".");
    await Promise.all([loadWorkflowVersions(), loadWorkflows()]);
  } catch (error) {
    setWorkflowStatus("Save failed: " + error.message, true);
  }
}

async function loadWorkflowVersions() {
  if (!state.selectedWorkflowId) {
    els.workflowVersionSelect.innerHTML = '<option value="">No saved API selected</option>';
    return;
  }

  try {
    const payload = await api.getWorkflowVersions(state.selectedWorkflowId);
    state.workflowVersions = payload.versions || [];
    els.workflowVersionSelect.innerHTML = state.workflowVersions
      .map((item) => `<option value="${escapeHtml(String(item.version))}">v${escapeHtml(String(item.version))} - ${new Date(item.createdAt).toLocaleString()}</option>`)
      .join("");

    if (state.workflowVersion) {
      els.workflowVersionSelect.value = String(state.workflowVersion);
    }
  } catch {
    els.workflowVersionSelect.innerHTML = '<option value="">Protected</option>';
  }
}

async function loadSelectedWorkflowVersion() {
  const version = selectedWorkflowVersion();

  if (!version) {
    return setWorkflowStatus("No workflow version selected.", true);
  }

  try {
    const payload = await api.getWorkflowVersion(state.selectedWorkflowId, version);
    els.workflowJson.value = JSON.stringify(payload.workflow, null, 2);
    state.workflowVersion = payload.workflow.version;
    setWorkflowStatus("Loaded workflow version " + version + ".");
  } catch (error) {
    setWorkflowStatus("Load version failed: " + error.message, true);
  }
}

async function restoreSelectedWorkflowVersion() {
  const version = selectedWorkflowVersion();

  if (!version) {
    return setWorkflowStatus("No workflow version selected.", true);
  }

  try {
    const payload = await api.restoreWorkflowVersion(state.selectedWorkflowId, version);
    els.workflowJson.value = JSON.stringify(payload.workflow, null, 2);
    state.selectedWorkflowId = payload.workflow.id;
    state.workflowVersion = payload.workflow.version;
    setWorkflowStatus("Restored version " + version + " as version " + payload.workflow.version + ".");
    await Promise.all([loadWorkflowVersions(), loadWorkflows()]);
  } catch (error) {
    setWorkflowStatus("Restore failed: " + error.message, true);
  }
}

async function diffSelectedWorkflowVersion() {
  const selected = selectedWorkflowVersion();
  const current = state.workflowVersion;

  if (!state.selectedWorkflowId || !selected || !current) {
    return setWorkflowStatus("Need a selected version and current workflow version to diff.", true);
  }

  try {
    const payload = await api.diffWorkflowVersions(state.selectedWorkflowId, selected, current);
    els.workflowDiff.textContent = JSON.stringify(payload.changes, null, 2);
    setWorkflowStatus("Diff loaded: v" + selected + " to v" + current + ".");
  } catch (error) {
    setWorkflowStatus("Diff failed: " + error.message, true);
  }
}

function selectedWorkflowVersion() {
  const version = Number(els.workflowVersionSelect.value);
  return Number.isInteger(version) && version > 0 ? version : null;
}

function renderRunPager() {
  const start = state.runTotal === 0 ? 0 : state.runOffset + 1;
  const end = Math.min(state.runOffset + state.runLimit, state.runTotal);
  const page = Math.floor(state.runOffset / state.runLimit) + 1;
  els.runPageStatus.textContent = state.runTotal === 0 ? "No runs" : `${start}-${end} of ${state.runTotal} - page ${page}`;
  els.prevRunsButton.disabled = state.runOffset <= 0;
  els.nextRunsButton.disabled = state.runOffset + state.runLimit >= state.runTotal;
}

function renderRuns() {
  if (state.runs.length === 0) {
    els.runs.innerHTML = '<p class="empty">No runs yet. Run the hosted demo workflow or capture a website task to see automation history here.</p>';
    return;
  }

  els.runs.innerHTML = state.runs.map((run) => {
    const active = run.id === state.selectedRunId ? " active" : "";
    return `<button class="run-item${active}" data-run-id="${escapeHtml(run.id)}">
      <div class="row space">
        <strong>${escapeHtml(run.actionId)}</strong>
        <span class="${escapeHtml(run.status)}">${escapeHtml(run.status)}</span>
      </div>
      <div class="muted mono tiny">${escapeHtml(run.id)}</div>
      <div class="muted tiny">${new Date(run.createdAt).toLocaleString()} - ${(run.stepLog || []).length} steps</div>
    </button>`;
  }).join("");

  els.runs.querySelectorAll(".run-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRunId = button.dataset.runId;
      const run = state.runs.find((item) => item.id === state.selectedRunId);
      renderRuns();
      if (run) renderSelectedRun(run);
    });
  });
}

function renderSelectedRun(run) {
  els.selectedRunStatus.textContent = run.status;
  els.selectedRunStatus.className = "badge " + run.status;

  const result = run.result || {};
  const subjects = Array.isArray(result.subjects) ? result.subjects : [];

  els.selectedRun.innerHTML =
    `<div class="mini-card">
      <div class="row space">
        <div><h3>Run identity</h3><div class="muted mono tiny">${escapeHtml(run.id)}</div></div>
        <span class="badge">workflow v${escapeHtml(String(run.workflowVersion))}</span>
      </div>
      <p>Status: <strong class="${escapeHtml(run.status)}">${escapeHtml(run.status)}</strong></p>
      <p class="muted">Created: ${new Date(run.createdAt).toLocaleString()}</p>
      ${run.error ? `<p class="failed">Error: ${escapeHtml(run.error)}</p>` : ""}
    </div>
    <div class="mini-card">
      <div class="row space"><h3>Extracted result</h3><span class="badge">${subjects.length || Object.keys(result).length} fields</span></div>
      ${subjects.length ? renderSubjects(subjects) : `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`}
    </div>
    <div class="mini-card">
      <div class="row space"><h3>Step log</h3><span class="badge">${(run.stepLog || []).length} steps</span></div>
      ${renderSteps(run.stepLog || [])}
    </div>`;
}

function renderSubjects(subjects) {
  if (subjects.length === 0) {
    return '<p class="empty">No structured rows found.</p>';
  }

  return '<table><thead><tr><th>Subject</th><th>Attended</th><th>Total</th><th>%</th></tr></thead><tbody>' +
    subjects.map((subject) => '<tr>' +
      '<td><strong>' + escapeHtml(subject.subject) + '</strong></td>' +
      '<td>' + escapeHtml(String(subject.attended)) + '</td>' +
      '<td>' + escapeHtml(String(subject.total)) + '</td>' +
      '<td>' + escapeHtml(String(subject.percentage)) + '%</td>' +
    '</tr>').join("") +
  '</tbody></table>';
}

function renderSteps(steps) {
  if (steps.length === 0) {
    return '<p class="empty">No step logs yet.</p>';
  }

  return '<table><thead><tr><th>Step</th><th>Type</th><th>Status</th><th>Time</th></tr></thead><tbody>' +
    steps.map((step) => '<tr>' +
      '<td><strong>' + escapeHtml(step.stepId) + '</strong>' + renderScreenshotLink(step.screenshotPath) + '</td>' +
      '<td>' + escapeHtml(step.type) + '</td>' +
      '<td class="' + escapeHtml(step.status) + '">' + escapeHtml(step.status) + '</td>' +
      '<td>' + durationMs(step.startedAt, step.finishedAt) + 'ms</td>' +
    '</tr>').join("") +
  '</tbody></table>';
}

function renderScreenshotLink(screenshotPath) {
  if (!screenshotPath) return "";
  const filename = screenshotPath.split("/").pop();
  return '<div><a class="muted mono tiny" href="/v1/artifacts/screenshots/' + encodeURIComponent(filename) + '" target="_blank" rel="noreferrer">Open failure screenshot</a></div>';
}

function durationMs(startedAt, finishedAt) {
  return Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
}

function setBusy(isBusy) {
  els.runButton.disabled = isBusy;
  els.heroRunButton.disabled = isBusy;
  els.refreshButton.disabled = isBusy;
  els.heroRefreshButton.disabled = isBusy;
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.className = isError ? "failed" : "muted";
  els.statusMetric.textContent = isError ? "Failed" : message.includes("completed") ? "Success" : message.includes("Refreshing") || message.includes("Running") ? "Running" : "Ready";
}

function setWorkflowStatus(message, isError = false) {
  els.workflowStatus.textContent = message;
  els.workflowStatus.className = isError ? "failed" : "muted";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
