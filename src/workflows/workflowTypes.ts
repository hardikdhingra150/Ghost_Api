export type WorkflowVariableValue = string | number | boolean | null;

export type WorkflowVariables = Record<string, WorkflowVariableValue>;

export type WorkflowStep =
  | {
      id: string;
      type: "goto";
      url: string;
    }
  | {
      id: string;
      type: "fill";
      target: string;
      value: string;
    }
  | {
      id: string;
      type: "click";
      target: string;
    }
  | {
      id: string;
      type: "wait_for_url";
      pattern: string;
      timeoutMs?: number;
    }
  | {
      id: string;
      type: "wait_for_selector";
      selector: string;
      timeoutMs?: number;
    }
  | {
      id: string;
      type: "extract_text";
      name: string;
      selector: string;
    }
  | {
      id: string;
      type: "extract_table";
      name: string;
      selector: string;
      columns: WorkflowTableColumn[];
    };

export type WorkflowTableColumn = {
  name: string;
  type: "string" | "number" | "percentage";
};

export type PortalWorkflow = {
  id: string;
  portal: string;
  name: string;
  description: string;
  version: number;
  defaultVariables?: WorkflowVariables;
  steps: WorkflowStep[];
  output:
    | {
        type: "attendance";
        sourcePortal: string;
        studentField: string;
        semesterField: string;
        subjectsField: string;
      }
    | {
        type: "generic";
        sourcePortal: string;
        fields: Record<string, string>;
      };
};

export type WorkflowRunInput = {
  variables: WorkflowVariables;
  runId?: string;
};

export type WorkflowRunResult = {
  workflowId: string;
  portal: string;
  extractedAt: string;
  data: Record<string, unknown>;
  stepLog: WorkflowStepLog[];
};

export type WorkflowStepLog = {
  stepId: string;
  type: WorkflowStep["type"];
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  message?: string;
  screenshotPath?: string;
};

export type StoredWorkflowRunStatus = "running" | "success" | "failed";

export type StoredWorkflowRun = {
  id: string;
  actionId: string;
  workflowId: string;
  workflowVersion: number;
  portal: string;
  status: StoredWorkflowRunStatus;
  createdAt: string;
  updatedAt: string;
  input: {
    variables: WorkflowVariables;
  };
  result?: unknown;
  error?: string;
  stepLog: WorkflowStepLog[];
};
