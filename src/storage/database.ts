import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.js";

let database: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!database) {
    fs.mkdirSync(path.dirname(config.storage.databaseFile), { recursive: true });
    database = new DatabaseSync(config.storage.databaseFile);
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA foreign_keys = ON");
    migrateDatabase(database);
  }

  return database;
}

function migrateDatabase(db: DatabaseSync): void {
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

  addColumnIfMissing(db, "workflows", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addColumnIfMissing(db, "workflows", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");
  addColumnIfMissing(db, "workflow_versions", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addColumnIfMissing(db, "workflow_versions", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");
  addColumnIfMissing(db, "runs", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addColumnIfMissing(db, "runs", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");
  addColumnIfMissing(db, "api_keys", "owner_user_id", "TEXT NOT NULL DEFAULT 'local-user'");
  addColumnIfMissing(db, "api_keys", "organization_id", "TEXT NOT NULL DEFAULT 'local-org'");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_owner_created_at ON runs(owner_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id, version DESC);
    CREATE INDEX IF NOT EXISTS idx_workflows_owner ON workflows(owner_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at ON api_keys(revoked_at);
  `);
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];

  if (columns.some((item) => item.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
