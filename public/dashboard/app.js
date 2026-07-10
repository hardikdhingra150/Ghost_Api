const api = {
  getHealth: () => requestJson("/health"),
  getMe: () => requestJson("/v1/me"),
  getCloudPlan: () => requestJson("/v1/cloud/plan"),
  getDeploymentPlan: () => requestJson("/v1/deployment/plan"),
  getApiKeys: () => requestJson("/v1/api-keys"),
  getRuns: (limit, offset) => requestJson(`/v1/runs/page?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`),
  getWorkflow: () => requestJson("/v1/actions/get-attendance/workflow"),
  getWorkflowVersions: () => requestJson("/v1/actions/get-attendance/workflow/versions"),
  getWorkflowVersion: (version) => requestJson(`/v1/actions/get-attendance/workflow/versions/${encodeURIComponent(version)}`),
  restoreWorkflowVersion: (version) => requestJson(`/v1/actions/get-attendance/workflow/versions/${encodeURIComponent(version)}/restore`, { method: "POST" }),
  diffWorkflowVersions: (from, to) => requestJson(`/v1/actions/get-attendance/workflow/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  saveWorkflow: (workflow) => requestJson("/v1/actions/get-attendance/workflow", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(workflow)
  }),
  runAttendance: (credentials) => requestJson("/v1/actions/get-attendance/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ credentials })
  }),
  getWorkflows: () => requestJson("/v1/workflows")
};

const state = {
  runs: [],
  selectedRunId: null,
  workflowStepCount: 0,
  runLimit: 10,
  runOffset: 0,
  runTotal: 0,
  workflowVersion: null,
  workflowVersions: [],
  publicApiUrl: window.location.origin
};

const els = {
  username: document.querySelector("#username"),
  password: document.querySelector("#password"),
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
  curlExample: document.querySelector("#curlExample"),
  envExample: document.querySelector("#envExample"),
  renderSmokeExample: document.querySelector("#renderSmokeExample"),
  extensionApiOrigin: document.querySelector("#extensionApiOrigin"),
  launchPublicUrl: document.querySelector("#launchPublicUrl"),
  launchRuntime: document.querySelector("#launchRuntime"),
  deploymentHealthBadge: document.querySelector("#deploymentHealthBadge"),
  workflowCards: document.querySelector("#workflowCards"),
  deploymentCards: document.querySelector("#deploymentCards"),
  bookmarkletLink: document.querySelector("#bookmarkletLink"),
  installBookmarkletButton: document.querySelector("#installBookmarkletButton"),
  copyBookmarkletButton: document.querySelector("#copyBookmarkletButton"),
  bookmarkletCode: document.querySelector("#bookmarkletCode"),
  bookmarkInstallGuide: document.querySelector("#bookmarkInstallGuide"),
  copyExtensionPathButton: document.querySelector("#copyExtensionPathButton"),
  copyAllCommandsButton: document.querySelector("#copyAllCommandsButton"),
  copyApiCommandsButton: document.querySelector("#copyApiCommandsButton"),
  copyEnvCommandsButton: document.querySelector("#copyEnvCommandsButton"),
  copyRenderSmokeButton: document.querySelector("#copyRenderSmokeButton")
};

wireEvents();
boot();

function wireEvents() {
  els.runButton.addEventListener("click", runAttendance);
  els.heroRunButton.addEventListener("click", runAttendance);
  els.refreshButton.addEventListener("click", loadRuns);
  els.heroRefreshButton.addEventListener("click", refreshOverview);
  els.prevRunsButton.addEventListener("click", () => changeRunPage(-1));
  els.nextRunsButton.addEventListener("click", () => changeRunPage(1));
  els.loadWorkflowButton.addEventListener("click", loadWorkflow);
  els.saveWorkflowButton.addEventListener("click", saveWorkflow);
  els.loadVersionButton.addEventListener("click", loadSelectedWorkflowVersion);
  els.restoreVersionButton.addEventListener("click", restoreSelectedWorkflowVersion);
  els.diffVersionButton.addEventListener("click", diffSelectedWorkflowVersion);
  els.copyBookmarkletButton.addEventListener("click", copyBookmarklet);
  els.installBookmarkletButton.addEventListener("click", installBookmarklet);
  els.copyExtensionPathButton.addEventListener("click", copyExtensionPath);
  els.copyAllCommandsButton.addEventListener("click", copyAllCommands);
  els.copyApiCommandsButton.addEventListener("click", () => copyTextFromElement(els.curlExample, "Deployed API commands copied."));
  els.copyEnvCommandsButton.addEventListener("click", () => copyTextFromElement(els.envExample, "Render environment template copied."));
  els.copyRenderSmokeButton.addEventListener("click", () => copyTextFromElement(els.renderSmokeExample, "Render smoke-test commands copied."));
  document.querySelectorAll(".copy-command").forEach((button) => {
    button.addEventListener("click", () => copyCommand(button.dataset.command));
  });
}

async function boot() {
  setupBookmarklet();
  await Promise.allSettled([refreshOverview(), loadRuns(), loadWorkflow(), loadWorkflows()]);
}

async function refreshOverview() {
  setStatus("Refreshing deployment status...");
  const [health, me, cloud, deployment, apiKeys] = await Promise.allSettled([
    api.getHealth(),
    api.getMe(),
    api.getCloudPlan(),
    api.getDeploymentPlan(),
    api.getApiKeys()
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
  }

  if (apiKeys.status === "fulfilled") {
    renderApiKeys(apiKeys.value);
  } else {
    els.apiKeyBadge.textContent = "Optional";
    els.apiKeySummary.textContent = "API key protection is not required for this environment or is not reachable yet.";
  }

  if (me.status === "fulfilled" && me.value.account) {
    const orgName = me.value.account.organization?.name || me.value.account.orgName || "Default workspace";
    els.serviceStatus.textContent = `${els.serviceStatus.textContent} · ${orgName}`;
  }

  setStatus("Dashboard refreshed.");
}

function renderApiKeys(payload) {
  const keys = payload.apiKeys || [];
  els.apiKeyBadge.textContent = keys.length === 0 ? "No stored keys" : `${keys.length} key${keys.length === 1 ? "" : "s"}`;
  els.apiKeySummary.textContent = keys.length === 0
    ? "This workspace has no stored API keys yet. For public testing, calls can run without a key when the server allows it."
    : "Stored keys are available for this workspace. GhostAPI only displays key metadata after creation.";
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
    els.workflowsMetric.textContent = String(workflows.length);
    els.workflowCards.innerHTML = workflows.length
      ? workflows.map(renderWorkflowCard).join("")
      : '<p class="empty">No workflows have been recorded yet. Install the recorder, capture a website task, and save it as your first API.</p>';
  } catch (error) {
    els.workflowCards.innerHTML = `<p class="failed">Could not load workflows: ${escapeHtml(error.message)}</p>`;
  }
}

function renderWorkflowCard(workflow) {
  const endpoint = workflow.id === "get-attendance"
    ? "/v1/actions/get-attendance/run"
    : `/v1/workflows/${workflow.id}/run`;
  return `<article class="mini-card">
    <div class="row space">
      <h3>${escapeHtml(workflow.name || workflow.id)}</h3>
      <span class="badge">v${escapeHtml(String(workflow.version || 1))}</span>
    </div>
    <p>${escapeHtml(workflow.description || "Recorded browser workflow ready to run as an API.")}</p>
    <code>${escapeHtml(endpoint)}</code>
  </article>`;
}

function updateCommandExamples(baseUrl) {
  const cleanBase = String(baseUrl || window.location.origin).replace(/\/$/, "");
  els.apiExample.textContent = `curl \\\n  ${cleanBase}/v1/workflows`;
  els.curlExample.textContent = `curl \\\n  ${cleanBase}/health\ncurl \\\n  ${cleanBase}/v1/workflows`;
  els.renderSmokeExample.textContent = `curl \\\n  ${cleanBase}/health\ncurl \\\n  ${cleanBase}/v1/deployment/plan\ncurl \\\n  ${cleanBase}/v1/workflows`;
  els.extensionApiOrigin.textContent = cleanBase;
  els.envExample.textContent = [
    "GHOSTAPI_DEPLOYMENT_PROVIDER=render",
    "GHOSTAPI_MODE=cloud",
    `GHOSTAPI_PUBLIC_API_URL=${cleanBase}`,
    "GHOSTAPI_REQUIRE_API_KEY=false",
    "HOST=0.0.0.0",
    "PORT=4000",
    "DATABASE_URL=<Render Postgres connection string>",
    "GHOSTAPI_DATABASE_DRIVER=postgres"
  ].join("\n");
}

function setupBookmarklet() {
  const bookmarklet =
    "javascript:(()=>{const s=document.createElement('script');s.src='" +
    window.location.origin +
    "/capture/bookmarklet.js?ts='+Date.now();document.documentElement.appendChild(s)})()";
  els.bookmarkletLink.href = bookmarklet;
  els.bookmarkletCode.value = bookmarklet;
}

async function copyBookmarklet() {
  await navigator.clipboard.writeText(els.bookmarkletCode.value);
  els.bookmarkInstallGuide.hidden = false;
  setStatus("GhostAPI bookmarklet copied. Save it as a browser bookmark.");
}

async function installBookmarklet() {
  await navigator.clipboard.writeText(els.bookmarkletCode.value);
  els.bookmarkInstallGuide.hidden = false;
  setStatus("Bookmark code copied. Save it as a browser bookmark.");
}

async function copyExtensionPath() {
  await navigator.clipboard.writeText("extensions/chrome");
  setStatus("Extension folder copied.");
}

async function copyCommand(command) {
  await navigator.clipboard.writeText(command);
  setStatus("Copied command.");
}

async function copyTextFromElement(element, message) {
  await navigator.clipboard.writeText(element.textContent.trim());
  setStatus(message);
}

async function copyAllCommands() {
  const commands = [
    "npm install",
    "npx playwright install chromium",
    "npm start",
    "npm run check",
    "npm run test:dashboard",
    "npm run test:cloud",
    "npm run test:deployment",
    "npm run test:extension",
    "npm run package:extension",
    "",
    els.curlExample.textContent.trim(),
    "",
    els.envExample.textContent.trim()
  ].join("\n");
  await navigator.clipboard.writeText(commands);
  setStatus("Setup and verification commands copied.");
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.details || payload.error || `Request failed: ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function runAttendance() {
  setBusy(true);
  setStatus("Running browser workflow...");

  try {
    const payload = await api.runAttendance({
      username: els.username.value || undefined,
      password: els.password.value || undefined
    });

    setStatus("Run completed: " + payload.runId);
    state.selectedRunId = payload.runId;
    await loadRuns();
  } catch (error) {
    setStatus("Error: " + error.message, true);
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
  }
}

function changeRunPage(direction) {
  const nextOffset = state.runOffset + direction * state.runLimit;
  state.runOffset = Math.min(Math.max(nextOffset, 0), Math.max(state.runTotal - 1, 0));
  state.selectedRunId = null;
  loadRuns().catch((error) => setStatus("Error: " + error.message, true));
}

async function loadWorkflow() {
  const payload = await api.getWorkflow();
  const workflow = payload.workflow || payload;
  state.workflowVersion = workflow.version;
  state.workflowStepCount = Array.isArray(workflow.steps) ? workflow.steps.length : 0;
  els.stepsMetric.textContent = String(state.workflowStepCount);
  els.workflowJson.value = JSON.stringify(workflow, null, 2);
  setWorkflowStatus("Workflow loaded.");
  await loadWorkflowVersions();
}

async function saveWorkflow() {
  setWorkflowStatus("Validating workflow...");

  try {
    const workflow = JSON.parse(els.workflowJson.value);
    const payload = await api.saveWorkflow(workflow);
    const savedWorkflow = payload.workflow;
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
  const payload = await api.getWorkflowVersions();
  state.workflowVersions = payload.versions || [];
  els.workflowVersionSelect.innerHTML = state.workflowVersions
    .map((item) => `<option value="${escapeHtml(String(item.version))}">v${escapeHtml(String(item.version))} - ${new Date(item.createdAt).toLocaleString()}</option>`)
    .join("");

  if (state.workflowVersion) {
    els.workflowVersionSelect.value = String(state.workflowVersion);
  }
}

async function loadSelectedWorkflowVersion() {
  const version = selectedWorkflowVersion();

  if (!version) {
    return setWorkflowStatus("No workflow version selected.", true);
  }

  try {
    const payload = await api.getWorkflowVersion(version);
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
    const payload = await api.restoreWorkflowVersion(version);
    els.workflowJson.value = JSON.stringify(payload.workflow, null, 2);
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

  if (!selected || !current) {
    return setWorkflowStatus("Need a selected version and current workflow version to diff.", true);
  }

  try {
    const payload = await api.diffWorkflowVersions(selected, current);
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
    els.runs.innerHTML = '<p class="empty">No runs yet. Run the demo workflow or capture a website task to see automation history here.</p>';
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
  els.statusMetric.textContent = isError ? "Failed" : message.startsWith("Run completed") ? "Success" : message.includes("Refreshing") ? "Running" : "Ready";
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
