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
  throw new Error("Dashboard HTML did not include the GhostAPI bookmarklet");
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

if (!html.includes("Local and deployed use")) {
  throw new Error("Dashboard HTML did not include setup commands");
}

if (!html.includes("npm run package:extension")) {
  throw new Error("Dashboard HTML did not include extension packaging command");
}

for (const forbidden of ["Week 11", "Week 12", "Week 13", "Local prototype"]) {
  if (html.includes(forbidden)) {
    throw new Error(`Dashboard HTML still included public milestone text: ${forbidden}`);
  }
}

for (const expected of ["Public API URL", "extensions/chrome", "npm run test:deployment", "/v1/workflows"]) {
  if (!html.includes(expected)) {
    throw new Error(`Dashboard HTML did not include production dashboard text: ${expected}`);
  }
}

const cssResponse = await fetch("http://127.0.0.1:4000/dashboard/styles.css");
const jsResponse = await fetch("http://127.0.0.1:4000/dashboard/app.js");
const logoResponse = await fetch("http://127.0.0.1:4000/assets/ghostapi-logo.svg");
const bookmarkletResponse = await fetch("http://127.0.0.1:4000/capture/bookmarklet.js");

if (!cssResponse.ok) {
  throw new Error(`Dashboard CSS returned HTTP ${cssResponse.status}`);
}

if (!jsResponse.ok) {
  throw new Error(`Dashboard JS returned HTTP ${jsResponse.status}`);
}

if (!logoResponse.ok) {
  throw new Error(`Dashboard logo returned HTTP ${logoResponse.status}`);
}

if (!bookmarkletResponse.ok) {
  throw new Error(`Bookmarklet script returned HTTP ${bookmarkletResponse.status}`);
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
        bookmarklet: bookmarkletResponse.status
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
        "Local and deployed use",
        "npm run package:extension",
        "Public API URL",
        "extensions/chrome",
        "npm run test:deployment"
      ]
    },
    null,
    2
  )
);
