import { z } from "zod";
import type { PortalWorkflow } from "./workflowTypes.js";

const workflowTableColumnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "percentage"])
});

const workflowStepSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("goto"),
    url: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("fill"),
    target: z.string().min(1),
    value: z.string()
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("click"),
    target: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("wait_for_url"),
    pattern: z.string().min(1),
    timeoutMs: z.number().int().positive().optional()
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("wait_for_selector"),
    selector: z.string().min(1),
    timeoutMs: z.number().int().positive().optional()
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("extract_text"),
    name: z.string().min(1),
    selector: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("extract_table"),
    name: z.string().min(1),
    selector: z.string().min(1),
    columns: z.array(workflowTableColumnSchema).min(1)
  })
]);

export const portalWorkflowSchema = z
  .object({
    id: z.string().min(1),
    portal: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.number().int().positive(),
    defaultVariables: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    steps: z.array(workflowStepSchema).min(1),
    output: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("attendance"),
        sourcePortal: z.string().min(1),
        studentField: z.string().min(1),
        semesterField: z.string().min(1),
        subjectsField: z.string().min(1)
      }),
      z.object({
        type: z.literal("generic"),
        sourcePortal: z.string().min(1),
        fields: z.record(z.string().min(1), z.string().min(1))
      })
    ])
  })
  .superRefine((workflow, ctx) => {
    const stepIds = new Set<string>();

    for (const [index, step] of workflow.steps.entries()) {
      if (stepIds.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "id"],
          message: `Duplicate step id "${step.id}"`
        });
      }

      stepIds.add(step.id);
    }

    const extractedFields = new Set(
      workflow.steps.flatMap((step) => {
        if (step.type === "extract_text" || step.type === "extract_table") {
          return [step.name];
        }

        return [];
      })
    );

    const outputFields =
      workflow.output.type === "attendance"
        ? [workflow.output.studentField, workflow.output.semesterField, workflow.output.subjectsField]
        : Object.values(workflow.output.fields);

    for (const field of outputFields) {
      if (!extractedFields.has(field)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["output"],
          message: `Output field "${field}" is not produced by any extraction step`
        });
      }
    }
  });

export function validatePortalWorkflow(value: unknown): PortalWorkflow {
  return portalWorkflowSchema.parse(value);
}
