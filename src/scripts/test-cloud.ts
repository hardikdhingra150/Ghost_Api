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
  readiness?: {
    tenantScopedStorage?: boolean;
    localDefaultWorkspace?: boolean;
  };
};

if (!planResponse.ok || !planPayload.ok) {
  throw new Error("Expected /v1/cloud/plan to return cloud readiness");
}

if (!planPayload.readiness?.tenantScopedStorage || !planPayload.readiness?.localDefaultWorkspace) {
  throw new Error("Expected cloud readiness to include tenant-scoped local workspace");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      userId: mePayload.account.user.id,
      organizationId: mePayload.account.organization.id,
      readiness: planPayload.readiness
    },
    null,
    2
  )
);
