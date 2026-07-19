/**
 * Per-user SplitwiseClient cache.
 *
 * Previously index.ts (stdio) and transport/http.ts (HTTP) each held their
 * own independent module-level singleton, both reading the single shared
 * SPLITWISE_ACCESS_TOKEN env var -- consolidated here into one registry both
 * transports share, now keyed by user_id.
 *
 * #146: a file-backed token (written by mcp-auth-gateway's self-serve
 * connect leg -- see token-store.ts) takes precedence over the
 * SPLITWISE_ACCESS_TOKEN_<USER> env var, and is re-checked by mtime on
 * every call so a freshly-connected user's token is picked up without
 * restarting this process. The env var stays as the fallback for
 * admin-provisioned users who never went through the connect flow.
 */

import { SplitwiseClient } from './splitwise-client.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { loadUserToken } from './token-store.js';

interface CacheEntry {
  client: SplitwiseClient;
  fromFile: boolean;
  mtimeMs?: number;
}

const clients = new Map<string, CacheEntry>();

/**
 * Get (creating if needed) the SplitwiseClient for a given user_id.
 *
 * userId undefined (stdio mode, or any caller with no resolved identity)
 * falls back to the original single-user identity -- SPLITWISE_ACCESS_TOKEN,
 * unprefixed, unchanged behavior from before per-user support existed. The
 * file-backed lookup below only ever runs for a named userId.
 *
 * A named userId with neither a token file nor a matching
 * SPLITWISE_ACCESS_TOKEN_<USER> env var is rejected outright, not silently
 * served from the default token -- an unconfigured person must never see
 * the default identity's data.
 */
export function getClient(userId?: string): SplitwiseClient {
  const cacheKey = userId ?? '__default__';

  if (userId) {
    const stored = loadUserToken(userId);
    if (stored) {
      const cached = clients.get(cacheKey);
      if (cached?.fromFile && cached.mtimeMs === stored.mtimeMs) {
        return cached.client;
      }
      const client = new SplitwiseClient(stored.accessToken);
      clients.set(cacheKey, { client, fromFile: true, mtimeMs: stored.mtimeMs });
      return client;
    }
  }

  const cached = clients.get(cacheKey);
  if (cached && !cached.fromFile) {
    return cached.client;
  }

  let accessToken: string | undefined;
  if (userId) {
    const envKey = `SPLITWISE_ACCESS_TOKEN_${userId.toUpperCase()}`;
    accessToken = process.env[envKey];
    if (!accessToken) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `No Splitwise access token configured for user '${userId}' (expected ${envKey})`
      );
    }
  }

  const client = new SplitwiseClient(accessToken);
  clients.set(cacheKey, { client, fromFile: false });
  return client;
}
