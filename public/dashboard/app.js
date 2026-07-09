const api = {
  async getRuns(limit, offset) {
    return requestJson(`/v1/runs/page?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`);
  },
  async getWorkflow() {
    return requestJson("/v1/actions/get-attendance/workflow");
  },
  async getWorkflowVersions() {
    return requestJson("/v1/actions/get-attendance/workflow/versions");
  },
  async getWorkflowVersion(version) {
    return requestJson(`/v1/actions/get-attendance/workflow/versions/${encodeURIComponent(version)}`);
  },
  async restoreWorkflowVersion(version) {
    return requestJson(`/v1/actions/get-attendance/workflow/versions/${encodeURIComponent(version)}/restore`, {
      method: "POST"
    });
  },
  async diffWorkflowVersions(from, to) {
    return requestJson(`/v1/actions/get-attendance/workflow/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  },
  async saveWorkflow(workflow) {
    return requestJson("/v1/actions/get-attendance/workflow", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(workflow)
    });
  },
  async runAttendance(credentials) {
    return requestJson("/v1/actions/get-attendance/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credentials })
    });
  },
  async getWorkflows() {
    return requestJson("/v1/workflows");
  }
};

const state = {
  runs: [],
  selectedRunId: null,
  workflowStepCount: 10,
  runLimit: 10,
  runOffset: 0,
  runTotal: 0,
  workflowVersion: null,
  workflowVersions: []
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
  runs: document.querySelector("#runs"),
  runCount: document.querySelector("#runCount"),
  selectedRun: document.querySelector("#selectedRun"),
  selectedRunStatus: document.querySelector("#selectedRunStatus"),
  workflowJson: document.querySelector("#workflowJson"),
  runsMetric: document.querySelector("#runsMetric"),
  stepsMetric: document.querySelector("#stepsMetric"),
  statusMetric: document.querySelector("#statusMetric")
  ,
  bookmarkletLink: document.querySelector("#bookmarkletLink"),
  copyBookmarkletButton: document.querySelector("#copyBookmarkletButton"),
  bookmarkletCode: document.querySelector("#bookmarkletCode")
};

els.runButton.addEventListener("click", runAttendance);
els.heroRunButton.addEventListener("click", runAttendance);
els.refreshButton.addEventListener("click", loadRuns);
els.heroRefreshButton.addEventListener("click", loadRuns);
els.prevRunsButton.addEventListener("click", () => changeRunPage(-1));
els.nextRunsButton.addEventListener("click", () => changeRunPage(1));
els.loadWorkflowButton.addEventListener("click", loadWorkflow);
els.saveWorkflowButton.addEventListener("click", saveWorkflow);
els.loadVersionButton.addEventListener("click", loadSelectedWorkflowVersion);
els.restoreVersionButton.addEventListener("click", restoreSelectedWorkflowVersion);
els.diffVersionButton.addEventListener("click", diffSelectedWorkflowVersion);
els.copyBookmarkletButton.addEventListener("click", copyBookmarklet);

boot();

async function boot() {
  setupBookmarklet();
  await Promise.all([loadRuns(), loadWorkflow()]);
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
  setStatus("GhostAPI bookmarklet copied. Create a new bookmark and paste it as the URL.");
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
  setStatus("Running browser workflow…");

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
  const payload = await api.getRuns(state.runLimit, state.runOffset);
  state.runs = payload.runs || [];
  state.runTotal = payload.total || state.runs.length;
  state.runLimit = payload.limit || state.runLimit;
  state.runOffset = payload.offset || state.runOffset;
  els.runCount.textContent = state.runs.length + " runs";
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
  setWorkflowStatus("Validating workflow…");

  try {
    const workflow = JSON.parse(els.workflowJson.value);
    const payload = await api.saveWorkflow(workflow);
    const savedWorkflow = payload.workflow;
    state.workflowVersion = savedWorkflow.version;
    state.workflowStepCount = Array.isArray(savedWorkflow.steps) ? savedWorkflow.steps.length : 0;
    els.stepsMetric.textContent = String(state.workflowStepCount);
    els.workflowJson.value = JSON.stringify(savedWorkflow, null, 2);
    setWorkflowStatus("Workflow saved. Version " + savedWorkflow.version + ".");
    await loadWorkflowVersions();
  } catch (error) {
    setWorkflowStatus("Save failed: " + error.message, true);
  }
}

async function loadWorkflowVersions() {
  const payload = await api.getWorkflowVersions();
  state.workflowVersions = payload.versions || [];
  els.workflowVersionSelect.innerHTML = state.workflowVersions
    .map((item) => '<option value="' + escapeHtml(String(item.version)) + '">' +
      'v' + escapeHtml(String(item.version)) + ' • ' + new Date(item.createdAt).toLocaleString() +
    '</option>')
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
    await loadWorkflowVersions();
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
    setWorkflowStatus("Diff loaded: v" + selected + " → v" + current + ".");
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
  els.runPageStatus.textContent = state.runTotal === 0 ? "No runs" : `${start}-${end} of ${state.runTotal} • page ${page}`;
  els.prevRunsButton.disabled = state.runOffset <= 0;
  els.nextRunsButton.disabled = state.runOffset + state.runLimit >= state.runTotal;
}

function renderRuns() {
  if (state.runs.length === 0) {
    els.runs.innerHTML = '<p class="muted">No runs yet.</p>';
    return;
  }

  els.runs.innerHTML = state.runs.map((run) => {
    const active = run.id === state.selectedRunId ? " active" : "";
    return '<button class="run-item' + active + '" data-run-id="' + escapeHtml(run.id) + '">' +
      '<div class="row space">' +
        '<strong>' + escapeHtml(run.actionId) + '</strong>' +
        '<span class="' + escapeHtml(run.status) + '">' + escapeHtml(run.status) + '</span>' +
      '</div>' +
      '<div class="muted mono tiny">' + escapeHtml(run.id) + '</div>' +
      '<div class="muted tiny">' + new Date(run.createdAt).toLocaleString() + ' • ' + run.stepLog.length + ' steps</div>' +
    '</button>';
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
  els.selectedRunStatus.className = "pill " + run.status;

  const result = run.result || {};
  const subjects = Array.isArray(result.subjects) ? result.subjects : [];

  els.selectedRun.innerHTML =
    '<div class="details-grid">' +
      '<div class="card">' +
        '<div class="row space">' +
          '<div><h3>Run identity</h3><div class="muted mono tiny">' + escapeHtml(run.id) + '</div></div>' +
          '<span class="pill">workflow v' + escapeHtml(String(run.workflowVersion)) + '</span>' +
        '</div>' +
        '<p>Status: <strong class="' + escapeHtml(run.status) + '">' + escapeHtml(run.status) + '</strong></p>' +
        '<p class="muted">Created: ' + new Date(run.createdAt).toLocaleString() + '</p>' +
        (run.error ? '<p class="failed">Error: ' + escapeHtml(run.error) + '</p>' : '') +
      '</div>' +
      '<div class="card green-card">' +
        '<h3>Portal output</h3>' +
        '<p>Student<br><strong style="font-size:28px;color:var(--ink)">' + escapeHtml(result.student || "-") + '</strong></p>' +
        '<p>Semester <strong>' + escapeHtml(result.semester || "-") + '</strong></p>' +
      '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="row space"><h3>Attendance result</h3><span class="pill">' + subjects.length + ' subjects</span></div>' +
      renderSubjects(subjects) +
    '</div>' +
    '<div class="card">' +
      '<div class="row space"><h3>Step log</h3><span class="pill">' + (run.stepLog || []).length + ' steps</span></div>' +
      renderSteps(run.stepLog || []) +
    '</div>' +
    '<div class="card">' +
      '<h3>Stored run JSON</h3>' +
      '<pre>' + escapeHtml(JSON.stringify(run, null, 2)) + '</pre>' +
    '</div>';
}

function renderSubjects(subjects) {
  if (subjects.length === 0) {
    return '<p class="muted">No subjects found.</p>';
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
    return '<p class="muted">No step logs yet.</p>';
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
  els.statusMetric.textContent = isError ? "Failed" : message.startsWith("Run completed") ? "Success" : "Running";
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
