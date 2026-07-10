import { config } from "../config.js";
import type { StoredWorkflowRun } from "../workflows/workflowTypes.js";
import { defaultTenantContext, type GhostApiTenantContext } from "./accountRepository.js";
import { activeStorageDriver, dbAll, dbGet, dbRun } from "./database.js";
import { readJsonFile } from "./jsonFile.js";

type RunsFile = {
  runs: StoredWorkflowRun[];
};

export async function createRun(run: StoredWorkflowRun): Promise<StoredWorkflowRun> {
  await migrateLegacyRunsIfNeeded();
  await insertOrReplaceRun(run);
  return run;
}

export async function updateRun(runId: string, patch: Partial<StoredWorkflowRun>): Promise<StoredWorkflowRun> {
  await migrateLegacyRunsIfNeeded();
  const existingRun = await getRun(runId);

  if (!existingRun) {
    throw new Error(`Run "${runId}" not found`);
  }

  const updatedRun = {
    ...existingRun,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  await insertOrReplaceRun(updatedRun);
  return updatedRun;
}

export type PaginatedRuns = {
  runs: StoredWorkflowRun[];
  total: number;
  limit: number;
  offset: number;
};

export async function listRuns(
  limit = 25,
  offset = 0,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<PaginatedRuns> {
  await migrateLegacyRunsIfNeeded();
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const normalizedOffset = Math.max(offset, 0);
  const totalRow = await dbGet<{ count: number | string }>("SELECT COUNT(*) as count FROM runs WHERE owner_user_id = ?", [
    context.userId
  ]);
  const rows = await dbAll<RunRow>("SELECT * FROM runs WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", [
    context.userId,
    normalizedLimit,
    normalizedOffset
  ]);

  return {
    runs: rows.map(rowToRun),
    total: Number(totalRow?.count ?? 0),
    limit: normalizedLimit,
    offset: normalizedOffset
  };
}

export async function getRun(
  runId: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<StoredWorkflowRun | null> {
  await migrateLegacyRunsIfNeeded();
  const row = await dbGet<RunRow>("SELECT * FROM runs WHERE id = ? AND owner_user_id = ?", [runId, context.userId]);
  return row ? rowToRun(row) : null;
}

async function readRunsFile(): Promise<RunsFile> {
  return readJsonFile<RunsFile>(config.storage.runsFile, { runs: [] });
}

let legacyRunsMigrated = false;

async function migrateLegacyRunsIfNeeded(): Promise<void> {
  if (legacyRunsMigrated) {
    return;
  }

  legacyRunsMigrated = true;

  const countRow = await dbGet<{ count: number | string }>("SELECT COUNT(*) as count FROM runs");

  if (Number(countRow?.count ?? 0) > 0) {
    return;
  }

  const legacyRuns = await readRunsFile();

  for (const run of legacyRuns.runs.reverse()) {
    await insertOrReplaceRun(run);
  }
}

async function insertOrReplaceRun(run: StoredWorkflowRun): Promise<void> {
  const insertSql = activeStorageDriver() === "postgres"
    ? `INSERT INTO runs (
        id,
        owner_user_id,
        organization_id,
        action_id,
        workflow_id,
        workflow_version,
        portal,
        status,
        created_at,
        updated_at,
        input_json,
        result_json,
        error,
        step_log_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        owner_user_id = EXCLUDED.owner_user_id,
        organization_id = EXCLUDED.organization_id,
        action_id = EXCLUDED.action_id,
        workflow_id = EXCLUDED.workflow_id,
        workflow_version = EXCLUDED.workflow_version,
        portal = EXCLUDED.portal,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        input_json = EXCLUDED.input_json,
        result_json = EXCLUDED.result_json,
        error = EXCLUDED.error,
        step_log_json = EXCLUDED.step_log_json`
    : `INSERT OR REPLACE INTO runs (
        id,
        owner_user_id,
        organization_id,
        action_id,
        workflow_id,
        workflow_version,
        portal,
        status,
        created_at,
        updated_at,
        input_json,
        result_json,
        error,
        step_log_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await dbRun(insertSql, [
    run.id,
    run.ownerUserId ?? defaultTenantContext.userId,
    run.organizationId ?? defaultTenantContext.organizationId,
    run.actionId,
    run.workflowId,
    run.workflowVersion,
    run.portal,
    run.status,
    run.createdAt,
    run.updatedAt,
    JSON.stringify(run.input),
    run.result === undefined ? null : JSON.stringify(run.result),
    run.error ?? null,
    JSON.stringify(run.stepLog)
  ]);
}

type RunRow = {
  id: string;
  owner_user_id: string;
  organization_id: string;
  action_id: string;
  workflow_id: string;
  workflow_version: number;
  portal: string;
  status: StoredWorkflowRun["status"];
  created_at: string;
  updated_at: string;
  input_json: string;
  result_json: string | null;
  error: string | null;
  step_log_json: string;
};

function rowToRun(row: RunRow): StoredWorkflowRun {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    organizationId: row.organization_id,
    actionId: row.action_id,
    workflowId: row.workflow_id,
    workflowVersion: row.workflow_version,
    portal: row.portal,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    input: JSON.parse(row.input_json) as StoredWorkflowRun["input"],
    result: row.result_json ? JSON.parse(row.result_json) : undefined,
    error: row.error ?? undefined,
    stepLog: JSON.parse(row.step_log_json) as StoredWorkflowRun["stepLog"]
  };
}
