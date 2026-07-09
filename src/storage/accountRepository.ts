import { config } from "../config.js";
import { getDatabase } from "./database.js";

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

export function ensureDefaultAccount(): GhostApiAccount {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, name, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(defaultTenantContext.userId, config.cloud.defaultUserEmail, "Local User", now);

  db.prepare(
    `INSERT OR IGNORE INTO organizations (id, name, created_at)
     VALUES (?, ?, ?)`
  ).run(defaultTenantContext.organizationId, config.cloud.defaultOrgName, now);

  db.prepare(
    `INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(defaultTenantContext.organizationId, defaultTenantContext.userId, defaultTenantContext.role, now);

  return getAccount(defaultTenantContext);
}

export function getAccount(context: GhostApiTenantContext = defaultTenantContext): GhostApiAccount {
  const db = getDatabase();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(context.userId) as UserRow | undefined;
  const organization = db
    .prepare("SELECT * FROM organizations WHERE id = ?")
    .get(context.organizationId) as OrganizationRow | undefined;
  const membership = db
    .prepare("SELECT role, created_at FROM organization_members WHERE organization_id = ? AND user_id = ?")
    .get(context.organizationId, context.userId) as MembershipRow | undefined;

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
