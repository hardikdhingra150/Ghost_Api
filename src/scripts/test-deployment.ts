import fs from "node:fs";
import path from "node:path";

function readRequiredFile(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing deployment file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}

const packageJson = JSON.parse(readRequiredFile("package.json")) as {
  engines?: {
    node?: string;
  };
  scripts?: Record<string, string>;
};

if (packageJson.engines?.node !== ">=24") {
  throw new Error("package.json must pin GhostAPI production to Node >=24 for node:sqlite support");
}

if (packageJson.scripts?.["test:deployment"] !== "tsx src/scripts/test-deployment.ts") {
  throw new Error("package.json missing test:deployment script");
}

const dockerfile = readRequiredFile("Dockerfile");
const dockerignore = readRequiredFile(".dockerignore");
const renderYaml = readRequiredFile("render.yaml");
const envExample = readRequiredFile(".env.example");
const deploymentDocs = readRequiredFile("docs/week13-deployment.md");

for (const expected of ["FROM node:24-slim", "npx playwright install --with-deps chromium", "CMD [\"npm\", \"start\"]"]) {
  if (!dockerfile.includes(expected)) {
    throw new Error(`Dockerfile missing expected production line: ${expected}`);
  }
}

for (const ignored of ["node_modules/", "data/", ".env", "extensions/dist/"]) {
  if (!dockerignore.includes(ignored)) {
    throw new Error(`.dockerignore missing ${ignored}`);
  }
}

for (const expected of [
  "name: ghostapi-api",
  "runtime: docker",
  "healthCheckPath: /health",
  "GHOSTAPI_DEPLOYMENT_PROVIDER",
  "GHOSTAPI_API_KEY"
]) {
  if (!renderYaml.includes(expected)) {
    throw new Error(`render.yaml missing ${expected}`);
  }
}

for (const expected of [
  "GHOSTAPI_PUBLIC_API_URL=http://127.0.0.1:4000",
  "GHOSTAPI_REQUIRE_API_KEY=false",
  "# GHOSTAPI_API_KEY=replace-with-generated-key",
  "# DATABASE_URL=postgresql://example.invalid/ghostapi",
  "# REDIS_URL=rediss://example.invalid:6379"
]) {
  if (!envExample.includes(expected)) {
    throw new Error(`.env.example missing safe env template: ${expected}`);
  }
}

for (const expected of ["Render", "Supabase Postgres", "Upstash Redis", "npm run test:deployment"]) {
  if (!deploymentDocs.includes(expected)) {
    throw new Error(`Week 13 deployment docs missing ${expected}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      selectedProvider: "Render",
      productionRuntime: packageJson.engines.node,
      files: ["Dockerfile", ".dockerignore", "render.yaml", ".env.example", "docs/week13-deployment.md"]
    },
    null,
    2
  )
);
