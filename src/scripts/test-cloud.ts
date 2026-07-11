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

const signupEmail = `cloud-test-${Date.now()}@ghostapi.dev`;
const accountResponse = await fetch("http://127.0.0.1:4000/v1/accounts", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: signupEmail,
    name: "Cloud Test User",
    organizationName: "Cloud Test Workspace"
  })
});
const accountPayload = (await accountResponse.json()) as {
  ok?: boolean;
  account?: {
    user?: {
      id?: string;
      email?: string;
    };
    organization?: {
      id?: string;
    };
  };
  apiKey?: {
    key?: string;
  };
};

if (!accountResponse.ok || !accountPayload.ok || !accountPayload.apiKey?.key) {
  throw new Error("Expected /v1/accounts to create a tenant account and API key");
}

const scopedMeResponse = await fetch("http://127.0.0.1:4000/v1/me", {
  headers: {
    "x-ghostapi-key": accountPayload.apiKey.key
  }
});
const scopedMePayload = (await scopedMeResponse.json()) as typeof mePayload;

if (scopedMePayload.account?.user?.id !== accountPayload.account?.user?.id) {
  throw new Error("Expected x-ghostapi-key to resolve the API key owner workspace");
}

const authUsername = `clouduser${Date.now()}`;
const authPassword = "test-password-123";
const signupResponse = await fetch("http://127.0.0.1:4000/v1/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    username: authUsername,
    password: authPassword,
    organizationName: "Password Auth Workspace"
  })
});
const signupPayload = (await signupResponse.json()) as typeof accountPayload;

if (!signupResponse.ok || !signupPayload.ok || !signupPayload.apiKey?.key) {
  throw new Error("Expected username/password signup to return an API key");
}

const loginResponse = await fetch("http://127.0.0.1:4000/v1/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    username: authUsername,
    password: authPassword
  })
});
const loginPayload = (await loginResponse.json()) as typeof accountPayload;

if (!loginResponse.ok || !loginPayload.ok || !loginPayload.apiKey?.key) {
  throw new Error("Expected username/password login to return an API key");
}

if (loginPayload.account?.user?.id !== signupPayload.account?.user?.id) {
  throw new Error("Expected login to return the same account created by signup");
}

const secondAccountResponse = await fetch("http://127.0.0.1:4000/v1/accounts", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: `cloud-test-2-${Date.now()}@ghostapi.dev`,
    name: "Second Cloud Test User",
    organizationName: "Second Cloud Test Workspace"
  })
});
const secondAccountPayload = (await secondAccountResponse.json()) as typeof accountPayload;

if (!secondAccountResponse.ok || !secondAccountPayload.ok || !secondAccountPayload.apiKey?.key) {
  throw new Error("Expected second /v1/accounts call to create an isolated tenant account");
}

const privateWorkflowId = `private-workflow-${Date.now()}`;
const privateWorkflow = {
  id: privateWorkflowId,
  portal: "private-test-portal",
  name: "Private Test Workflow",
  description: "Verifies one tenant cannot see another tenant workflow.",
  version: 1,
  defaultVariables: {
    pageUrl: "data:text/html,<h1>Private</h1>"
  },
  steps: [
    {
      id: "open-page",
      type: "goto",
      url: "{{pageUrl}}"
    },
    {
      id: "extract-page-text",
      type: "extract_text",
      name: "pageText",
      selector: "body"
    }
  ],
  output: {
    type: "generic",
    sourcePortal: "private-test-portal",
    fields: {
      pageText: "pageText"
    }
  }
};

const savePrivateWorkflowResponse = await fetch(`http://127.0.0.1:4000/v1/workflows/${privateWorkflowId}`, {
  method: "PUT",
  headers: {
    "content-type": "application/json",
    "x-ghostapi-key": accountPayload.apiKey.key
  },
  body: JSON.stringify(privateWorkflow)
});
const savePrivateWorkflowPayload = (await savePrivateWorkflowResponse.json()) as {
  ok?: boolean;
  error?: string;
};

if (!savePrivateWorkflowResponse.ok || !savePrivateWorkflowPayload.ok) {
  throw new Error(`Expected private workflow save to succeed: ${savePrivateWorkflowPayload.error ?? savePrivateWorkflowResponse.statusText}`);
}

const firstWorkflowsResponse = await fetch("http://127.0.0.1:4000/v1/workflows", {
  headers: {
    "x-ghostapi-key": accountPayload.apiKey.key
  }
});
const secondWorkflowsResponse = await fetch("http://127.0.0.1:4000/v1/workflows", {
  headers: {
    "x-ghostapi-key": secondAccountPayload.apiKey.key
  }
});
const firstWorkflowsPayload = (await firstWorkflowsResponse.json()) as {
  workflows?: Array<{ id?: string }>;
};
const secondWorkflowsPayload = (await secondWorkflowsResponse.json()) as typeof firstWorkflowsPayload;

if (!firstWorkflowsPayload.workflows?.some((workflow) => workflow.id === privateWorkflowId)) {
  throw new Error("Expected first tenant to see its private workflow");
}

if (secondWorkflowsPayload.workflows?.some((workflow) => workflow.id === privateWorkflowId)) {
  throw new Error("Expected second tenant not to see first tenant private workflow");
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
    apiKeyTenantIsolation?: boolean;
    accountBootstrapApi?: boolean;
  };
};

if (!planResponse.ok || !planPayload.ok) {
  throw new Error("Expected /v1/cloud/plan to return cloud readiness");
}

if (!planPayload.readiness?.tenantScopedStorage || !planPayload.readiness?.localDefaultWorkspace) {
  throw new Error("Expected cloud readiness to include tenant-scoped local workspace");
}

if (planPayload.currentPhase !== "Production database readiness" || !planPayload.readiness?.renderDeploymentConfig) {
  throw new Error("Expected cloud readiness to include production database readiness after Render deployment");
}

if (!planPayload.readiness?.apiKeyTenantIsolation || !planPayload.readiness?.accountBootstrapApi) {
  throw new Error("Expected cloud readiness to include account bootstrap and API-key tenant isolation");
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
  production?: {
    safeEnvironment?: string[];
  };
};

if (!databaseResponse.ok || !databasePayload.ok) {
  throw new Error("Expected /v1/database/plan to return production database readiness");
}

if (!databasePayload.currentDriver || !databasePayload.activeStore) {
  throw new Error("Expected database plan to include current driver and active store");
}

if (!databasePayload.production?.safeEnvironment?.includes("DATABASE_URL=<Render Postgres connection string>")) {
  throw new Error("Expected database plan to include safe DATABASE_URL placeholder");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      userId: mePayload.account.user.id,
      organizationId: mePayload.account.organization.id,
      createdTenantUserId: accountPayload.account?.user?.id,
      isolatedTenantWorkflowId: privateWorkflowId,
      readiness: planPayload.readiness,
      deployment: deploymentPayload,
      database: databasePayload
    },
    null,
    2
  )
);
