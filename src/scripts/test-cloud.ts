const meResponse = await fetch("http://127.0.0.1:4000/v1/me");
const mePayload = (await meResponse.json()) as {
  ok?: boolean;
  account?: {
    user?: {
      id?: string;
    };
    organization?: {
      id?: string;
    };
  };
};

if (!meResponse.ok || !mePayload.ok) {
  throw new Error("Expected /v1/me to return account context");
}

if (!mePayload.account?.user?.id || !mePayload.account?.organization?.id) {
  throw new Error("Expected /v1/me to include user and organization ownership context");
}

const planResponse = await fetch("http://127.0.0.1:4000/v1/cloud/plan");
const planPayload = (await planResponse.json()) as {
  ok?: boolean;
  currentPhase?: string;
  readiness?: {
    tenantScopedStorage?: boolean;
    localDefaultWorkspace?: boolean;
    renderDeploymentConfig?: boolean;
  };
};

if (!planResponse.ok || !planPayload.ok) {
  throw new Error("Expected /v1/cloud/plan to return cloud readiness");
}

if (!planPayload.readiness?.tenantScopedStorage || !planPayload.readiness?.localDefaultWorkspace) {
  throw new Error("Expected cloud readiness to include tenant-scoped local workspace");
}

if (planPayload.currentPhase !== "Week 13" || !planPayload.readiness?.renderDeploymentConfig) {
  throw new Error("Expected cloud readiness to include Week 13 Render deployment config");
}

const deploymentResponse = await fetch("http://127.0.0.1:4000/v1/deployment/plan");
const deploymentPayload = (await deploymentResponse.json()) as {
  ok?: boolean;
  selectedProvider?: string;
  services?: Array<{
    name?: string;
  }>;
};

if (!deploymentResponse.ok || !deploymentPayload.ok) {
  throw new Error("Expected /v1/deployment/plan to return deployment readiness");
}

if (deploymentPayload.selectedProvider !== "Render") {
  throw new Error("Expected Render to be the selected deployment provider");
}

for (const service of ["Render", "Supabase Postgres", "Upstash Redis"]) {
  if (!deploymentPayload.services?.some((entry) => entry.name === service)) {
    throw new Error(`Expected deployment plan to include ${service}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      userId: mePayload.account.user.id,
      organizationId: mePayload.account.organization.id,
      readiness: planPayload.readiness,
      deployment: deploymentPayload
    },
    null,
    2
  )
);
