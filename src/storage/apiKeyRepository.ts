import crypto from "node:crypto";
import { defaultTenantContext, type GhostApiTenantContext } from "./accountRepository.js";
import { dbAll, dbGet, dbRun } from "./database.js";

export type StoredApiKey = {
  id: string;
  ownerUserId: string;
  organizationId: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  revokedAt?: string;
};

export type CreatedApiKey = StoredApiKey & {
  key: string;
};

type ApiKeyRow = {
  id: string;
  owner_user_id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  created_at: string;
  revoked_at: string | null;
};

export async function createApiKey(
  name: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<CreatedApiKey> {
  const key = `gapi_${crypto.randomBytes(24).toString("base64url")}`;
  const now = new Date().toISOString();
  const storedKey: StoredApiKey = {
    id: crypto.randomUUID(),
    ownerUserId: context.userId,
    organizationId: context.organizationId,
    name,
    keyPreview: previewKey(key),
    createdAt: now
  };

  await dbRun(
    `INSERT INTO api_keys (id, owner_user_id, organization_id, name, key_hash, key_preview, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      storedKey.id,
      storedKey.ownerUserId,
      storedKey.organizationId,
      storedKey.name,
      hashKey(key),
      storedKey.keyPreview,
      storedKey.createdAt
    ]
  );

  return {
    ...storedKey,
    key
  };
}

export async function listApiKeys(context: GhostApiTenantContext = defaultTenantContext): Promise<StoredApiKey[]> {
  const rows = await dbAll<ApiKeyRow>("SELECT * FROM api_keys WHERE owner_user_id = ? ORDER BY created_at DESC", [
    context.userId
  ]);

  return rows.map(rowToApiKey);
}

export async function hasActiveApiKeys(context: GhostApiTenantContext = defaultTenantContext): Promise<boolean> {
  const row = await dbGet<{ count: number | string }>(
    "SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL AND owner_user_id = ?",
    [context.userId]
  );

  return Number(row?.count ?? 0) > 0;
}

export async function verifyStoredApiKey(
  key: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<boolean> {
  const row = await dbGet<{ id: string }>(
    "SELECT id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL AND owner_user_id = ?",
    [hashKey(key), context.userId]
  );

  return Boolean(row);
}

export async function tenantContextForApiKey(key: string): Promise<GhostApiTenantContext | null> {
  const row = await dbGet<{
    owner_user_id: string;
    organization_id: string;
  }>("SELECT owner_user_id, organization_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL", [hashKey(key)]);

  if (!row) {
    return null;
  }

  return {
    userId: row.owner_user_id,
    organizationId: row.organization_id,
    role: "owner"
  };
}

export async function revokeApiKey(
  apiKeyId: string,
  context: GhostApiTenantContext = defaultTenantContext
): Promise<StoredApiKey | null> {
  const existing = await getApiKey(apiKeyId, context);

  if (!existing) {
    return null;
  }

  const revokedAt = new Date().toISOString();

  await dbRun("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND owner_user_id = ?", [
    revokedAt,
    apiKeyId,
    context.userId
  ]);

  return {
    ...existing,
    revokedAt
  };
}

async function getApiKey(apiKeyId: string, context: GhostApiTenantContext): Promise<StoredApiKey | null> {
  const row = await dbGet<ApiKeyRow>("SELECT * FROM api_keys WHERE id = ? AND owner_user_id = ?", [
    apiKeyId,
    context.userId
  ]);

  return row ? rowToApiKey(row) : null;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function previewKey(key: string): string {
  return `${key.slice(0, 9)}…${key.slice(-6)}`;
}

function rowToApiKey(row: ApiKeyRow): StoredApiKey {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    organizationId: row.organization_id,
    name: row.name,
    keyPreview: row.key_preview,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? undefined
  };
}
