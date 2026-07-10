import crypto from "node:crypto";
import { config } from "../config.js";
import { activeStorageDriver, dbGet, dbRun, dbTransaction } from "./database.js";

export type GhostApiTenantContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "member";
};

export type GhostApiAccount = {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  organization: {
    id: string;
    name: string;
    createdAt: string;
  };
  membership: {
    role: GhostApiTenantContext["role"];
    createdAt: string;
  };
};

export const defaultTenantContext: GhostApiTenantContext = {
  userId: config.cloud.defaultUserId,
  organizationId: config.cloud.defaultOrgId,
  role: "owner"
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  created_at: string;
};

type MembershipRow = {
  role: GhostApiTenantContext["role"];
  created_at: string;
};

export async function ensureDefaultAccount(): Promise<GhostApiAccount> {
  const now = new Date().toISOString();

  await ensureAccount({
    userId: defaultTenantContext.userId,
    organizationId: defaultTenantContext.organizationId,
    email: config.cloud.defaultUserEmail,
    name: "Local User",
    organizationName: config.cloud.defaultOrgName,
    role: defaultTenantContext.role,
    createdAt: now
  });

  return getAccount(defaultTenantContext);
}

export async function createAccount(input: {
  email: string;
  name?: string;
  organizationName?: string;
}): Promise<GhostApiAccount> {
  const now = new Date().toISOString();
  const context: GhostApiTenantContext = {
    userId: crypto.randomUUID(),
    organizationId: crypto.randomUUID(),
    role: "owner"
  };

  await ensureAccount({
    userId: context.userId,
    organizationId: context.organizationId,
    email: input.email,
    name: input.name || input.email.split("@")[0] || "GhostAPI User",
    organizationName: input.organizationName || "GhostAPI Workspace",
    role: context.role,
    createdAt: now
  });

  return getAccount(context);
}

export async function getAccount(context: GhostApiTenantContext = defaultTenantContext): Promise<GhostApiAccount> {
  const user = await dbGet<UserRow>("SELECT * FROM users WHERE id = ?", [context.userId]);
  const organization = await dbGet<OrganizationRow>("SELECT * FROM organizations WHERE id = ?", [context.organizationId]);
  const membership = await dbGet<MembershipRow>(
    "SELECT role, created_at FROM organization_members WHERE organization_id = ? AND user_id = ?",
    [context.organizationId, context.userId]
  );

  if (!user || !organization || !membership) {
    throw new Error("GhostAPI account context was not initialized");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at
    },
    organization: {
      id: organization.id,
      name: organization.name,
      createdAt: organization.created_at
    },
    membership: {
      role: membership.role,
      createdAt: membership.created_at
    }
  };
}

async function ensureAccount(input: {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  organizationName: string;
  role: GhostApiTenantContext["role"];
  createdAt: string;
}): Promise<void> {
  const userInsert = activeStorageDriver() === "postgres"
    ? `INSERT INTO users (id, email, name, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`
    : `INSERT OR IGNORE INTO users (id, email, name, created_at)
       VALUES (?, ?, ?, ?)`;
  const orgInsert = activeStorageDriver() === "postgres"
    ? `INSERT INTO organizations (id, name, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT (id) DO NOTHING`
    : `INSERT OR IGNORE INTO organizations (id, name, created_at)
       VALUES (?, ?, ?)`;
  const memberInsert = activeStorageDriver() === "postgres"
    ? `INSERT INTO organization_members (organization_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (organization_id, user_id) DO NOTHING`
    : `INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)`;

  await dbTransaction([
    () => dbRun(userInsert, [input.userId, input.email, input.name, input.createdAt]),
    () => dbRun(orgInsert, [input.organizationId, input.organizationName, input.createdAt]),
    () => dbRun(memberInsert, [input.organizationId, input.userId, input.role, input.createdAt])
  ]);
}
