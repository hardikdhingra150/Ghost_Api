import crypto from "node:crypto";
import { defaultTenantContext, type GhostApiTenantContext } from "../storage/accountRepository.js";
import { createRun, updateRun } from "../storage/runRepository.js";
import { getWorkflow } from "../storage/workflowRepository.js";
import { WorkflowExecutionError, runWorkflow } from "../workflows/engine/workflowExecutor.js";
import type {
  PortalWorkflow,
  StoredWorkflowRun,
  WorkflowRunResult,
  WorkflowVariables
} from "../workflows/workflowTypes.js";

export type ExecuteWorkflowActionResult = {
  runId: string;
  workflowId: string;
  result: unknown;
  run: StoredWorkflowRun;
};

export async function executeWorkflowAction(
  workflowId: string,
  variables: WorkflowVariables = {},
  context: GhostApiTenantContext = defaultTenantContext
): Promise<ExecuteWorkflowActionResult> {
  const workflow = await getWorkflow(workflowId, context);
  const runId = crypto.randomUUID();
  const now = new Date().toISOString();
  const mergedVariables: WorkflowVariables = {
    ...(workflow.defaultVariables ?? {}),
    ...variables
  };

  await createRun({
    id: runId,
    ownerUserId: context.userId,
    organizationId: context.organizationId,
    actionId: workflow.id,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    portal: workflow.portal,
    status: "running",
    createdAt: now,
    updatedAt: now,
    input: {
      variables: redactSensitiveVariables(mergedVariables)
    },
    stepLog: []
  });

  try {
    const workflowRun = await runWorkflow(workflow, {
      runId,
      variables: mergedVariables
    });
    const result = mapWorkflowOutput(workflow, workflowRun);
    const run = await updateRun(runId, {
      status: "success",
      result,
      stepLog: workflowRun.stepLog
    });

    return {
      runId,
      workflowId: workflow.id,
      result,
      run
    };
  } catch (error) {
    const stepLog = error instanceof WorkflowExecutionError ? error.partialRun.stepLog : [];
    const message = error instanceof Error ? error.message : "Unknown workflow action error";

    await updateRun(runId, {
      status: "failed",
      error: message,
      stepLog
    });

    throw error;
  }
}

function mapWorkflowOutput(workflow: PortalWorkflow, workflowRun: WorkflowRunResult): unknown {
  if (workflow.output.type === "generic") {
    const data: Record<string, unknown> = {};

    for (const [outputKey, dataKey] of Object.entries(workflow.output.fields)) {
      data[outputKey] = workflowRun.data[dataKey];
    }

    return {
      workflowId: workflow.id,
      source: {
        portal: workflow.output.sourcePortal,
        extractedAt: workflowRun.extractedAt
      },
      data
    };
  }

  return {
    workflowId: workflow.id,
    source: {
      portal: workflow.output.sourcePortal,
      extractedAt: workflowRun.extractedAt
    },
    data: workflowRun.data
  };
}

function redactSensitiveVariables(variables: WorkflowVariables): WorkflowVariables {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => {
      if (/password|token|secret|key/i.test(key)) {
        return [key, "***REDACTED***"];
      }

      return [key, value];
    })
  );
}
