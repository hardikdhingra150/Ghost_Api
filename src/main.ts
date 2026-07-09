import { config } from "./config.js";
import { createGhostApi } from "./api/ghostApi.js";
import { startMockPortal } from "./mock-portal/mockPortal.js";

async function main(): Promise<void> {
  await startMockPortal();

  const api = createGhostApi();
  await api.listen({ host: config.api.host, port: config.api.port });

  api.log.info(`GhostAPI: http://${config.api.host}:${config.api.port}`);
  api.log.info(`Mock portal: http://${config.mockPortal.host}:${config.mockPortal.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
