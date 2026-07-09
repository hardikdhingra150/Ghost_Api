import { mockPortalUrl } from "../config.js";
import { defaultGetAttendanceVariables, getAttendanceWorkflow as bundledGetAttendanceWorkflow } from "../workflows/definitions/getAttendanceWorkflow.js";
import { runWorkflow } from "../workflows/engine/workflowExecutor.js";
import type { AttendanceResult, PortalCredentials } from "../types/attendance.js";
import type { PortalWorkflow, WorkflowRunResult } from "../workflows/workflowTypes.js";

export async function runGetAttendance(credentials: PortalCredentials): Promise<AttendanceResult> {
  const { result } = await runGetAttendanceWithTrace(credentials);
  return result;
}

export async function runGetAttendanceWithTrace(
  credentials: PortalCredentials,
  options: {
    runId?: string;
    workflow?: PortalWorkflow;
  } = {}
): Promise<{ result: AttendanceResult; workflowRun: WorkflowRunResult }> {
  const workflow = options.workflow ?? bundledGetAttendanceWorkflow;

  if (workflow.output.type !== "attendance") {
    throw new Error("get-attendance workflow must use attendance output");
  }

  const workflowRun = await runWorkflow(workflow, {
    runId: options.runId,
    variables: {
      ...defaultGetAttendanceVariables,
      portalUrl: mockPortalUrl,
      username: credentials.username,
      password: credentials.password
    }
  });

  const student = getRequiredString(workflowRun.data, workflow.output.studentField);
  const semester = getRequiredString(workflowRun.data, workflow.output.semesterField);
  const subjects = workflowRun.data[workflow.output.subjectsField] as AttendanceResult["subjects"] | undefined;

  if (!Array.isArray(subjects)) {
    throw new Error("Attendance workflow did not produce a valid subjects array");
  }

  const result = {
    student,
    semester,
    subjects,
    source: {
      portal: workflow.output.sourcePortal,
      extractedAt: workflowRun.extractedAt
    }
  };

  return {
    result,
    workflowRun
  };
}

function getRequiredString(data: Record<string, unknown>, field: string): string {
  const value = data[field];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Workflow output field "${field}" was not a non-empty string`);
  }

  return value;
}
