import { config } from "../config.js";
import type { StoredWorkflowRun } from "../workflows/workflowTypes.js";
import { defaultTenantContext, type GhostApiTenantContext } from "./accountRepository.js";
import { getDatabase } from "./database.js";
import { readJsonFile } from "./jsonFile.js";

type RunsFile = {
  runs: StoredWorkflowRun[];
};

export async function createRun(run: StoredWorkflowRun): Promise<StoredWorkflowRun> {
  await migrateLegacyRunsIfNeeded();
  insertOrReplaceRun(run);
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

  insertOrReplaceRun(updatedRun);
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
  const totalRow = getDatabase()
    .prepare("SELECT COUNT(*) as count FROM runs WHERE owner_user_id = ?")
    .get(context.userId) as { count: number };
  const rows = getDatabase()
    .prepare("SELECT * FROM runs WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(context.userId, normalizedLimit, normalizedOffset) as RunRow[];

  return {
    runs: rows.map(rowToRun),
    total: totalRow.count,
    limit: normalizedLimit,
    offset: normalizedOffset
  };
}

export async function getRun(
  runId: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<StoredWorkflowRun | null> {
  await migrateLegacyRunsIfNeeded();
  const row = getDatabase()
    .prepare("SELECT * FROM runs WHERE id = ? AND owner_user_id = ?")
    .get(runId, context.userId) as RunRow | undefined;
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

  const countRow = getDatabase().prepare("SELECT COUNT(*) as count FROM runs").get() as { count: number };

  if (countRow.count > 0) {
    return;
  }

  const legacyRuns = await readRunsFile();

  for (const run of legacyRuns.runs.reverse()) {
    insertOrReplaceRun(run);
  }
}

function insertOrReplaceRun(run: StoredWorkflowRun): void {
  getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO runs (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
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
    );
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
