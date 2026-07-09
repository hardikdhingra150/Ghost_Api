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
      contains: ["GhostAPI Dashboard", "Run attendance", "GhostAPI Capture", "Install bookmark"]
    },
    null,
    2
  )
);
