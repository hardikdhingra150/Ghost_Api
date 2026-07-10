(() => {
  const rootId = "ghostapi-extension-recorder-root";
  const existing = document.querySelector("#" + rootId);

  if (existing) {
    existing.remove();
    return;
  }

  const state = {
    baseUrl: "https://ghostapi-api.onrender.com",
    mode: "record",
    workflowId: slugify(location.hostname.replace(/^www\./, "") + "-api"),
    workflowName: titleCase(location.hostname.replace(/^www\./, "") + " API"),
    startedAtUrl: location.href,
    steps: [],
    outputFields: {}
  };

  chrome.storage.sync.get(["ghostApiBaseUrl"], (stored) => {
    state.baseUrl = normalizeBaseUrl(stored.ghostApiBaseUrl || state.baseUrl);
    setStatus("Recorder ready. Server: " + state.baseUrl);
  });

  const root = document.createElement("div");
  root.id = rootId;
  root.innerHTML = `
    <style>
      #${rootId}, #${rootId} * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      #${rootId} { position: fixed; right: 18px; bottom: 18px; width: 400px; z-index: 2147483647; color: #111; }
      #${rootId} .ga-card { border: 3px solid #111; border-radius: 26px; background: #fffaf1; box-shadow: 10px 10px 0 #111; overflow: hidden; }
      #${rootId} .ga-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: #fff; border-bottom: 3px solid #111; }
      #${rootId} .ga-brand { display: flex; align-items: center; gap: 10px; font-weight: 950; font-size: 18px; }
      #${rootId} .ga-ghost { width: 34px; height: 34px; display: grid; place-items: center; border: 3px solid #111; border-radius: 12px; background: #b9a7ff; }
      #${rootId} .ga-close { border: 2px solid #111; background: #fff; border-radius: 999px; width: 32px; height: 32px; font-weight: 950; cursor: pointer; }
      #${rootId} .ga-body { padding: 14px; display: grid; gap: 12px; }
      #${rootId} label { display: grid; gap: 5px; font-size: 12px; font-weight: 850; letter-spacing: .04em; text-transform: uppercase; color: #555; }
      #${rootId} input, #${rootId} textarea { width: 100%; border: 2px solid #111; border-radius: 14px; padding: 10px 12px; background: #fff; font: inherit; color: #111; }
      #${rootId} textarea { min-height: 118px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
      #${rootId} .ga-row { display: flex; gap: 8px; align-items: center; }
      #${rootId} .ga-row > * { flex: 1; }
      #${rootId} button { border: 3px solid #111; border-radius: 999px; background: #fff; padding: 10px 12px; font-weight: 950; cursor: pointer; box-shadow: 3px 3px 0 #111; color: #111; }
      #${rootId} .ga-primary { background: #5952ff; color: #fff; }
      #${rootId} .ga-green { background: #31d873; }
      #${rootId} .ga-orange { background: #ff4b1f; color: #fff; }
      #${rootId} .ga-mini { padding: 7px 9px; font-size: 12px; box-shadow: none; border-width: 2px; }
      #${rootId} .ga-muted { color: #666; font-size: 12px; line-height: 1.35; }
      #${rootId} .ga-status { border: 2px solid #111; border-radius: 16px; padding: 9px 10px; background: #f6f0ff; font-size: 12px; font-weight: 750; }
      #${rootId} .ga-steps { max-height: 125px; overflow: auto; display: grid; gap: 6px; }
      #${rootId} .ga-step { border: 2px solid #111; border-radius: 12px; background: #fff; padding: 8px; font-size: 11px; }
      #${rootId} .ga-step strong { display: block; font-size: 12px; }
      #${rootId} .ga-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      #${rootId} .ga-tabs button[aria-pressed="true"] { background: #ffc400; }
      .ghostapi-extension-highlight-target { outline: 4px solid #5952ff !important; outline-offset: 4px !important; cursor: crosshair !important; }
    </style>
    <div class="ga-card">
      <div class="ga-head">
        <div class="ga-brand"><span class="ga-ghost">👻</span><span>GhostAPI Extension</span></div>
        <button class="ga-close" data-ga-close title="Close">×</button>
      </div>
      <div class="ga-body">
        <div class="ga-status" data-ga-status>Recorder loading…</div>
        <div class="ga-row">
          <label>API id<input data-ga-workflow-id /></label>
          <label>Name<input data-ga-workflow-name /></label>
        </div>
        <div class="ga-tabs">
          <button class="ga-mini" data-ga-mode="record" aria-pressed="true">Record clicks/fills</button>
          <button class="ga-mini" data-ga-mode="extract" aria-pressed="false">Pick data to extract</button>
        </div>
        <p class="ga-muted">Record mode captures clicks and typed fields. Extract mode lets you click visible page data and name it as JSON output.</p>
        <div class="ga-row">
          <button class="ga-green" data-ga-preview>Preview JSON</button>
          <button class="ga-primary" data-ga-save>Save API</button>
          <button data-ga-copy>Copy JSON</button>
        </div>
        <div class="ga-row">
          <button class="ga-mini ga-orange" data-ga-clear>Clear</button>
          <button class="ga-mini" data-ga-add-wait>Add wait body</button>
        </div>
        <div class="ga-steps" data-ga-steps></div>
        <textarea data-ga-json spellcheck="false" placeholder="Workflow JSON preview appears here"></textarea>
      </div>
    </div>
  `;

  document.documentElement.appendChild(root);

  const ui = {
    status: root.querySelector("[data-ga-status]"),
    workflowId: root.querySelector("[data-ga-workflow-id]"),
    workflowName: root.querySelector("[data-ga-workflow-name]"),
    steps: root.querySelector("[data-ga-steps]"),
    json: root.querySelector("[data-ga-json]")
  };

  ui.workflowId.value = state.workflowId;
  ui.workflowName.value = state.workflowName;

  root.querySelector("[data-ga-close]").addEventListener("click", closeRecorder);
  root.querySelector("[data-ga-preview]").addEventListener("click", previewWorkflow);
  root.querySelector("[data-ga-save]").addEventListener("click", saveWorkflow);
  root.querySelector("[data-ga-copy]").addEventListener("click", copyWorkflow);
  root.querySelector("[data-ga-clear]").addEventListener("click", clearWorkflow);
  root.querySelector("[data-ga-add-wait]").addEventListener("click", addBodyWaitStep);
  root.querySelectorAll("[data-ga-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.gaMode));
  });

  document.addEventListener("click", captureClick, true);
  document.addEventListener("change", captureInput, true);
  document.addEventListener("mouseover", highlightExtractTarget, true);
  document.addEventListener("mouseout", unhighlightExtractTarget, true);

  render();

  function captureClick(event) {
    if (root.contains(event.target)) return;
    if (!(event.target instanceof Element)) return;

    if (state.mode === "extract") {
      event.preventDefault();
      event.stopPropagation();
      const suggested = slugify((event.target.innerText || event.target.getAttribute("aria-label") || event.target.id || "field").slice(0, 30)) || "field";
      const fieldName = prompt("Name this extracted JSON field:", suggested);
      if (!fieldName) return;
      const name = uniqueStepName(slugify(fieldName));
      state.steps.push({ id: uniqueStepId("extract-" + name), type: "extract_text", name, selector: cssSelector(event.target) });
      state.outputFields[name] = name;
      render();
      setStatus(`Extraction added: ${name}`);
      return;
    }

    const tag = event.target.tagName.toLowerCase();
    if (["input", "textarea", "select", "option", "label"].includes(tag)) return;
    state.steps.push({ id: uniqueStepId("click-" + slugify(readableName(event.target))), type: "click", target: "css:" + cssSelector(event.target) });
    render();
    setStatus("Click recorded. If the page navigates, reopen GhostAPI from the extension.");
  }

  function captureInput(event) {
    if (root.contains(event.target) || state.mode !== "record") return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    const isSecret = target instanceof HTMLInputElement && target.type === "password";
    const variableName = slugify(target.name || target.id || target.placeholder || "input") || "input";
    state.steps.push({ id: uniqueStepId("fill-" + variableName), type: "fill", target: "css:" + cssSelector(target), value: isSecret ? `{{${variableName}}}` : target.value });
    render();
    setStatus(isSecret ? "Password fill recorded as a variable, not raw text." : "Fill recorded.");
  }

  function highlightExtractTarget(event) {
    if (state.mode !== "extract" || root.contains(event.target) || !(event.target instanceof Element)) return;
    event.target.classList.add("ghostapi-extension-highlight-target");
  }

  function unhighlightExtractTarget(event) {
    if (!(event.target instanceof Element)) return;
    event.target.classList.remove("ghostapi-extension-highlight-target");
  }

  function addBodyWaitStep() {
    state.steps.push({ id: uniqueStepId("wait-page"), type: "wait_for_selector", selector: "body", timeoutMs: 10000 });
    render();
    setStatus("Wait step added.");
  }

  function buildWorkflow() {
    state.workflowId = slugify(ui.workflowId.value || state.workflowId);
    state.workflowName = ui.workflowName.value || state.workflowName;
    const steps = [{ id: "open-page", type: "goto", url: "{{pageUrl}}" }, ...state.steps];
    const outputFields = { ...state.outputFields };
    if (Object.keys(outputFields).length === 0) {
      steps.push({ id: "extract-page-text", type: "extract_text", name: "pageText", selector: "body" });
      outputFields.pageText = "pageText";
    }
    return {
      id: state.workflowId,
      portal: location.hostname.replace(/^www\./, "") || "website",
      name: state.workflowName,
      description: "Created with the GhostAPI browser extension recorder.",
      version: 1,
      defaultVariables: { pageUrl: state.startedAtUrl },
      steps,
      output: { type: "generic", sourcePortal: location.hostname.replace(/^www\./, "") || "website", fields: outputFields }
    };
  }

  function previewWorkflow() {
    const workflow = buildWorkflow();
    ui.json.value = JSON.stringify(workflow, null, 2);
    setStatus("Workflow preview generated.");
    return workflow;
  }

  async function saveWorkflow() {
    const workflow = previewWorkflow();
    setStatus("Saving API to GhostAPI…");
    try {
      const response = await fetch(`${state.baseUrl}/v1/workflows/${encodeURIComponent(workflow.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(workflow)
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.details || payload.error || `Save failed: ${response.status}`);
      ui.json.value = JSON.stringify(payload.workflow, null, 2);
      setStatus(`Saved. Run POST ${state.baseUrl}/v1/workflows/${workflow.id}/run`);
    } catch (error) {
      setStatus("Save failed: " + error.message);
    }
  }

  async function copyWorkflow() {
    await navigator.clipboard?.writeText(JSON.stringify(previewWorkflow(), null, 2));
    setStatus("Workflow JSON copied.");
  }

  function clearWorkflow() {
    if (!confirm("Clear recorded GhostAPI steps for this page?")) return;
    state.steps = [];
    state.outputFields = {};
    state.startedAtUrl = location.href;
    render();
    setStatus("Recorder cleared.");
  }

  function setMode(mode) {
    state.mode = mode;
    root.querySelectorAll("[data-ga-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.gaMode === mode)));
    setStatus(mode === "extract" ? "Extract mode: click page data to capture it." : "Record mode: use the page normally.");
  }

  function closeRecorder() {
    document.removeEventListener("click", captureClick, true);
    document.removeEventListener("change", captureInput, true);
    document.removeEventListener("mouseover", highlightExtractTarget, true);
    document.removeEventListener("mouseout", unhighlightExtractTarget, true);
    root.remove();
  }

  function render() {
    ui.steps.innerHTML = state.steps.length
      ? state.steps.map((step, index) => `<div class="ga-step"><strong>${index + 1}. ${escapeHtml(step.id)}</strong><span>${escapeHtml(step.type)} ${escapeHtml(step.target || step.selector || "")}</span></div>`).join("")
      : `<div class="ga-muted">No steps yet. Record a click/fill or pick data to extract.</div>`;
  }

  function setStatus(message) {
    ui.status.textContent = message;
  }

  function uniqueStepId(base) {
    const cleanBase = slugify(base) || "step";
    const existing = new Set(state.steps.map((step) => step.id));
    let candidate = cleanBase;
    let index = 2;
    while (existing.has(candidate) || candidate === "open-page") {
      candidate = `${cleanBase}-${index}`;
      index += 1;
    }
    return candidate;
  }

  function uniqueStepName(base) {
    const cleanBase = slugify(base) || "field";
    const existing = new Set(Object.keys(state.outputFields));
    let candidate = cleanBase;
    let index = 2;
    while (existing.has(candidate)) {
      candidate = `${cleanBase}${index}`;
      index += 1;
    }
    return candidate;
  }

  function cssSelector(element) {
    if (element.id && !element.id.includes(" ")) return "#" + cssEscape(element.id);
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && parts.length < 5) {
      let selector = current.nodeName.toLowerCase();
      if (current.getAttribute("data-testid")) {
        selector += `[data-testid="${cssEscape(current.getAttribute("data-testid"))}"]`;
        parts.unshift(selector);
        break;
      }
      if (current.getAttribute("name")) {
        selector += `[name="${cssEscape(current.getAttribute("name"))}"]`;
        parts.unshift(selector);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.nodeName === current.nodeName);
        if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(selector);
      current = parent;
    }
    return parts.join(" > ");
  }

  function readableName(element) {
    return (element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.id || element.className || element.tagName || "element").toString().slice(0, 40);
  }

  function normalizeBaseUrl(value) {
    return String(value || "https://ghostapi-api.onrender.com").replace(/\/+$/, "");
  }

  function slugify(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  }

  function titleCase(value) {
    return String(value || "Website API").replace(/[-_.]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
})();
