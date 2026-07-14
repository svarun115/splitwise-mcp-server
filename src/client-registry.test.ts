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
import { getClient } from './client-registry.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.SPLITWISE_ACCESS_TOKEN = 'default-token';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

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
