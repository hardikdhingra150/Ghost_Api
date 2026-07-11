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
  username: string | null;
  password_hash: string | null;
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
    username: null,
    passwordHash: null,
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
    username: null,
    passwordHash: null,
    name: input.name || input.email.split("@")[0] || "GhostAPI User",
    organizationName: input.organizationName || "GhostAPI Workspace",
    role: context.role,
    createdAt: now
  });

  return getAccount(context);
}

export async function createPasswordAccount(input: {
  username: string;
  password: string;
  name?: string;
  organizationName?: string;
}): Promise<GhostApiAccount> {
  const username = normalizeUsername(input.username);
  const now = new Date().toISOString();
  const context: GhostApiTenantContext = {
    userId: crypto.randomUUID(),
    organizationId: crypto.randomUUID(),
    role: "owner"
  };

  await ensureAccount({
    userId: context.userId,
    organizationId: context.organizationId,
    email: `${username}@users.ghostapi.local`,
    username,
    passwordHash: hashPassword(input.password),
    name: input.name || username,
    organizationName: input.organizationName || `${username}'s GhostAPI Workspace`,
    role: context.role,
    createdAt: now
  });

  return getAccount(context);
}

export async function verifyPasswordAccount(input: {
  username: string;
  password: string;
}): Promise<{ account: GhostApiAccount; context: GhostApiTenantContext } | null> {
  const username = normalizeUsername(input.username);
  const user = await dbGet<UserRow>("SELECT * FROM users WHERE username = ?", [username]);

  if (!user?.password_hash || !verifyPassword(input.password, user.password_hash)) {
    return null;
  }

  const membership = await dbGet<{ organization_id: string; role: GhostApiTenantContext["role"] }>(
    "SELECT organization_id, role FROM organization_members WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
    [user.id]
  );

  if (!membership) {
    return null;
  }

  const context: GhostApiTenantContext = {
    userId: user.id,
    organizationId: membership.organization_id,
    role: membership.role
  };

  return {
    account: await getAccount(context),
    context
  };
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
  username: string | null;
  passwordHash: string | null;
  name: string;
  organizationName: string;
  role: GhostApiTenantContext["role"];
  createdAt: string;
}): Promise<void> {
  const userInsert = activeStorageDriver() === "postgres"
    ? `INSERT INTO users (id, email, username, password_hash, name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`
    : `INSERT OR IGNORE INTO users (id, email, username, password_hash, name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`;
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
    () => dbRun(userInsert, [input.userId, input.email, input.username, input.passwordHash, input.name, input.createdAt]),
    () => dbRun(orgInsert, [input.organizationId, input.organizationName, input.createdAt]),
    () => dbRun(memberInsert, [input.organizationId, input.userId, input.role, input.createdAt])
  ]);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, expectedHash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const actual = Buffer.from(crypto.scryptSync(password, salt, 64).toString("base64url"));
  const expected = Buffer.from(expectedHash);

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
