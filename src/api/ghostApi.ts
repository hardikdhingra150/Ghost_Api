import fs from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { executeWorkflowAction } from "../actions/executeWorkflowAction.js";
import { executeGetAttendanceAction } from "../actions/getAttendanceAction.js";
import { config, mockPortalCredentials } from "../config.js";
import { sendPublicFile } from "../http/staticFiles.js";
import { defaultTenantContext, ensureDefaultAccount, getAccount } from "../storage/accountRepository.js";
import type { GhostApiTenantContext } from "../storage/accountRepository.js";
import { createApiKey, listApiKeys, revokeApiKey, verifyStoredApiKey } from "../storage/apiKeyRepository.js";
import { getRun, listRuns } from "../storage/runRepository.js";
import {
  diffWorkflowVersions,
  getWorkflow,
  getWorkflowVersion,
  listWorkflows,
  listWorkflowVersions,
  restoreWorkflowVersion,
  saveWorkflow
} from "../storage/workflowRepository.js";
import { validatePortalWorkflow } from "../workflows/workflowValidation.js";

const runAttendanceSchema = z.object({
  credentials: z
    .object({
      username: z.string().min(1).optional(),
      password: z.string().min(1).optional()
    })
    .optional()
});

const workflowVariableValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const runWorkflowSchema = z.object({
  variables: z.record(workflowVariableValueSchema).optional()
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(80)
});

