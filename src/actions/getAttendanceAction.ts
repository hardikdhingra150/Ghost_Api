import crypto from "node:crypto";
import { mockPortalUrl } from "../config.js";
import { defaultTenantContext, type GhostApiTenantContext } from "../storage/accountRepository.js";
import { createRun, updateRun } from "../storage/runRepository.js";
import { getWorkflow } from "../storage/workflowRepository.js";
import { runGetAttendanceWithTrace } from "../runner/getAttendanceRunner.js";
import type { AttendanceResult, PortalCredentials } from "../types/attendance.js";
import type { StoredWorkflowRun, WorkflowVariables } from "../workflows/workflowTypes.js";
import { WorkflowExecutionError } from "../workflows/engine/workflowExecutor.js";

export type GetAttendanceActionResult = {
  runId: string;
  result: AttendanceResult;
  run: StoredWorkflowRun;
};

export async function executeGetAttendanceAction(
  credentials: PortalCredentials,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<GetAttendanceActionResult> {
  const workflow = await getWorkflow("get-attendance", context);
  const runId = crypto.randomUUID();
  const now = new Date().toISOString();
  const variables: WorkflowVariables = {
    portalUrl: mockPortalUrl,
    username: credentials.username,
    password: credentials.password
  };

  await createRun({
    id: runId,
    ownerUserId: context.userId,
    organizationId: context.organizationId,
    actionId: "get-attendance",
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    portal: workflow.portal,
    status: "running",
    createdAt: now,
    updatedAt: now,
    input: {
      variables: redactSensitiveVariables(variables)
    },
    stepLog: []
  });

  try {
    const { result, workflowRun } = await runGetAttendanceWithTrace(credentials, { runId, workflow });
    const run = await updateRun(runId, {
      status: "success",
      result,
      stepLog: workflowRun.stepLog
    });

    return {
      runId,
      result,
      run
    };
  } catch (error) {
    const stepLog = error instanceof WorkflowExecutionError ? error.partialRun.stepLog : [];
    const message = error instanceof Error ? error.message : "Unknown attendance action error";

    await updateRun(runId, {
      status: "failed",
      error: message,
      stepLog
    });

    throw error;
  }
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
