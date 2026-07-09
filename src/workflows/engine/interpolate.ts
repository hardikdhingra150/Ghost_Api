import type { WorkflowVariables } from "../workflowTypes.js";

export function interpolate(template: string, variables: WorkflowVariables): string {
  return template.replaceAll(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];

    if (value === undefined) {
      throw new Error(`Missing workflow variable "${key}"`);
    }

    return String(value);
  });
}