export function createGhostApi(): FastifyInstance {
  const app = Fastify({ logger: true });
  ensureDefaultAccount();

  function tenantContext(): GhostApiTenantContext {
    return defaultTenantContext;
  }

  app.addHook("onRequest", async (_request, reply) => {
    reply.header("access-control-allow-origin", "*");
    reply.header("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
    reply.header("access-control-allow-headers", "content-type,x-ghostapi-key");
  });

  app.options("*", async (_request, reply) => {
    return reply.code(204).send();
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!config.security.requireApiKey || !request.url.startsWith("/v1/")) {
      return;
    }

    const providedKey = request.headers["x-ghostapi-key"];
    const key = Array.isArray(providedKey) ? providedKey[0] : providedKey;
    const envKeyMatches = Boolean(config.security.apiKey && key === config.security.apiKey);
    const storedKeyMatches = Boolean(key && verifyStoredApiKey(key, tenantContext()));

    if (!envKeyMatches && !storedKeyMatches) {
      return reply.code(401).send({
        ok: false,
        error: "Missing or invalid GhostAPI API key"
      });
    }
  });

  app.get("/", async (_request, reply) => {
    return sendPublicFile(reply, "dashboard/index.html");
  });

  app.get("/dashboard", async (_request, reply) => {
    return sendPublicFile(reply, "dashboard/index.html");
  });

  app.get("/dashboard/:filename", async (request, reply) => {
    const params = request.params as { filename: string };
    return sendPublicFile(reply, path.join("dashboard", path.basename(params.filename)));
  });

  app.get("/assets/:filename", async (request, reply) => {
    const params = request.params as { filename: string };
    return sendPublicFile(reply, path.join("assets", path.basename(params.filename)));
  });

  app.get("/capture/bookmarklet.js", async (_request, reply) => {
    return sendPublicFile(reply, "capture/bookmarklet.js");
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "ghostapi-week1",
      mode: config.cloud.mode,
      deploymentProvider: config.deployment.provider,
      publicApiUrl: config.deployment.publicApiUrl,
      message: "GhostAPI is alive"
    };
  });

  app.get("/v1/me", async () => {
    return {
      ok: true,
      account: getAccount(tenantContext()),
      mode: config.cloud.mode
    };
  });

  app.get("/v1/cloud/plan", async () => {
    return {
      ok: true,
      mode: config.cloud.mode,
      currentPhase: "Week 13",
      readiness: {
        tenantScopedStorage: true,
        localDefaultWorkspace: true,
        renderDeploymentConfig: true,
        extensionStorePackage: true,
        hostedAuth: false,
        encryptedCredentialVault: false,
        backgroundWorkerQueue: false,
        chromeWebStoreDistribution: false,
        productionDatabaseMigration: false
      },
      nextMilestones: [
        "Deploy the Fastify API to Render",
        "Hosted auth and organizations",
        "Move local SQLite storage to Supabase Postgres",
        "Encrypted credential vault",
        "Queue-backed browser workers",
        "Chrome Web Store OAuth onboarding"
      ]
    };
  });

  app.get("/v1/deployment/plan", async () => {
    return {
      ok: true,
      selectedProvider: "Render",
      currentProvider: config.deployment.provider,
      publicApiUrl: config.deployment.publicApiUrl,
      currentMode: config.cloud.mode,
      services: [
        {
          name: "Render",
          role: "Hosts the Node/Fastify API and dashboard over HTTPS",
          status: config.deployment.provider === "render" ? "selected" : "configured"
        },
        {
          name: "Supabase Postgres",
          role: "Future production database for users, workflows, runs, and API keys",
          status: config.deployment.supabaseUrl || config.deployment.databaseUrl ? "configured" : "planned"
        },
        {
          name: "Upstash Redis",
          role: "Future queue/cache layer for cloud browser workers and rate limits",
          status: config.deployment.redisUrl ? "configured" : "planned"
        }
      ],
      requiredEnvironment: [
        "HOST",
        "PORT",
        "GHOSTAPI_MODE",
        "GHOSTAPI_DEPLOYMENT_PROVIDER",
        "GHOSTAPI_PUBLIC_API_URL",
        "GHOSTAPI_REQUIRE_API_KEY",
        "GHOSTAPI_API_KEY"
      ],
      futureEnvironment: ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "REDIS_URL"],
      verificationCommands: ["npm run check", "npm run test:deployment", "npm run test:extension", "npm run package:extension"]
    };
  });

  app.get("/v1/actions", async () => {
    const workflows = await listWorkflows(tenantContext());

    return {
      actions: workflows.map((workflow) => ({
        id: workflow.id,
        portal: workflow.portal,
        method: "POST",
        endpoint:
          workflow.id === "get-attendance"
            ? "/v1/actions/get-attendance/run"
            : `/v1/workflows/${workflow.id}/run`,
        workflowVersion: workflow.version,
        outputType: workflow.output.type,
        description: workflow.description
      }))
    };
  });

  app.get("/v1/api-keys", async () => {
    return {
      ok: true,
      apiKeys: listApiKeys(tenantContext())
    };
  });

  app.post("/v1/api-keys", async (request, reply) => {
    const parsed = createApiKeySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: "Invalid API key request",
        details: parsed.error.flatten()
      });
    }

    const apiKey = createApiKey(parsed.data.name, tenantContext());

    return {
      ok: true,
      apiKey,
      warning: "Store this key now. GhostAPI stores only a hash and cannot show it again."
    };
  });

  app.delete("/v1/api-keys/:apiKeyId", async (request, reply) => {
    const params = request.params as { apiKeyId: string };
    const revokedApiKey = revokeApiKey(params.apiKeyId, tenantContext());

    if (!revokedApiKey) {
      return reply.code(404).send({
        ok: false,
        error: `API key "${params.apiKeyId}" not found`
      });
    }

    return {
      ok: true,
      apiKey: revokedApiKey
    };
  });

  app.get("/v1/actions/get-attendance/workflow", async () => {
    const workflow = await getWorkflow("get-attendance", tenantContext());

    return {
      ok: true,
      workflow
    };
  });

  app.put("/v1/actions/get-attendance/workflow", async (request, reply) => {
    try {
      const workflow = validatePortalWorkflow(request.body);

      if (workflow.id !== "get-attendance") {
        return reply.code(400).send({
          ok: false,
          error: `Workflow id must be "get-attendance"`
        });
      }

      await saveWorkflow({
        ...workflow,
        version: workflow.version + 1
      }, tenantContext());

      const savedWorkflow = await getWorkflow("get-attendance", tenantContext());

      return {
        ok: true,
        workflow: savedWorkflow
      };
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: "Invalid workflow JSON",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/v1/actions/get-attendance/workflow/versions", async () => {
    return {
      ok: true,
      versions: await listWorkflowVersions("get-attendance", tenantContext())
    };
  });

  app.get("/v1/actions/get-attendance/workflow/versions/:version", async (request, reply) => {
    const params = request.params as { version: string };
    const version = Number(params.version);

    if (!Number.isInteger(version) || version <= 0) {
      return reply.code(400).send({
        ok: false,
        error: "Version must be a positive integer"
      });
    }

    const workflow = await getWorkflowVersion("get-attendance", version, tenantContext());

    if (!workflow) {
      return reply.code(404).send({
        ok: false,
        error: `Workflow version ${version} not found`
      });
    }

    return {
      ok: true,
      workflow
    };
  });

  app.post("/v1/actions/get-attendance/workflow/versions/:version/restore", async (request, reply) => {
    const params = request.params as { version: string };
    const version = Number(params.version);

    if (!Number.isInteger(version) || version <= 0) {
      return reply.code(400).send({
        ok: false,
        error: "Version must be a positive integer"
      });
    }

    const workflow = await restoreWorkflowVersion("get-attendance", version, tenantContext());

    if (!workflow) {
      return reply.code(404).send({
        ok: false,
        error: `Workflow version ${version} not found`
      });
    }

    return {
      ok: true,
      workflow
    };
  });

  app.get("/v1/actions/get-attendance/workflow/diff", async (request, reply) => {
    const query = request.query as { from?: string; to?: string };
    const from = Number(query.from);
    const to = Number(query.to);

    if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= 0) {
      return reply.code(400).send({
        ok: false,
        error: "Query params from and to must be positive integers"
      });
    }

    const diff = await diffWorkflowVersions("get-attendance", from, to, tenantContext());

    if (!diff) {
      return reply.code(404).send({
        ok: false,
        error: "One or both workflow versions were not found"
      });
    }

    return {
      ok: true,
      from,
      to,
      changes: diff.changes
    };
  });

  app.get("/v1/workflows", async () => {
    return {
      ok: true,
      workflows: (await listWorkflows(tenantContext())).map((workflow) => ({
        id: workflow.id,
        portal: workflow.portal,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        outputType: workflow.output.type,
        defaultVariables: workflow.defaultVariables ?? {}
      }))
    };
  });

  app.get("/v1/workflows/:workflowId", async (request, reply) => {
    const params = request.params as { workflowId: string };

    try {
      return {
        ok: true,
        workflow: await getWorkflow(params.workflowId, tenantContext())
      };
    } catch (error) {
      return reply.code(404).send({
        ok: false,
        error: error instanceof Error ? error.message : `Workflow "${params.workflowId}" not found`
      });
    }
  });

  app.put("/v1/workflows/:workflowId", async (request, reply) => {
    const params = request.params as { workflowId: string };

    try {
      const workflow = validatePortalWorkflow(request.body);

      if (workflow.id !== params.workflowId) {
        return reply.code(400).send({
          ok: false,
          error: `Workflow id must match URL id "${params.workflowId}"`
        });
      }

      const existingWorkflow = await getWorkflow(params.workflowId, tenantContext()).catch(() => null);

      await saveWorkflow({
        ...workflow,
        version: existingWorkflow ? existingWorkflow.version + 1 : workflow.version
      }, tenantContext());

      return {
        ok: true,
        workflow: await getWorkflow(params.workflowId, tenantContext())
      };
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: "Invalid workflow JSON",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/v1/workflows/:workflowId/run", async (request, reply) => {
    const params = request.params as { workflowId: string };
    const parsed = runWorkflowSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: "Invalid workflow run request",
        details: parsed.error.flatten()
      });
    }

    try {
      const actionResult = await executeWorkflowAction(params.workflowId, parsed.data.variables ?? {}, tenantContext());

      return {
        ok: true,
        workflowId: actionResult.workflowId,
        runId: actionResult.runId,
        result: actionResult.result,
        stepLog: actionResult.run.stepLog
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        ok: false,
        workflowId: params.workflowId,
        error: error instanceof Error ? error.message : "Unknown workflow runner error"
      });
    }
  });

  app.get("/v1/runs", async () => {
    return {
      ok: true,
      ...(await listRuns(25, 0, tenantContext()))
    };
  });

  app.get("/v1/runs/page", async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = query.limit === undefined ? 25 : Number(query.limit);
    const offset = query.offset === undefined ? 0 : Number(query.offset);

    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit <= 0 || offset < 0) {
      return reply.code(400).send({
        ok: false,
        error: "limit must be positive and offset must be zero or positive"
      });
    }

    return {
      ok: true,
      ...(await listRuns(limit, offset, tenantContext()))
    };
  });

  app.get("/v1/runs/:runId", async (request, reply) => {
    const params = request.params as { runId: string };
    const run = await getRun(params.runId, tenantContext());

    if (!run) {
      return reply.code(404).send({
        ok: false,
        error: `Run "${params.runId}" not found`
      });
    }

    return {
      ok: true,
      run
    };
  });

  app.get("/v1/artifacts/screenshots/:filename", async (request, reply) => {
    const params = request.params as { filename: string };
    const safeFilename = path.basename(params.filename);
    const screenshotPath = path.join(config.storage.screenshotsDir, safeFilename);
    const resolvedScreenshotsDir = path.resolve(config.storage.screenshotsDir);
    const resolvedScreenshotPath = path.resolve(screenshotPath);

    if (!resolvedScreenshotPath.startsWith(resolvedScreenshotsDir)) {
      return reply.code(400).send({
        ok: false,
        error: "Invalid screenshot path"
      });
    }

    if (!fs.existsSync(resolvedScreenshotPath)) {
      return reply.code(404).send({
        ok: false,
        error: "Screenshot not found"
      });
    }

    return reply.type("image/png").send(fs.createReadStream(resolvedScreenshotPath));
  });

  app.post("/v1/actions/get-attendance/run", async (request, reply) => {
    const parsed = runAttendanceSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten()
      });
    }

    try {
      const actionResult = await executeGetAttendanceAction({
        username: parsed.data.credentials?.username ?? mockPortalCredentials.username,
        password: parsed.data.credentials?.password ?? mockPortalCredentials.password
      }, tenantContext());

      return {
        ok: true,
        action: "get-attendance",
        runId: actionResult.runId,
        result: actionResult.result,
        stepLog: actionResult.run.stepLog
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        ok: false,
        action: "get-attendance",
        error: error instanceof Error ? error.message : "Unknown runner error"
      });
    }
  });

  return app;
}
