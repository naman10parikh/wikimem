/**
 * connector-tokens.test.ts
 *
 * Integration tests for the token storage HTTP API exposed by createServer():
 *   POST /api/auth/tokens/:provider — store an API key
 *   GET  /api/auth/tokens           — list connected providers
 *   DELETE /api/auth/tokens/:provider — disconnect a provider
 *
 * Security assertions:
 *   - tokens.json is written with mode 0o600
 *   - server binds to 127.0.0.1 only (not 0.0.0.0)
 *
 * No OAuth flow is involved here — only the manual API-key storage path.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdirSync, existsSync, rmSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import { createServer } from '../src/web/server.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_ROOT = join(process.cwd(), '.test-vault-connector-tokens');
const PORT = 19876; // arbitrary high port unlikely to conflict
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN_PATH = join(TEST_ROOT, '.wikimem', 'tokens.json');

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
}

/** Minimal HTTP helper — avoids adding supertest as a dependency. */
async function request(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: unknown; text?: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
      },
    };

    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode ?? 0, body: parsed, text: raw });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** Poll until the server responds or throw after timeout. */
async function waitForServer(timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await request('GET', '/api/status');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`Server at ${BASE} did not become ready within ${timeoutMs}ms`);
}

// ─── Suite setup ──────────────────────────────────────────────────────────────

beforeAll(async () => {
  cleanup();

  // Build minimal vault structure that createServer expects
  const wikiDir = join(TEST_ROOT, 'wiki');
  mkdirSync(wikiDir, { recursive: true });
  mkdirSync(join(TEST_ROOT, 'raw'), { recursive: true });
  mkdirSync(join(TEST_ROOT, '.wikimem'), { recursive: true });
  writeFileSync(join(TEST_ROOT, 'AGENTS.md'), '# Wiki Schema\n', 'utf-8');
  writeFileSync(join(wikiDir, 'index.md'), '---\ntitle: Index\n---\n# Index\n', 'utf-8');
  writeFileSync(join(TEST_ROOT, 'log.md'), '# Log\n', 'utf-8');

  createServer(TEST_ROOT, PORT);
  await waitForServer();
});

afterAll(() => {
  cleanup();
});

beforeEach(() => {
  // Start each test with a clean token store
  if (existsSync(TOKEN_PATH)) rmSync(TOKEN_PATH);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/tokens/:provider — store API key', () => {
  it('returns 200 and tokens.json is created', async () => {
    const res = await request('POST', '/api/auth/tokens/notion', { api_key: 'test-notion-key-abc' });

    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>)['status']).toBe('connected');
    expect((res.body as Record<string, unknown>)['provider']).toBe('notion');
    expect(existsSync(TOKEN_PATH)).toBe(true);
  });

  it('tokens.json contains the stored access_token', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'notion-secret-xyz' });

    const stored = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) as Record<
      string,
      { access_token: string; connectedAt: string }
    >;

    expect(stored['notion']).toBeDefined();
    expect(stored['notion']!.access_token).toBe('notion-secret-xyz');
    expect(stored['notion']!.connectedAt).toBeTruthy();
  });

  it('tokens.json is written with mode 0o600 (owner read/write only)', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'key-mode-check' });

    const stats = statSync(TOKEN_PATH);
    // On POSIX, mode includes file type bits. Mask with 0o777 to isolate permissions.
    const perms = stats.mode & 0o777;
    expect(perms).toBe(0o600);
  });

  it('returns 400 when api_key is missing', async () => {
    const res = await request('POST', '/api/auth/tokens/notion', {});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/tokens — list providers', () => {
  it('notion shows connected: true after storing a key', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'stored-key' });

    const res = await request('GET', '/api/auth/tokens');
    expect(res.status).toBe(200);

    const body = res.body as Record<string, { connected: boolean }>;
    expect(body['notion']?.connected).toBe(true);
  });

  it('notion shows connected: false (or absent) before any key is stored', async () => {
    // Token file cleaned in beforeEach — notion should not appear as connected
    const res = await request('GET', '/api/auth/tokens');
    expect(res.status).toBe(200);

    const body = res.body as Record<string, { connected: boolean }>;
    // OAuth providers like slack/github are enumerated with connected: false when no token
    // notion (api-key provider) should not appear at all, OR appear with connected: false
    const notionEntry = body['notion'];
    if (notionEntry !== undefined) {
      expect(notionEntry.connected).toBe(false);
    }
    // Either absent or explicitly false — both are acceptable
  });

  it('multiple providers stored and all show as connected', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'notion-key' });
    await request('POST', '/api/auth/tokens/linear', { api_key: 'linear-key' });

    const res = await request('GET', '/api/auth/tokens');
    const body = res.body as Record<string, { connected: boolean }>;

    expect(body['notion']?.connected).toBe(true);
    expect(body['linear']?.connected).toBe(true);
  });
});

describe('DELETE /api/auth/tokens/:provider — disconnect provider', () => {
  it('returns 200 and provider no longer shows connected', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'to-be-deleted' });

    const del = await request('DELETE', '/api/auth/tokens/notion');
    expect(del.status).toBe(200);
    expect((del.body as Record<string, unknown>)['status']).toBe('disconnected');

    const list = await request('GET', '/api/auth/tokens');
    const body = list.body as Record<string, { connected: boolean }>;
    const notionEntry = body['notion'];
    if (notionEntry !== undefined) {
      expect(notionEntry.connected).toBe(false);
    }
  });

  it('token is removed from tokens.json on disk', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'disk-check-key' });
    await request('DELETE', '/api/auth/tokens/notion');

    const stored = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) as Record<string, unknown>;
    expect(stored['notion']).toBeUndefined();
  });

  it('deleting a provider does not affect other stored providers', async () => {
    await request('POST', '/api/auth/tokens/notion', { api_key: 'notion-k' });
    await request('POST', '/api/auth/tokens/linear', { api_key: 'linear-k' });
    await request('DELETE', '/api/auth/tokens/notion');

    const list = await request('GET', '/api/auth/tokens');
    const body = list.body as Record<string, { connected: boolean }>;
    expect(body['linear']?.connected).toBe(true);
  });
});

describe('Server security — binding address', () => {
  it('server responds on 127.0.0.1 (loopback)', async () => {
    // We already proved this by the fact all tests above pass using 127.0.0.1
    const res = await request('GET', '/api/status');
    expect(res.status).toBe(200);
  });

  it('server does not listen on 0.0.0.0 — only loopback', () => {
    // The createServer() call uses app.listen(port, '127.0.0.1', ...).
    // We verify by checking that a connection attempt to 0.0.0.0 on the same port
    // using the loopback address still works (proving loopback is bound),
    // but we don't need to prove 0.0.0.0 is unavailable from a different host
    // in a unit-test context. The assertion here is that the source code hard-codes '127.0.0.1'.
    //
    // This test reads the server source to assert the security constraint is present.
    const serverSource = readFileSync(
      join(process.cwd(), 'src', 'web', 'server.ts'),
      'utf-8',
    );
    expect(serverSource).toContain("'127.0.0.1'");
    // Must NOT contain the insecure wildcard bind
    expect(serverSource).not.toContain("app.listen(port, '0.0.0.0'");
  });
});
