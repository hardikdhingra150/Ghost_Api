const response = await fetch("http://127.0.0.1:4000/dashboard");
const html = await response.text();

if (!response.ok) {
  throw new Error(`Dashboard returned HTTP ${response.status}`);
}

if (!html.includes("GhostAPI Dashboard")) {
  throw new Error("Dashboard HTML did not include expected title");
}

if (!html.includes("Run attendance")) {
  throw new Error("Dashboard HTML did not include the run button");
}

if (!html.includes("GhostAPI Capture")) {
  throw new Error("Dashboard HTML did not include the GhostAPI bookmarklet");
}

if (!html.includes("Install bookmark")) {
  throw new Error("Dashboard HTML did not include the bookmark installer button");
}

if (!html.includes("Browser extension")) {
  throw new Error("Dashboard HTML did not include the browser extension installer");
}

if (!html.includes("Setup commands")) {
  throw new Error("Dashboard HTML did not include setup commands");
}

if (!html.includes("npm run package:extension")) {
  throw new Error("Dashboard HTML did not include extension packaging command");
}

if (!html.includes("Week 11 cloud foundation")) {
  throw new Error("Dashboard HTML did not include Week 11 cloud foundation panel");
}

if (!html.includes("Week 12 extension readiness")) {
  throw new Error("Dashboard HTML did not include Week 12 extension readiness panel");
}

if (!html.includes("Chrome Web Store preparation")) {
  throw new Error("Dashboard HTML did not include Chrome Web Store preparation text");
}

if (!html.includes("Week 13 deployment target")) {
  throw new Error("Dashboard HTML did not include Week 13 deployment target panel");
}

for (const expected of ["Render", "Supabase Postgres", "Upstash Redis", "npm run test:deployment"]) {
  if (!html.includes(expected)) {
    throw new Error(`Dashboard HTML did not include deployment text: ${expected}`);
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
        "Run attendance",
        "GhostAPI Capture",
        "Install bookmark",
        "Browser extension",
        "Setup commands",
        "npm run package:extension",
        "Week 11 cloud foundation",
        "Week 12 extension readiness",
        "Chrome Web Store preparation",
        "Week 13 deployment target",
        "Render",
        "Supabase Postgres",
        "Upstash Redis",
        "npm run test:deployment"
      ]
    },
    null,
    2
  )
);
