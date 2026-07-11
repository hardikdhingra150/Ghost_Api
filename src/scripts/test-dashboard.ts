const response = await fetch("http://127.0.0.1:4000/dashboard");
const html = await response.text();

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

if (!html.includes("Workflow builder")) {
  throw new Error("Dashboard HTML did not include workflow builder");
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

for (const expected of [
  "Public API URL",
  "/extension/ghostapi-capture.zip",
  "/v1/database/plan",
  "/v1/workflows"
]) {
  if (!html.includes(expected)) {
    throw new Error(`Dashboard HTML did not include production dashboard text: ${expected}`);
  }
}

const cssResponse = await fetch("http://127.0.0.1:4000/dashboard/styles.css");
const jsResponse = await fetch("http://127.0.0.1:4000/dashboard/app.js");
const logoResponse = await fetch("http://127.0.0.1:4000/assets/ghostapi-logo.svg");
const extensionResponse = await fetch("http://127.0.0.1:4000/extension/ghostapi-capture.zip");
const js = await jsResponse.text();

if (!cssResponse.ok) {
  throw new Error(`Dashboard CSS returned HTTP ${cssResponse.status}`);
}

if (!jsResponse.ok) {
  throw new Error(`Dashboard JS returned HTTP ${jsResponse.status}`);
}

if (!js.includes("/v1/workflows/portal-summary/run") || !js.includes("runDemoWorkflow")) {
  throw new Error("Dashboard hero demo button must run the lightweight hosted demo workflow");
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
        "Workflow builder",
        "Run history",
        "Deployment and environment",
        "Download extension",
        "Recorder status",
        "Production API checking",
        "Database readiness",
        "Public API URL",
        "/extension/ghostapi-capture.zip"
      ]
    },
    null,
    2
  )
);
