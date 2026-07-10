import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

type QueryParam = string | number | null;
type Row = Record<string, unknown>;

let sqliteDatabase: DatabaseSync | null = null;
let postgresPool: pg.Pool | null = null;
let initialized = false;

export type StorageDriver = "sqlite" | "postgres";

export function activeStorageDriver(): StorageDriver {
  return config.storage.databaseDriver === "postgres" && Boolean(config.deployment.databaseUrl)
    ? "postgres"
    : "sqlite";
}

export async function initializeDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  if (activeStorageDriver() === "postgres") {
    postgresPool = new Pool({
      connectionString: config.deployment.databaseUrl,
      ssl: config.deployment.databaseUrl?.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false }
    });
    await migratePostgres();
  } else {
    getSqliteDatabase();
  }

  initialized = true;
}

export function getSqliteDatabase(): DatabaseSync {
  if (!sqliteDatabase) {
    fs.mkdirSync(path.dirname(config.storage.databaseFile), { recursive: true });
    sqliteDatabase = new DatabaseSync(config.storage.databaseFile);
    sqliteDatabase.exec("PRAGMA journal_mode = WAL");
    sqliteDatabase.exec("PRAGMA foreign_keys = ON");
    migrateSqlite(sqliteDatabase);
  }

  return sqliteDatabase;
}

export async function dbRun(sql: string, params: QueryParam[] = []): Promise<void> {
  if (activeStorageDriver() === "postgres") {
    await getPostgresPool().query(toPostgresSql(sql), params);
    return;
  }

  getSqliteDatabase().prepare(sql).run(...params);
}

export async function dbGet<T extends Row>(sql: string, params: QueryParam[] = []): Promise<T | undefined> {
  if (activeStorageDriver() === "postgres") {
    const result = await getPostgresPool().query(toPostgresSql(sql), params);
    return result.rows[0] as T | undefined;
  }

  return getSqliteDatabase().prepare(sql).get(...params) as T | undefined;
}

export async function dbAll<T extends Row>(sql: string, params: QueryParam[] = []): Promise<T[]> {
  if (activeStorageDriver() === "postgres") {
    const result = await getPostgresPool().query(toPostgresSql(sql), params);
    return result.rows as T[];
  }

  return getSqliteDatabase().prepare(sql).all(...params) as T[];
}

export async function dbTransaction(steps: Array<() => Promise<void>>): Promise<void> {
  if (activeStorageDriver() === "postgres") {
    for (const step of steps) {
      await step();
    }
    return;
  }

  getSqliteDatabase().exec("BEGIN");
  try {
    for (const step of steps) {
      await step();
    }
    getSqliteDatabase().exec("COMMIT");
  } catch (error) {
    getSqliteDatabase().exec("ROLLBACK");
    throw error;
  }
}

function getPostgresPool(): pg.Pool {
  if (!postgresPool) {
    throw new Error("Postgres storage is not initialized. Call initializeDatabase() first.");
  }

  return postgresPool;
}

function toPostgresSql(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function migrateSqlite(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, user_id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      portal TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version INTEGER NOT NULL,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      version INTEGER NOT NULL,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      action_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      workflow_version INTEGER NOT NULL,
      portal TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      input_json TEXT NOT NULL,
      result_json TEXT,
      error TEXT,
      step_log_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_preview TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
  `);

  addSqliteColumnIfMissing(db, "workflows", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addSqliteColumnIfMissing(db, "workflows", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");
  addSqliteColumnIfMissing(db, "workflow_versions", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addSqliteColumnIfMissing(db, "workflow_versions", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");
  addSqliteColumnIfMissing(db, "runs", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addSqliteColumnIfMissing(db, "runs", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");
  addSqliteColumnIfMissing(db, "api_keys", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addSqliteColumnIfMissing(db, "api_keys", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");

  db.exec(commonIndexes);
}

async function migratePostgres(): Promise<void> {
  const pool = getPostgresPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      portal TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version INTEGER NOT NULL,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id BIGSERIAL PRIMARY KEY,
      workflow_id TEXT NOT NULL REFERENCES workflows(id),
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      version INTEGER NOT NULL,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      action_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      workflow_version INTEGER NOT NULL,
      portal TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      input_json TEXT NOT NULL,
      result_json TEXT,
      error TEXT,
      step_log_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      organization_id TEXT NOT NULL DEFAULT 'local-org',
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_preview TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
  `);

  await pool.query(commonIndexes);
}

const commonIndexes = `
  CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_runs_owner_created_at ON runs(owner_user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
  CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id, version DESC);
  CREATE INDEX IF NOT EXISTS idx_workflows_owner ON workflows(owner_user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at ON api_keys(revoked_at);
`;

function addSqliteColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];

  if (columns.some((item) => item.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
