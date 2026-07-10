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
    postgresEnvironmentConfigured?: boolean;
    postgresDriverSelected?: boolean;
    productionDatabaseMigration?: boolean;
  };
};

if (!planResponse.ok || !planPayload.ok) {
  throw new Error("Expected /v1/cloud/plan to return cloud readiness");
}

if (!planPayload.readiness?.tenantScopedStorage || !planPayload.readiness?.localDefaultWorkspace) {
  throw new Error("Expected cloud readiness to include tenant-scoped local workspace");
}

if (planPayload.currentPhase !== "Week 14" || !planPayload.readiness?.renderDeploymentConfig) {
  throw new Error("Expected cloud readiness to include Week 14 database readiness after Render deployment");
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

const databaseResponse = await fetch("http://127.0.0.1:4000/v1/database/plan");
const databasePayload = (await databaseResponse.json()) as {
  ok?: boolean;
  currentDriver?: string;
  activeStore?: string;
  postgres?: {
    connectionStringConfigured?: boolean;
  };
  week14?: {
    safeEnvironment?: string[];
  };
};

if (!databaseResponse.ok || !databasePayload.ok) {
  throw new Error("Expected /v1/database/plan to return Week 14 database readiness");
}

if (!databasePayload.currentDriver || !databasePayload.activeStore) {
  throw new Error("Expected database plan to include current driver and active store");
}

if (!databasePayload.week14?.safeEnvironment?.includes("DATABASE_URL=<Render Postgres connection string>")) {
  throw new Error("Expected database plan to include safe DATABASE_URL placeholder");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      userId: mePayload.account.user.id,
      organizationId: mePayload.account.organization.id,
      readiness: planPayload.readiness,
      deployment: deploymentPayload,
      database: databasePayload
    },
    null,
    2
  )
);
