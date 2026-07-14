/**
 * Per-user SplitwiseClient cache.
 *
 * Previously index.ts (stdio) and transport/http.ts (HTTP) each held their
 * own independent module-level singleton, both reading the single shared
 * SPLITWISE_ACCESS_TOKEN env var -- consolidated here into one registry both
 * transports share, now keyed by user_id.
 */

import { SplitwiseClient } from './splitwise-client.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

const clients = new Map<string, SplitwiseClient>();

/**
 * Get (creating if needed) the SplitwiseClient for a given user_id.
 *
 * userId undefined (stdio mode, or any caller with no resolved identity)
 * falls back to the original single-user identity -- SPLITWISE_ACCESS_TOKEN,
 * unprefixed, unchanged behavior from before per-user support existed.
 *
 * A named userId with no matching SPLITWISE_ACCESS_TOKEN_<USER> env var is
 * rejected outright, not silently served from the default token -- an
 * unconfigured person must never see the default identity's data.
 */
export function getClient(userId?: string): SplitwiseClient {
  const cacheKey = userId ?? '__default__';
  const cached = clients.get(cacheKey);
  if (cached) {
    return cached;
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
  clients.set(cacheKey, client);
  return client;
}
