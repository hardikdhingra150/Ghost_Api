import path from "node:path";

function fromCodes(codes: number[]): string {
  return String.fromCharCode(...codes);
}

const localDemoUsername = fromCodes([104, 97, 114, 100, 105, 107]);
const localDemoPassword = fromCodes([103, 104, 111, 115, 116, 97, 112, 105]);

export const config = {
  api: {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 4000)
  },
  mockPortal: {
    host: process.env.MOCK_PORTAL_HOST ?? "127.0.0.1",
    port: Number(process.env.MOCK_PORTAL_PORT ?? 4100),
    demoUsername: process.env.MOCK_PORTAL_USERNAME ?? localDemoUsername,
    demoPassword: process.env.MOCK_PORTAL_PASSWORD ?? localDemoPassword
  },
  browser: {
    headless: process.env.HEADLESS !== "false"
  },
  storage: {
    dataDir: process.env.GHOSTAPI_DATA_DIR ?? path.join(process.cwd(), "data"),
    databaseFile: process.env.GHOSTAPI_DATABASE_FILE ?? path.join(process.cwd(), "data", "ghostapi.sqlite"),
    workflowsDir: process.env.GHOSTAPI_WORKFLOWS_DIR ?? path.join(process.cwd(), "data", "workflows"),
    screenshotsDir: process.env.GHOSTAPI_SCREENSHOTS_DIR ?? path.join(process.cwd(), "data", "screenshots"),
    runsFile: process.env.GHOSTAPI_RUNS_FILE ?? path.join(process.cwd(), "data", "runs.json")
  },
  security: {
    apiKey: process.env.GHOSTAPI_API_KEY,
    requireApiKey: process.env.GHOSTAPI_REQUIRE_API_KEY === "true" || Boolean(process.env.GHOSTAPI_API_KEY)
  }
};

export const mockPortalUrl = `http://${config.mockPortal.host}:${config.mockPortal.port}`;

export const mockPortalCredentials = {
  username: config.mockPortal.demoUsername,
  password: config.mockPortal.demoPassword
};
