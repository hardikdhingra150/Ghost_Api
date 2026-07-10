import { chromium } from "playwright";
import { config } from "../../config.js";
import { extractTable } from "../extractors/tableExtractor.js";
import type { PortalWorkflow, WorkflowRunInput, WorkflowRunResult, WorkflowStep, WorkflowStepLog } from "../workflowTypes.js";
import { interpolate } from "./interpolate.js";
import { resolveTarget } from "./targetResolver.js";
import fs from "node:fs/promises";
import path from "node:path";

const defaultGotoTimeoutMs = 15000;
const defaultStepTimeoutMs = 8000;

export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public readonly partialRun: WorkflowRunResult
  ) {
    super(message);
    this.name = "WorkflowExecutionError";
  }
}

export async function runWorkflow(workflow: PortalWorkflow, input: WorkflowRunInput): Promise<WorkflowRunResult> {
  const browser = await chromium.launch({ headless: config.browser.headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  const data: Record<string, unknown> = {};
  const stepLog: WorkflowStepLog[] = [];

  try {
    for (const step of workflow.steps) {
      const startedAt = new Date().toISOString();

      try {
        await executeStep(step, { page, data, variables: input.variables });

        stepLog.push({
          stepId: step.id,
          type: step.type,
          status: "success",
          startedAt,
          finishedAt: new Date().toISOString()
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown workflow step error";
        const screenshotPath = await captureFailureScreenshot(page, input.runId, step.id);

        stepLog.push({
          stepId: step.id,
          type: step.type,
          status: "failed",
          startedAt,
          finishedAt: new Date().toISOString(),
          message,
          screenshotPath
        });

        throw new WorkflowExecutionError(message, {
          workflowId: workflow.id,
          portal: workflow.portal,
          extractedAt: new Date().toISOString(),
          data,
          stepLog
        });
      }
    }

    return {
      workflowId: workflow.id,
      portal: workflow.portal,
      extractedAt: new Date().toISOString(),
      data,
      stepLog
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function captureFailureScreenshot(
  page: import("playwright").Page,
  runId: string | undefined,
  stepId: string
): Promise<string | undefined> {
  if (!runId) {
    return undefined;
  }

  await fs.mkdir(config.storage.screenshotsDir, { recursive: true });
  const screenshotPath = path.join(config.storage.screenshotsDir, `${runId}-${stepId}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function executeStep(
  step: WorkflowStep,
  context: {
    page: import("playwright").Page;
    data: Record<string, unknown>;
    variables: WorkflowRunInput["variables"];
  }
): Promise<void> {
  if (step.type === "goto") {
    await context.page.goto(interpolate(step.url, context.variables), {
      waitUntil: "domcontentloaded",
      timeout: defaultGotoTimeoutMs
    });
    return;
  }

  if (step.type === "fill") {
    await resolveTarget(context.page, step.target).first().fill(interpolate(step.value, context.variables), {
      timeout: defaultStepTimeoutMs
    });
    return;
  }

  if (step.type === "click") {
    await resolveTarget(context.page, step.target).first().click({ timeout: defaultStepTimeoutMs });
    return;
  }

  if (step.type === "wait_for_url") {
    await context.page.waitForURL(step.pattern, { timeout: step.timeoutMs ?? defaultStepTimeoutMs });
    return;
  }

  if (step.type === "wait_for_selector") {
    await context.page.waitForSelector(step.selector, { timeout: step.timeoutMs ?? defaultStepTimeoutMs });
    return;
  }

  if (step.type === "extract_text") {
    context.data[step.name] = await context.page.locator(step.selector).first().innerText({
      timeout: defaultStepTimeoutMs
    });
    return;
  }

  if (step.type === "extract_table") {
    context.data[step.name] = await extractTable(context.page.locator(step.selector).first(), step.columns);
    return;
  }

  const exhaustiveCheck: never = step;
  throw new Error(`Unsupported workflow step: ${JSON.stringify(exhaustiveCheck)}`);
}
