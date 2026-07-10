import { config } from "./config.js";
import { createGhostApi } from "./api/ghostApi.js";
import { startMockPortal } from "./mock-portal/mockPortal.js";
import { ensureDefaultAccount } from "./storage/accountRepository.js";
import { initializeDatabase } from "./storage/database.js";

async function main(): Promise<void> {
  await startMockPortal();
  await initializeDatabase();
  await ensureDefaultAccount();

  const api = createGhostApi();
  await api.listen({ host: config.api.host, port: config.api.port });

  api.log.info(`GhostAPI: http://${config.api.host}:${config.api.port}`);
  api.log.info(`Mock portal: http://${config.mockPortal.host}:${config.mockPortal.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
