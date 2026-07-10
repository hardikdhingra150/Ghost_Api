import path from "node:path";
import { config } from "../config.js";
import { getAttendanceWorkflow } from "../workflows/definitions/getAttendanceWorkflow.js";
import { googleSearchWorkflow, portalSummaryWorkflow } from "../workflows/definitions/genericWorkflows.js";
import type { PortalWorkflow } from "../workflows/workflowTypes.js";
import { validatePortalWorkflow } from "../workflows/workflowValidation.js";
import { defaultTenantContext, type GhostApiTenantContext } from "./accountRepository.js";
import { dbAll, dbGet, dbRun } from "./database.js";
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

export async function getWorkflow(
  workflowId: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<PortalWorkflow> {
  const bundledWorkflow = bundledWorkflows[workflowId];

  if (bundledWorkflow) {
    await seedWorkflowIfNeeded(workflowId, bundledWorkflow, context);
  }

  const workflow = await findWorkflow(workflowId, context);

  if (workflow) {
    return workflow;
  }

  if (!bundledWorkflow) {
    throw new Error(`Unknown workflow "${workflowId}"`);
  }

  await saveWorkflow(bundledWorkflow, context);
  return bundledWorkflow;
}

export async function listWorkflows(context: GhostApiTenantContext = defaultTenantContext): Promise<PortalWorkflow[]> {
  await Promise.all(Object.keys(bundledWorkflows).map((workflowId) => getWorkflow(workflowId, context)));
  return listStoredWorkflows(context);
}

export async function saveWorkflow(
  workflow: PortalWorkflow,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<void> {
  const validatedWorkflow = validatePortalWorkflow(workflow);
  const now = new Date().toISOString();
  const existingWorkflow = await findWorkflow(validatedWorkflow.id, context);
  const workflowJson = JSON.stringify(validatedWorkflow);

  if (existingWorkflow) {
    await dbRun(
      `UPDATE workflows
       SET portal = ?, name = ?, description = ?, version = ?, json = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ?`,
      [
        validatedWorkflow.portal,
        validatedWorkflow.name,
        validatedWorkflow.description,
        validatedWorkflow.version,
        workflowJson,
        now,
        validatedWorkflow.id,
        context.userId
      ]
    );
  } else {
    await dbRun(
      `INSERT INTO workflows (id, owner_user_id, organization_id, portal, name, description, version, json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedWorkflow.id,
        context.userId,
        context.organizationId,
        validatedWorkflow.portal,
        validatedWorkflow.name,
        validatedWorkflow.description,
        validatedWorkflow.version,
        workflowJson,
        now,
        now
      ]
    );
  }

  await dbRun(
    `INSERT INTO workflow_versions (workflow_id, owner_user_id, organization_id, version, json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [validatedWorkflow.id, context.userId, context.organizationId, validatedWorkflow.version, workflowJson, now]
  );
}

export async function listWorkflowVersions(
  workflowId: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<WorkflowVersionSummary[]> {
  await getWorkflow(workflowId, context);

  const rows = await dbAll<{ version: number; created_at: string }>(
      `SELECT version, created_at
       FROM workflow_versions
       WHERE workflow_id = ? AND owner_user_id = ?
       ORDER BY version DESC`,
      [workflowId, context.userId]
    );

  return rows.map((row) => ({
    version: row.version,
    createdAt: row.created_at
  }));
}

export async function getWorkflowVersion(
  workflowId: string,
  version: number,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<PortalWorkflow | null> {
  await getWorkflow(workflowId, context);

  const row = await dbGet<{ json: string }>(
      `SELECT json
       FROM workflow_versions
       WHERE workflow_id = ? AND version = ? AND owner_user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [workflowId, version, context.userId]
    );

  return row ? validatePortalWorkflow(JSON.parse(row.json)) : null;
}

export async function restoreWorkflowVersion(
  workflowId: string,
  version: number,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<PortalWorkflow | null> {
  const workflowVersion = await getWorkflowVersion(workflowId, version, context);

  if (!workflowVersion) {
    return null;
  }

  const currentWorkflow = await getWorkflow(workflowId, context);
  const restoredWorkflow = {
    ...workflowVersion,
    version: currentWorkflow.version + 1
  };

  await saveWorkflow(restoredWorkflow, context);
  return restoredWorkflow;
}

export async function diffWorkflowVersions(
  workflowId: string,
  fromVersion: number,
  toVersion: number,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<{ from: PortalWorkflow; to: PortalWorkflow; changes: WorkflowDiffChange[] } | null> {
  const from = await getWorkflowVersion(workflowId, fromVersion, context);
  const to = await getWorkflowVersion(workflowId, toVersion, context);

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

async function seedWorkflowIfNeeded(
  workflowId: string,
  bundledWorkflow: PortalWorkflow,
  context: GhostApiTenantContext
): Promise<void> {
  if (await findWorkflow(workflowId, context)) {
    return;
  }

  const legacyWorkflow = await readJsonFile<PortalWorkflow | null>(getWorkflowPath(workflowId), null);
  await saveWorkflow(legacyWorkflow ?? bundledWorkflow, context);
}

async function findWorkflow(workflowId: string, context: GhostApiTenantContext): Promise<PortalWorkflow | null> {
  const row = await dbGet<{ json: string }>("SELECT json FROM workflows WHERE id = ? AND owner_user_id = ?", [
    workflowId,
    context.userId
  ]);

  if (!row) {
    return null;
  }

  return validatePortalWorkflow(JSON.parse(row.json));
}

async function listStoredWorkflows(context: GhostApiTenantContext): Promise<PortalWorkflow[]> {
  const rows = await dbAll<{ json: string }>("SELECT json FROM workflows WHERE owner_user_id = ? ORDER BY updated_at DESC", [
    context.userId
  ]);

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
