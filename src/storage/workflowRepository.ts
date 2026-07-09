import path from "node:path";
import { config } from "../config.js";
import { getAttendanceWorkflow } from "../workflows/definitions/getAttendanceWorkflow.js";
import { googleSearchWorkflow, portalSummaryWorkflow } from "../workflows/definitions/genericWorkflows.js";
import type { PortalWorkflow } from "../workflows/workflowTypes.js";
import { validatePortalWorkflow } from "../workflows/workflowValidation.js";
import { getDatabase } from "./database.js";
import { readJsonFile } from "./jsonFile.js";

const bundledWorkflows: Record<string, PortalWorkflow> = {
  [getAttendanceWorkflow.id]: getAttendanceWorkflow,
  [portalSummaryWorkflow.id]: portalSummaryWorkflow,
  [googleSearchWorkflow.id]: googleSearchWorkflow
};

export type WorkflowVersionSummary = {
  version: number;
  createdAt: string;
};

export type WorkflowDiffChange = {
  path: string;
  before: unknown;
  after: unknown;
};

export async function getWorkflow(workflowId: string): Promise<PortalWorkflow> {
  const bundledWorkflow = bundledWorkflows[workflowId];

  if (bundledWorkflow) {
    await seedWorkflowIfNeeded(workflowId, bundledWorkflow);
  }

  const workflow = findWorkflow(workflowId);

  if (workflow) {
    return workflow;
  }

  if (!bundledWorkflow) {
    throw new Error(`Unknown workflow "${workflowId}"`);
  }

  await saveWorkflow(bundledWorkflow);
  return bundledWorkflow;
}

export async function listWorkflows(): Promise<PortalWorkflow[]> {
  await Promise.all(Object.keys(bundledWorkflows).map((workflowId) => getWorkflow(workflowId)));
  return listStoredWorkflows();
}

export async function saveWorkflow(workflow: PortalWorkflow): Promise<void> {
  const validatedWorkflow = validatePortalWorkflow(workflow);
  const db = getDatabase();
  const now = new Date().toISOString();
  const existingWorkflow = findWorkflow(validatedWorkflow.id);
  const workflowJson = JSON.stringify(validatedWorkflow);

  if (existingWorkflow) {
    db.prepare(
      `UPDATE workflows
       SET portal = ?, name = ?, description = ?, version = ?, json = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      validatedWorkflow.portal,
      validatedWorkflow.name,
      validatedWorkflow.description,
      validatedWorkflow.version,
      workflowJson,
      now,
      validatedWorkflow.id
    );
  } else {
    db.prepare(
      `INSERT INTO workflows (id, portal, name, description, version, json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      validatedWorkflow.id,
      validatedWorkflow.portal,
      validatedWorkflow.name,
      validatedWorkflow.description,
      validatedWorkflow.version,
      workflowJson,
      now,
      now
    );
  }

  db.prepare(
    `INSERT INTO workflow_versions (workflow_id, version, json, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(validatedWorkflow.id, validatedWorkflow.version, workflowJson, now);
}

export async function listWorkflowVersions(workflowId: string): Promise<WorkflowVersionSummary[]> {
  await getWorkflow(workflowId);

  const rows = getDatabase()
    .prepare(
      `SELECT version, created_at
       FROM workflow_versions
       WHERE workflow_id = ?
       ORDER BY version DESC`
    )
    .all(workflowId) as { version: number; created_at: string }[];

  return rows.map((row) => ({
    version: row.version,
    createdAt: row.created_at
  }));
}

export async function getWorkflowVersion(workflowId: string, version: number): Promise<PortalWorkflow | null> {
  await getWorkflow(workflowId);

  const row = getDatabase()
    .prepare(
      `SELECT json
       FROM workflow_versions
       WHERE workflow_id = ? AND version = ?
       ORDER BY id DESC
       LIMIT 1`
    )
    .get(workflowId, version) as { json: string } | undefined;

  return row ? validatePortalWorkflow(JSON.parse(row.json)) : null;
}

export async function restoreWorkflowVersion(workflowId: string, version: number): Promise<PortalWorkflow | null> {
  const workflowVersion = await getWorkflowVersion(workflowId, version);

  if (!workflowVersion) {
    return null;
  }

  const currentWorkflow = await getWorkflow(workflowId);
  const restoredWorkflow = {
    ...workflowVersion,
    version: currentWorkflow.version + 1
  };

  await saveWorkflow(restoredWorkflow);
  return restoredWorkflow;
}

export async function diffWorkflowVersions(
  workflowId: string,
  fromVersion: number,
  toVersion: number
): Promise<{ from: PortalWorkflow; to: PortalWorkflow; changes: WorkflowDiffChange[] } | null> {
  const from = await getWorkflowVersion(workflowId, fromVersion);
  const to = await getWorkflowVersion(workflowId, toVersion);

  if (!from || !to) {
    return null;
  }

  return {
    from,
    to,
    changes: diffValues(from, to)
  };
}

function getWorkflowPath(workflowId: string): string {
  return path.join(config.storage.workflowsDir, `${workflowId}.json`);
}

async function seedWorkflowIfNeeded(workflowId: string, bundledWorkflow: PortalWorkflow): Promise<void> {
  if (findWorkflow(workflowId)) {
    return;
  }

  const legacyWorkflow = await readJsonFile<PortalWorkflow | null>(getWorkflowPath(workflowId), null);
  await saveWorkflow(legacyWorkflow ?? bundledWorkflow);
}

function findWorkflow(workflowId: string): PortalWorkflow | null {
  const row = getDatabase()
    .prepare("SELECT json FROM workflows WHERE id = ?")
    .get(workflowId) as { json: string } | undefined;

  if (!row) {
    return null;
  }

  return validatePortalWorkflow(JSON.parse(row.json));
}

function listStoredWorkflows(): PortalWorkflow[] {
  const rows = getDatabase()
    .prepare("SELECT json FROM workflows ORDER BY updated_at DESC")
    .all() as { json: string }[];

  return rows.map((row) => validatePortalWorkflow(JSON.parse(row.json)));
}

function diffValues(before: unknown, after: unknown, currentPath = "$"): WorkflowDiffChange[] {
  if (Object.is(before, after)) {
    return [];
  }

  if (!isPlainObject(before) || !isPlainObject(after)) {
    if (Array.isArray(before) && Array.isArray(after)) {
      return diffArrays(before, after, currentPath);
    }

    return [{ path: currentPath, before, after }];
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: WorkflowDiffChange[] = [];

  for (const key of keys) {
    changes.push(...diffValues(before[key], after[key], `${currentPath}.${key}`));
  }

  return changes;
}

function diffArrays(before: unknown[], after: unknown[], currentPath: string): WorkflowDiffChange[] {
  const maxLength = Math.max(before.length, after.length);
  const changes: WorkflowDiffChange[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    changes.push(...diffValues(before[index], after[index], `${currentPath}[${index}]`));
  }

  return changes;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
