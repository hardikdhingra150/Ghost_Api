import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const extensionDir = path.join(root, "extensions", "chrome");
const outputDir = path.join(root, "extensions", "dist");
const outputFile = path.join(outputDir, "ghostapi-capture.zip");

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(outputFile, { force: true });

const zip = spawnSync("zip", ["-r", outputFile, "."], {
  cwd: extensionDir,
  stdio: "inherit"
});

if (zip.status !== 0) {
  throw new Error("Could not package extension. Make sure the zip command is available.");
}

console.log(`Packaged extension: ${outputFile}`);
