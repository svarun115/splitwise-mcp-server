/**
 * File-backed per-user Splitwise token store (#146's self-serve connect).
 *
 * The gateway's Splitwise OAuth leg (mcp-auth-gateway/src/connect.py)
 * writes `${SPLITWISE_TOKENS_DIR}/<userId>/token.json` after a household
 * member completes the real Splitwise OAuth consent flow. This module is
 * the read side: client-registry.ts checks it before falling back to the
 * SPLITWISE_ACCESS_TOKEN_<USER> env var, which (unlike a file another
 * process can write) can't be updated without restarting this server.
 */

import { readFileSync, statSync } from 'fs';
import { join } from 'path';

export interface StoredToken {
  accessToken: string;
  mtimeMs: number;
}

/**
 * Reads and parses the token file for `userId`, or null on any failure
 * (SPLITWISE_TOKENS_DIR unset, no file for this user yet, or a malformed/
 * unreadable file) -- every failure mode falls back to the env var in
 * client-registry.ts, never throws here.
 */
export function loadUserToken(userId: string): StoredToken | null {
  const tokensDir = process.env.SPLITWISE_TOKENS_DIR;
  if (!tokensDir) {
    return null;
  }

  const path = join(tokensDir, userId, 'token.json');
  let mtimeMs: number;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    if (typeof parsed.access_token !== 'string' || !parsed.access_token) {
      return null;
    }
    return { accessToken: parsed.access_token, mtimeMs };
  } catch {
    return null;
  }
}
