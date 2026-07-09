import fs from "node:fs";
import path from "node:path";

const extensionDir = path.join(process.cwd(), "extensions", "chrome");
const requiredFiles = ["manifest.json", "background.js", "popup.html", "popup.css", "popup.js", "content-recorder.js"];

for (const file of requiredFiles) {
  const filePath = path.join(extensionDir, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing extension file: ${file}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8")) as {
  manifest_version?: number;
  permissions?: string[];
  action?: {
    default_popup?: string;
  };
  background?: {
    service_worker?: string;
  };
};

if (manifest.manifest_version !== 3) {
  throw new Error("Extension must use Manifest V3");
}

for (const permission of ["activeTab", "scripting", "storage", "tabs"]) {
  if (!manifest.permissions?.includes(permission)) {
    throw new Error(`Extension manifest missing permission: ${permission}`);
  }
}

if (manifest.action?.default_popup !== "popup.html") {
  throw new Error("Extension manifest must point to popup.html");
}

if (manifest.background?.service_worker !== "background.js") {
  throw new Error("Extension manifest must point to background.js");
}

const contentRecorder = fs.readFileSync(path.join(extensionDir, "content-recorder.js"), "utf8");
const popup = fs.readFileSync(path.join(extensionDir, "popup.html"), "utf8");

for (const expected of ["Save API", "Record clicks/fills", "/v1/workflows/"]) {
  if (!contentRecorder.includes(expected)) {
    throw new Error(`Extension recorder missing expected text: ${expected}`);
  }
}

for (const expected of ["Check server connection", "Your APIs will run here"]) {
  if (!popup.includes(expected)) {
    throw new Error(`Extension popup missing expected text: ${expected}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      extension: "extensions/chrome",
      manifestVersion: manifest.manifest_version,
      files: requiredFiles
    },
    null,
    2
  )
);
