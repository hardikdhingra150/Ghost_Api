import { ghostLogoSvg } from "./ghostLogo.js";

export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GhostAPI Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ed;
      --paper: #fffdf8;
      --ink: #080808;
      --muted: #66645d;
      --line: #111111;
      --soft-line: #ded8ca;
      --purple: #bdb0ff;
      --blue: #5451ff;
      --orange: #ff4d1c;
      --yellow: #ffc812;
      --green: #2fd36d;
      --cyan: #7ee7ff;
      --shadow: 8px 8px 0 #111111;
      --shadow-soft: 0 24px 70px rgba(8, 8, 8, 0.10);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(rgba(8,8,8,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(8,8,8,0.035) 1px, transparent 1px),
        var(--bg);
      background-size: 42px 42px;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .shell {
      max-width: 1540px;
      margin: 0 auto;
      padding: 28px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 34px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 950;
      letter-spacing: -0.03em;
      font-size: 22px;
    }

    .ghost-logo {
      display: block;
      flex: 0 0 auto;
    }

    .brand-logo {
      width: 42px;
      height: 42px;
    }

    .hero-logo {
      width: min(390px, 74vw);
      height: auto;
      transform: none;
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .nav a, .pill {
      color: var(--ink);
      text-decoration: none;
      border: 2px solid var(--line);
      background: var(--paper);
      border-radius: 999px;
      padding: 8px 13px;
      font-size: 13px;
      font-weight: 850;
    }

    .hero {
      min-height: 430px;
      display: grid;
      grid-template-columns: minmax(420px, 1fr) 560px;
      align-items: center;
      gap: 48px;
      padding: 42px 6px 54px;
    }

    .eyebrow {
      margin: 0 0 20px;
      font-size: 13px;
      font-weight: 950;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      max-width: 900px;
      font-size: clamp(56px, 7.2vw, 118px);
      line-height: 0.92;
      letter-spacing: -0.08em;
      font-weight: 950;
    }

    .hero-copy {
      max-width: 720px;
      margin: 28px 0 0;
      font-size: 21px;
      line-height: 1.45;
      color: #24231f;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 30px;
    }

    button, .button-like {
      appearance: none;
      border: 3px solid var(--line);
      border-radius: 17px;
      padding: 13px 17px;
      color: var(--ink);
      background: var(--yellow);
      font-weight: 950;
      cursor: pointer;
      box-shadow: 5px 5px 0 var(--line);
      transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
    }

    button:hover {
      transform: translate(2px, 2px);
      box-shadow: 3px 3px 0 var(--line);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      transform: none;
    }

    button.secondary {
      background: var(--paper);
    }

    button.blue {
      color: white;
      background: var(--blue);
    }

    .visual {
      position: relative;
      min-height: 430px;
      display: grid;
      place-items: center;
      padding: 18px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 24px;
    }

    .stat, .panel, .mini-panel {
      border: 3px solid var(--line);
      background: var(--paper);
      border-radius: 28px;
      box-shadow: var(--shadow);
    }

    .stat {
      padding: 18px;
      min-height: 132px;
      display: grid;
      align-content: space-between;
    }

    .stat .label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stat .value {
      font-size: 42px;
      line-height: 1;
      letter-spacing: -0.06em;
      font-weight: 950;
    }

    main {
      display: grid;
      grid-template-columns: 430px 1fr;
      gap: 22px;
      align-items: start;
    }

    .panel {
      padding: 22px;
    }

    .stack { display: grid; gap: 18px; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .space { justify-content: space-between; }

    h2, h3 { margin: 0; letter-spacing: -0.04em; }
    h2 { font-size: 25px; }
    h3 { font-size: 18px; }
    p { color: var(--muted); line-height: 1.55; }

    label {
      display: grid;
      gap: 8px;
      color: var(--ink);
      font-size: 13px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    input {
      width: 100%;
      background: #ffffff;
      border: 3px solid var(--line);
      color: var(--ink);
      border-radius: 16px;
      padding: 13px 14px;
      outline: none;
      font-size: 15px;
      box-shadow: 3px 3px 0 var(--line);
    }

    input:focus {
      background: #fff7cc;
    }

    .card {
      border: 2px solid var(--line);
      background: #fffaf0;
      border-radius: 20px;
      padding: 16px;
    }

    .status-strip {
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border: 2px solid var(--line);
      border-radius: 16px;
      background: #f0ecff;
      font-weight: 850;
    }

    .dot {
      width: 11px;
      height: 11px;
      border: 2px solid var(--line);
      border-radius: 50%;
      background: var(--green);
    }

    .success { color: #0f8f42; }
    .failed { color: #d62619; }
    .running { color: #b66b00; }

    pre {
      margin: 0;
      padding: 16px;
      overflow: auto;
      max-height: 460px;
      background: #111111;
      border: 3px solid var(--line);
      border-radius: 18px;
      color: #fff3c4;
      font-size: 12px;
      line-height: 1.48;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }

    textarea.workflow-editor {
      width: 100%;
      min-height: 460px;
      resize: vertical;
      margin: 0;
      padding: 16px;
      overflow: auto;
      background: #111111;
      border: 3px solid var(--line);
      border-radius: 18px;
      color: #fff3c4;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.48;
      outline: none;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }

    textarea.workflow-editor:focus {
      border-color: var(--blue);
      box-shadow: 5px 5px 0 var(--line);
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border: 2px solid var(--line);
      border-radius: 16px;
      background: white;
    }

    th, td {
      text-align: left;
      padding: 12px 11px;
      border-bottom: 2px solid var(--line);
      color: var(--muted);
      font-size: 13px;
    }

    tr:last-child td { border-bottom: 0; }
    th { color: var(--ink); background: var(--yellow); font-weight: 950; }
    td strong { color: var(--ink); }

    .run-list {
      display: grid;
      gap: 12px;
      max-height: 560px;
      overflow: auto;
      padding: 4px 8px 4px 0;
    }

    .run-item {
      width: 100%;
      text-align: left;
      background: #ffffff;
      border: 3px solid var(--line);
      border-radius: 20px;
      padding: 14px;
      color: var(--ink);
      cursor: pointer;
      box-shadow: 4px 4px 0 var(--line);
    }

    .run-item.active {
      background: var(--purple);
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--line);
    }

    .muted { color: var(--muted); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .tiny { font-size: 12px; }

    .details-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 18px;
      align-items: start;
    }

    @media (max-width: 1180px) {
      .hero { grid-template-columns: 1fr; }
      .visual { min-height: 370px; max-width: 620px; }
      main { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 720px) {
      .shell { padding: 18px; }
      h1 { font-size: 58px; }
      .stats { grid-template-columns: 1fr; }
      .details-grid { grid-template-columns: 1fr; }
      .visual { display: none; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="topbar">
      <div class="brand">
        ${ghostLogoSvg("ghost-logo brand-logo", "GhostAPI logo")}
        <span>GhostAPI</span>
      </div>
      <div class="nav">
        <a href="/dashboard">Overview</a>
        <a href="/v1/actions/get-attendance/workflow">Workflow</a>
        <a href="/v1/runs">Run History</a>
        <span class="pill">Local prototype</span>
      </div>
    </nav>

    <section class="hero">
      <div>
        <p class="eyebrow">GhostAPI automation console</p>
        <h1>APIs for websites that never had one.</h1>
        <p class="hero-copy">Run browser workflows, inspect every execution step, and convert portal screens into structured JSON your apps, agents, and automations can trust.</p>
        <div class="hero-actions">
          <button id="heroRunButton" class="blue">Run attendance now</button>
          <button id="heroRefreshButton" class="secondary">Refresh run history</button>
        </div>
      </div>

      <div class="visual" aria-hidden="true">
        ${ghostLogoSvg("ghost-logo hero-logo", "GhostAPI hero logo")}
      </div>
    </section>

    <section class="stats">
      <div class="stat">
        <div class="label">Runs stored</div>
        <div id="runsMetric" class="value">0</div>
      </div>
      <div class="stat" style="background:#f0ecff">
        <div class="label">Workflow steps</div>
        <div id="stepsMetric" class="value">10</div>
      </div>
      <div class="stat" style="background:#fff2bb">
        <div class="label">Latest status</div>
        <div id="statusMetric" class="value" style="font-size:34px">Ready</div>
      </div>
      <div class="stat" style="background:#e8fff0">
        <div class="label">Active portal</div>
        <div class="value" style="font-size:30px">College</div>
      </div>
    </section>

    <main>
      <section class="stack">
        <div class="panel">
          <div class="row space">
            <h2>Run action</h2>
            <span class="pill">get-attendance</span>
          </div>
          <p>Use your local mock portal credentials, or leave both fields empty to use GhostAPI’s local demo config.</p>
          <div class="stack">
            <label>
              Username
              <input id="username" placeholder="Optional local username" autocomplete="username" />
            </label>
            <label>
              Password
              <input id="password" placeholder="Optional local password" type="password" autocomplete="current-password" />
            </label>
            <div class="row">
              <button id="runButton">Run attendance</button>
              <button class="secondary" id="refreshButton">Refresh runs</button>
            </div>
            <div class="status-strip">
              <span class="dot"></span>
              <span id="status" class="muted">Ready.</span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="row space">
            <h2>Recent runs</h2>
            <span id="runCount" class="pill">0 runs</span>
          </div>
          <div id="runs" class="run-list"></div>
        </div>
      </section>

      <section class="stack">
        <div class="panel">
          <div class="row space">
            <h2>Selected run</h2>
            <span id="selectedRunStatus" class="pill">none</span>
          </div>
          <div id="selectedRun" class="stack">
            <p class="muted">Select a run, or click “Run attendance”.</p>
          </div>
        </div>

        <div class="panel">
          <div class="row space">
            <h2>Workflow editor</h2>
            <div class="row">
              <button class="secondary" id="loadWorkflowButton">Reload</button>
              <button id="saveWorkflowButton">Save workflow</button>
            </div>
          </div>
          <p>Edit the persisted workflow JSON. GhostAPI validates step IDs, output fields, and supported step types before saving.</p>
          <textarea id="workflowJson" class="workflow-editor" spellcheck="false">Click “Reload”.</textarea>
          <div class="status-strip" style="margin-top:12px;background:#fff2bb">
            <span class="dot"></span>
            <span id="workflowStatus" class="muted">Workflow editor ready.</span>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    const state = {
      runs: [],
      selectedRunId: null,
      workflowStepCount: 10
    };

    const els = {
      username: document.querySelector("#username"),
      password: document.querySelector("#password"),
      runButton: document.querySelector("#runButton"),
      heroRunButton: document.querySelector("#heroRunButton"),
      refreshButton: document.querySelector("#refreshButton"),
      heroRefreshButton: document.querySelector("#heroRefreshButton"),
      loadWorkflowButton: document.querySelector("#loadWorkflowButton"),
      saveWorkflowButton: document.querySelector("#saveWorkflowButton"),
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
    };

    els.runButton.addEventListener("click", runAttendance);
    els.heroRunButton.addEventListener("click", runAttendance);
    els.refreshButton.addEventListener("click", loadRuns);
    els.heroRefreshButton.addEventListener("click", loadRuns);
    els.loadWorkflowButton.addEventListener("click", loadWorkflow);
    els.saveWorkflowButton.addEventListener("click", saveWorkflow);

    boot();

    async function boot() {
      await Promise.all([loadRuns(), loadWorkflow()]);
    }

    async function runAttendance() {
      setBusy(true);
      setStatus("Running browser workflow…");

      try {
        const response = await fetch("/v1/actions/get-attendance/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
            body: JSON.stringify({
              credentials: {
                username: els.username.value || undefined,
                password: els.password.value || undefined
              }
            })
        });

        const payload = await response.json();

        if (!payload.ok) {
          throw new Error(payload.error || "Action failed");
        }

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
      const response = await fetch("/v1/runs");
      const payload = await response.json();
      state.runs = payload.runs || [];
      els.runCount.textContent = state.runs.length + " runs";
      els.runsMetric.textContent = String(state.runs.length);
      els.statusMetric.textContent = state.runs[0]?.status || "Ready";
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

    async function loadWorkflow() {
      const response = await fetch("/v1/actions/get-attendance/workflow");
      const payload = await response.json();
      const workflow = payload.workflow || payload;
      state.workflowStepCount = Array.isArray(workflow.steps) ? workflow.steps.length : 0;
      els.stepsMetric.textContent = String(state.workflowStepCount);
      els.workflowJson.value = JSON.stringify(workflow, null, 2);
      setWorkflowStatus("Workflow loaded.");
    }

    async function saveWorkflow() {
      setWorkflowStatus("Validating workflow…");

      try {
        const workflow = JSON.parse(els.workflowJson.value);
        const response = await fetch("/v1/actions/get-attendance/workflow", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(workflow)
        });
        const payload = await response.json();

        if (!payload.ok) {
          throw new Error(payload.details || payload.error || "Workflow save failed");
        }

        const savedWorkflow = payload.workflow;
        state.workflowStepCount = Array.isArray(savedWorkflow.steps) ? savedWorkflow.steps.length : 0;
        els.stepsMetric.textContent = String(state.workflowStepCount);
        els.workflowJson.value = JSON.stringify(savedWorkflow, null, 2);
        setWorkflowStatus("Workflow saved. Version " + savedWorkflow.version + ".");
      } catch (error) {
        setWorkflowStatus("Save failed: " + error.message, true);
      }
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
          '<div class="card" style="background:#e8fff0">' +
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
      if (!screenshotPath) {
        return "";
      }

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
  </script>
</body>
</html>`;
}
