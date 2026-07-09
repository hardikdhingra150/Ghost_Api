import crypto from "node:crypto";
import { defaultTenantContext, type GhostApiTenantContext } from "./accountRepository.js";
import { getDatabase } from "./database.js";

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

export function createApiKey(
  name: string,
  context: GhostApiTenantContext = defaultTenantContext
): CreatedApiKey {
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

  getDatabase()
    .prepare(
      `INSERT INTO api_keys (id, owner_user_id, organization_id, name, key_hash, key_preview, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
    )
    .run(
      storedKey.id,
      storedKey.ownerUserId,
      storedKey.organizationId,
      storedKey.name,
      hashKey(key),
      storedKey.keyPreview,
      storedKey.createdAt
    );

  return {
    ...storedKey,
    key
  };
}

export function listApiKeys(context: GhostApiTenantContext = defaultTenantContext): StoredApiKey[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM api_keys WHERE owner_user_id = ? ORDER BY created_at DESC")
    .all(context.userId) as ApiKeyRow[];

  return rows.map(rowToApiKey);
}

export function hasActiveApiKeys(context: GhostApiTenantContext = defaultTenantContext): boolean {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL AND owner_user_id = ?")
    .get(context.userId) as { count: number };

  return row.count > 0;
}

export function verifyStoredApiKey(key: string, context: GhostApiTenantContext = defaultTenantContext): boolean {
  const row = getDatabase()
    .prepare("SELECT id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL AND owner_user_id = ?")
    .get(hashKey(key), context.userId) as { id: string } | undefined;

  return Boolean(row);
}

export function revokeApiKey(
  apiKeyId: string,
  context: GhostApiTenantContext = defaultTenantContext
): StoredApiKey | null {
  const existing = getApiKey(apiKeyId, context);

  if (!existing) {
    return null;
  }

  const revokedAt = new Date().toISOString();

  getDatabase()
    .prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND owner_user_id = ?")
    .run(revokedAt, apiKeyId, context.userId);

  return {
    ...existing,
    revokedAt
  };
}

function getApiKey(apiKeyId: string, context: GhostApiTenantContext): StoredApiKey | null {
  const row = getDatabase()
    .prepare("SELECT * FROM api_keys WHERE id = ? AND owner_user_id = ?")
    .get(apiKeyId, context.userId) as ApiKeyRow | undefined;

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
