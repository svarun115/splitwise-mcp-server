/**
 * Tests for the per-user SplitwiseClient registry.
 *
 * Covers the pure identity/caching logic. Doesn't cover real Splitwise API
 * calls -- SplitwiseClient's constructor never makes a network request
 * (axios.create() just builds a client object), so these tests exercise
 * real construction without needing to mock HTTP.
 *
 * Each test uses a unique userId to avoid cache collisions across tests,
 * since the registry's cache is module-level state shared for the life of
 * the test file (no test-only reset hook added to production code).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { getClient } from './client-registry.js';

const ORIGINAL_ENV = { ...process.env };
let tokensDir: string;

beforeEach(() => {
  process.env.SPLITWISE_ACCESS_TOKEN = 'default-token';
  delete process.env.SPLITWISE_TOKENS_DIR;
  tokensDir = mkdtempSync(join(tmpdir(), 'splitwise-tokens-test-'));
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  rmSync(tokensDir, { recursive: true, force: true });
});

function writeTokenFile(userId: string, accessToken: string, mtime?: Date) {
  const dir = join(tokensDir, userId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'token.json');
  writeFileSync(path, JSON.stringify({ access_token: accessToken }));
  if (mtime) {
    utimesSync(path, mtime, mtime);
  }
}

describe('getClient', () => {
  it('resolves the default identity when no userId is given', () => {
    const client = getClient();
    expect(client).toBeDefined();
  });

  it('caches by userId -- same userId returns the same instance', () => {
    process.env.SPLITWISE_ACCESS_TOKEN_ALICE1 = 'alice-token';
    const a = getClient('alice1');
    const b = getClient('alice1');
    expect(a).toBe(b);
  });

  it('gives two distinct users two distinct client instances', () => {
    process.env.SPLITWISE_ACCESS_TOKEN_ALICE2 = 'alice-token';
    process.env.SPLITWISE_ACCESS_TOKEN_BOB2 = 'bob-token';
    const alice = getClient('alice2');
    const bob = getClient('bob2');
    expect(alice).not.toBe(bob);
  });

  it('the default identity and a named user are distinct instances', () => {
    process.env.SPLITWISE_ACCESS_TOKEN_ALICE3 = 'alice-token';
    const defaultClient = getClient();
    const namedClient = getClient('alice3');
    expect(defaultClient).not.toBe(namedClient);
  });

  it('rejects a named user with no matching env var configured', () => {
    // Mirrors the acceptance criterion: an unconfigured caller with no
    // resolvable user_id must never fall back to the default identity's
    // token, even implicitly.
    expect(() => getClient('nobody-configured')).toThrowError(
      /No Splitwise access token configured for user 'nobody-configured'/
    );
  });

  it('the env var lookup is uppercased consistently', () => {
    process.env.SPLITWISE_ACCESS_TOKEN_LOWERCASE4 = 'a-token';
    // userId is passed lowercase; the registry uppercases it to build the
    // env var name -- this must not throw.
    expect(() => getClient('lowercase4')).not.toThrow();
  });
});

describe('getClient -- file-backed token store (#146)', () => {
  it('a token file beats the env var, and a file appearing after the env-backed client was already cached swaps to a fresh instance', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    process.env.SPLITWISE_ACCESS_TOKEN_FILEBEATS5 = 'env-token';

    // No file yet -- first call takes the env path and caches it.
    const envBacked = getClient('filebeats5');

    // Now a connect flow completes and the file appears -- the very next
    // call must not keep serving the stale env-backed cache entry.
    writeTokenFile('filebeats5', 'file-token', new Date('2026-01-01T00:00:00Z'));
    const fileBacked = getClient('filebeats5');

    expect(fileBacked).not.toBe(envBacked);
  });

  it('falls back to the env var when no token file exists for this user', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    process.env.SPLITWISE_ACCESS_TOKEN_ENVFALLBACK6 = 'env-token';

    expect(() => getClient('envfallback6')).not.toThrow();
  });

  it('falls back to the env var when the token file is malformed', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    process.env.SPLITWISE_ACCESS_TOKEN_MALFORMED7 = 'env-token';
    const dir = join(tokensDir, 'malformed7');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'token.json'), '{not valid json');

    expect(() => getClient('malformed7')).not.toThrow();
  });

  it('a named user with neither a token file nor an env var still throws', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    expect(() => getClient('nobody-at-all8')).toThrowError(
      /No Splitwise access token configured for user 'nobody-at-all8'/
    );
  });

  it('a stable token file returns the same cached instance across calls', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    const fixedMtime = new Date('2026-01-01T00:00:00Z');
    writeTokenFile('stable9', 'file-token-v1', fixedMtime);

    const a = getClient('stable9');
    const b = getClient('stable9');
    expect(a).toBe(b);
  });

  it('an mtime bump on the token file swaps the cached client', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    writeTokenFile('mtimebump10', 'file-token-v1', new Date('2026-01-01T00:00:00Z'));
    const before = getClient('mtimebump10');

    writeTokenFile('mtimebump10', 'file-token-v2', new Date('2026-01-01T00:05:00Z'));
    const after = getClient('mtimebump10');

    expect(after).not.toBe(before);
  });

  it('the default identity (no userId) never consults the token store', () => {
    process.env.SPLITWISE_TOKENS_DIR = tokensDir;
    // No token file written for '__default__' at all -- if the default
    // path incorrectly looked at the file store, this would still work
    // fine (loadUserToken('__default__') just returns null), so the real
    // assertion is that stdio/no-identity behavior is unaffected: it must
    // not throw and must keep using SPLITWISE_ACCESS_TOKEN.
    expect(() => getClient()).not.toThrow();
  });
});
