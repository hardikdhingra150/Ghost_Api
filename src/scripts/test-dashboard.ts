const rootResponse = await fetch("http://127.0.0.1:4000/");
const rootHtml = await rootResponse.text();
const response = await fetch("http://127.0.0.1:4000/dashboard");
const html = await response.text();

if (!rootResponse.ok || !rootHtml.includes("Sign in - GhostAPI")) {
  throw new Error("Root route should serve the login page first");
}

if (!response.ok) {
  throw new Error(`Dashboard returned HTTP ${response.status}`);
}

if (!html.includes("GhostAPI Dashboard")) {
  throw new Error("Dashboard HTML did not include expected title");
}

if (!html.includes("Build APIs from any website")) {
  throw new Error("Dashboard HTML did not include the SaaS headline");
}

if (!html.includes("GhostAPI Capture")) {
  throw new Error("Dashboard HTML did not include GhostAPI Capture");
}

if (!html.includes("Start capturing")) {
  throw new Error("Dashboard HTML did not include the onboarding flow");
}

if (!html.includes("Chrome extension")) {
  throw new Error("Dashboard HTML did not include the browser extension installer");
}

if (!html.includes("API key status")) {
  throw new Error("Dashboard HTML did not include API key status");
}

if (!html.includes("Saved API library")) {
  throw new Error("Dashboard HTML did not include saved API library");
}

if (!html.includes("Run history")) {
  throw new Error("Dashboard HTML did not include run history");
}

if (!html.includes("Deployment and environment")) {
  throw new Error("Dashboard HTML did not include deployment health");
}

if (!html.includes("Download extension")) {
  throw new Error("Dashboard HTML did not include one-click extension download");
}

if (!html.includes("Recorder status")) {
  throw new Error("Dashboard HTML did not include extension status");
}

if (!html.includes("Production API checking")) {
  throw new Error("Dashboard HTML did not include launch status strip");
}

if (!html.includes("hero-logo")) {
  throw new Error("Dashboard HTML did not include the right-side hero logo");
}

if (!html.includes("Database readiness")) {
  throw new Error("Dashboard HTML did not include database readiness");
}

for (const forbidden of ["Week 11", "Week 12", "Week 13", "Week 14", "Local prototype", "Bookmarklet fallback", "Copy path"]) {
  if (html.includes(forbidden)) {
    throw new Error(`Dashboard HTML still included public milestone text: ${forbidden}`);
  }
}

for (const forbidden of ["Optional demo username", "Optional demo password"]) {
  if (html.includes(forbidden)) {
    throw new Error(`Dashboard HTML still included old credential fields: ${forbidden}`);
  }
}

for (const expected of [
  "Public API URL",
  "/extension/ghostapi-capture.zip",
  "/v1/database/plan",
  "/v1/workflows",
  "Save selected API",
  "/dashboard/login.html",
  "/dashboard/signup.html"
]) {
  if (!html.includes(expected)) {
    throw new Error(`Dashboard HTML did not include production dashboard text: ${expected}`);
  }
}

const cssResponse = await fetch("http://127.0.0.1:4000/dashboard/styles.css");
const jsResponse = await fetch("http://127.0.0.1:4000/dashboard/app.js");
const authJsResponse = await fetch("http://127.0.0.1:4000/dashboard/auth.js");
const loginResponse = await fetch("http://127.0.0.1:4000/dashboard/login.html");
const signupResponse = await fetch("http://127.0.0.1:4000/dashboard/signup.html");
const logoResponse = await fetch("http://127.0.0.1:4000/assets/ghostapi-logo.svg");
const extensionResponse = await fetch("http://127.0.0.1:4000/extension/ghostapi-capture.zip");
const css = await cssResponse.text();
const js = await jsResponse.text();
const authJs = await authJsResponse.text();
const loginHtml = await loginResponse.text();
const signupHtml = await signupResponse.text();

if (!cssResponse.ok) {
  throw new Error(`Dashboard CSS returned HTTP ${cssResponse.status}`);
}

for (const expected of ["overflow-x: hidden", "white-space: pre-wrap", "word-break: break-word"]) {
  if (!css.includes(expected)) {
    throw new Error(`Dashboard CSS did not include overflow guard: ${expected}`);
  }
}

if (!jsResponse.ok) {
  throw new Error(`Dashboard JS returned HTTP ${jsResponse.status}`);
}

if (!authJsResponse.ok || !loginResponse.ok || !signupResponse.ok) {
  throw new Error("Dashboard auth pages must be served as production pages");
}

if (css.includes("textarea:focus {\n  background: #fff7cc;")) {
  throw new Error("Dashboard CSS should not turn workflow editor yellow on focus");
}

if (!css.includes("textarea.workflow-editor:focus") || !css.includes("outline: 4px solid var(--blue)")) {
  throw new Error("Dashboard CSS should keep workflow editor readable on focus");
}

if (!js.includes("/v1/workflows/portal-summary/run") || !js.includes("runDemoWorkflow")) {
  throw new Error("Dashboard hero demo button must run the lightweight hosted demo workflow");
}

if (!js.includes("/v1/workflows/${encodeURIComponent(workflowId)}") || !js.includes("selectedWorkflowId")) {
  throw new Error("Dashboard editor must load and save the selected saved API");
}

if (!js.includes("Browser test:") || !js.includes("ghostapi_key")) {
  throw new Error("Dashboard saved API cards must show private browser test URLs");
}

for (const expected of [
  "ghostapi.dashboard.workspace.v1",
  "x-ghostapi-key",
  "ghostapi_session",
  "ghostapi_key"
]) {
  if (!js.includes(expected)) {
    throw new Error(`Dashboard JS must isolate browser workspaces with ${expected}`);
  }
}

for (const expected of [
  "Sign in to your API workspace",
  "Create your GhostAPI account",
  "auth-logo-panel",
  "/v1/auth/signup",
  "/v1/auth/login",
  "/v1/auth/google/start",
  "auth_error",
  "ghostapi.dashboard.workspace.v1"
]) {
  if (![loginHtml, signupHtml, authJs].some((source) => source.includes(expected))) {
    throw new Error(`Dashboard auth flow missing expected text: ${expected}`);
  }
}

if (js.includes("runAttendance") || js.includes("api.runAttendance")) {
  throw new Error("Dashboard public demo should not call the old credential-based attendance runner");
}

if (!logoResponse.ok) {
  throw new Error(`Dashboard logo returned HTTP ${logoResponse.status}`);
}

if (!extensionResponse.ok) {
  throw new Error(`Extension package returned HTTP ${extensionResponse.status}`);
}

if (extensionResponse.headers.get("content-type") !== "application/zip") {
  throw new Error("Extension package did not return application/zip");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      endpoint: "/dashboard",
      status: response.status,
      assets: {
        css: cssResponse.status,
        js: jsResponse.status,
        authJs: authJsResponse.status,
        login: loginResponse.status,
        signup: signupResponse.status,
        logo: logoResponse.status,
        extension: extensionResponse.status
      },
      contains: [
        "GhostAPI Dashboard",
        "Build APIs from any website",
        "GhostAPI Capture",
        "Start capturing",
        "Chrome extension",
        "API key status",
        "Saved API library",
        "Run history",
        "Deployment and environment",
        "Download extension",
        "Recorder status",
        "Production API checking",
        "Database readiness",
        "Public API URL",
        "/extension/ghostapi-capture.zip",
        "Save selected API",
        "/dashboard/login.html",
        "/dashboard/signup.html"
      ]
    },
    null,
    2
  )
);
