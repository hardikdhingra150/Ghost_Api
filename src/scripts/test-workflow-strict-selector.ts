import { runWorkflow } from "../workflows/engine/workflowExecutor.js";
import type { PortalWorkflow } from "../workflows/workflowTypes.js";

const workflow: PortalWorkflow = {
  id: "strict-selector-smoke",
  portal: "data-url",
  name: "Strict selector smoke",
  description: "Verifies extract_text tolerates selectors that match multiple elements.",
  version: 1,
  steps: [
    {
      id: "open-page",
      type: "goto",
      url: "data:text/html,<html><body><div class='same'>first</div><div class='same'>second</div></body></html>"
    },
    {
      id: "extract-first",
      type: "extract_text",
      name: "field",
      selector: ".same"
    }
  ],
  output: {
    type: "generic",
    sourcePortal: "data-url",
    fields: {
      field: "field"
    }
  }
};

const result = await runWorkflow(workflow, { variables: {}, runId: "strict-selector-smoke" });

if (result.data.field !== "first") {
  throw new Error(`Expected first matched element, got ${String(result.data.field)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workflowId: result.workflowId,
      field: result.data.field
    },
    null,
    2
  )
);
