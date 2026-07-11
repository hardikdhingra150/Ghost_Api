import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.js";
import { dbRun, initializeDatabase } from "../storage/database.js";

type SqliteRow = Record<string, string | number | null>;

if (config.storage.databaseDriver !== "postgres" || !config.deployment.databaseUrl) {
  throw new Error("Set GHOSTAPI_DATABASE_DRIVER=postgres and DATABASE_URL before running the migration.");
}

if (!fs.existsSync(config.storage.databaseFile)) {
  throw new Error(`SQLite database not found: ${config.storage.databaseFile}`);
}

await initializeDatabase();

const sqlite = new DatabaseSync(config.storage.databaseFile, { readOnly: true });

await copyTable("users", ["id", "email", "username", "password_hash", "name", "created_at"], ["id"]);
await copyTable("organizations", ["id", "name", "created_at"], ["id"]);
await copyTable("organization_members", ["organization_id", "user_id", "role", "created_at"], [
  "organization_id",
  "user_id"
]);
await copyTable(
  "workflows",
  [
    "id",
    "owner_user_id",
    "organization_id",
    "portal",
    "name",
    "description",
    "version",
    "json",
    "created_at",
    "updated_at"
  ],
  ["id", "owner_user_id"]
);
await copyTable(
  "workflow_versions",
  ["id", "workflow_id", "owner_user_id", "organization_id", "version", "json", "created_at"],
  ["id"]
);
await copyTable(
  "runs",
  [
    "id",
    "owner_user_id",
    "organization_id",
    "action_id",
    "workflow_id",
    "workflow_version",
    "portal",
    "status",
    "created_at",
    "updated_at",
    "input_json",
    "result_json",
    "error",
    "step_log_json"
  ],
  ["id"]
);
await copyTable(
  "api_keys",
  ["id", "owner_user_id", "organization_id", "name", "key_hash", "key_preview", "created_at", "revoked_at"],
  ["id"]
);

console.log(
  JSON.stringify(
    {
      ok: true,
      migratedFrom: config.storage.databaseFile,
      migratedTo: "postgres",
      tables: ["users", "organizations", "organization_members", "workflows", "workflow_versions", "runs", "api_keys"]
    },
    null,
    2
  )
);

async function copyTable(table: string, columns: string[], conflictColumns: string[]): Promise<void> {
  const rows = sqlite.prepare(`SELECT ${columns.join(", ")} FROM ${table}`).all() as SqliteRow[];

  for (const row of rows) {
    const placeholders = columns.map(() => "?").join(", ");
    const updates = columns
      .filter((column) => !conflictColumns.includes(column))
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(", ");
    const sql = `INSERT INTO ${table} (${columns.join(", ")})
      VALUES (${placeholders})
      ON CONFLICT (${conflictColumns.join(", ")}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`;

    await dbRun(sql, columns.map((column) => row[column]));
  }
}
