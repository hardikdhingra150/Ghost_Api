import fs from "node:fs";
import path from "node:path";

const extensionDir = path.join(process.cwd(), "extensions", "chrome");
const requiredFiles = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "content-recorder.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png"
];
const requiredStoreDocs = ["PRIVACY.md", "PERMISSIONS.md", "STORE_LISTING.md"];

for (const file of requiredFiles) {
  const filePath = path.join(extensionDir, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing extension file: ${file}`);
  }
}

for (const file of requiredStoreDocs) {
  const filePath = path.join(process.cwd(), "extensions", file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing extension store-readiness file: ${file}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8")) as {
  manifest_version?: number;
  permissions?: string[];
  action?: {
    default_popup?: string;
    default_icon?: Record<string, string>;
  };
  icons?: Record<string, string>;
  background?: {
    service_worker?: string;
  };
  host_permissions?: string[];
  homepage_url?: string;
};

if (manifest.manifest_version !== 3) {
  throw new Error("Extension must use Manifest V3");
}

for (const permission of ["activeTab", "scripting", "storage"]) {
  if (!manifest.permissions?.includes(permission)) {
    throw new Error(`Extension manifest missing permission: ${permission}`);
  }
}

if (manifest.permissions?.includes("tabs")) {
  throw new Error("Extension should avoid the broad tabs permission for store readiness");
}

if (!manifest.host_permissions?.includes("https://ghostapi-api.onrender.com/*")) {
  throw new Error("Extension manifest must include the deployed Render GhostAPI host");
}

for (const size of ["16", "32", "48", "128"]) {
  const iconPath = `icons/icon-${size}.png`;

  if (manifest.icons?.[size] !== iconPath || manifest.action?.default_icon?.[size] !== iconPath) {
    throw new Error(`Extension manifest missing GhostAPI icon ${size}`);
  }
}

if (!manifest.homepage_url) {
  throw new Error("Extension manifest should include homepage_url for store readiness");
}

if (manifest.action?.default_popup !== "popup.html") {
  throw new Error("Extension manifest must point to popup.html");
}

if (manifest.background?.service_worker !== "background.js") {
  throw new Error("Extension manifest must point to background.js");
}

const contentRecorder = fs.readFileSync(path.join(extensionDir, "content-recorder.js"), "utf8");
const popup = fs.readFileSync(path.join(extensionDir, "popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(extensionDir, "popup.js"), "utf8");

for (const expected of ["Save API", "Record clicks/fills", "/v1/workflows/"]) {
  if (!contentRecorder.includes(expected)) {
    throw new Error(`Extension recorder missing expected text: ${expected}`);
  }
}

for (const expected of ["Check server connection", "Your APIs will run here", "Privacy by design", "Use cloud"]) {
  if (!popup.includes(expected)) {
    throw new Error(`Extension popup missing expected text: ${expected}`);
  }
}

if (!popup.includes("icons/icon-48.png") || !popupJs.includes("https://ghostapi-api.onrender.com")) {
  throw new Error("Extension popup must show the GhostAPI logo and default cloud shortcut to Render");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      extension: "extensions/chrome",
      manifestVersion: manifest.manifest_version,
      files: requiredFiles,
      storeDocs: requiredStoreDocs
    },
    null,
    2
  )
);
