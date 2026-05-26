/**
 * mcp-client.test.ts
 *
 * Proves WikiMem's MCP OAuth 2.1 CLIENT (src/core/mcp-client/) is Anthropic-
 * parity compatible. Stands up a minimal MOCK upstream MCP server that
 * implements just enough of the 2025-06-18 spec for us to verify the client
 * completes every required step of the dance:
 *
 *   1. 401 + WWW-Authenticate w/ resource_metadata pointer (RFC 9728)
 *   2. GET /.well-known/oauth-protected-resource (RFC 9728)
 *   3. GET /.well-known/oauth-authorization-server (RFC 8414)
 *   4. POST /register (RFC 7591 Dynamic Client Registration)
 *   5. Authorize URL build w/ PKCE S256 + RFC 8707 resource=
 *   6. POST /token (authorization_code, resource, code_verifier)
 *   7. POST /mcp w/ Bearer token (tools/list)
 *   8. Refresh rotation on 401 retry
 *
 * This mock is intentionally permissive — any valid-looking code_verifier
 * passes, so we can focus on CLIENT compliance, not server correctness.
 * The server-side of WikiMem is already covered by mcp-oauth.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { URL } from 'node:url';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { McpClient } from '../src/core/mcp-client/index.js';
import {
  parseResourceMetadataFromChallenge,
  probeForResourceMetadata,
  fetchProtectedResourceMetadata,
  fetchAuthorizationServerMetadata,
  discoverMcpServer,
} from '../src/core/mcp-client/metadata-discovery.js';
import {
  generatePkce,
  generateState,
  canonicalizeResource,
} from '../src/core/mcp-client/oauth-pkce.js';
import { registerDynamicClient, useStaticClientId } from '../src/core/mcp-client/dcr.js';
import {
  asSupportsCimd,
  buildCimdClientId,
  prepareClientForCimd,
  DEFAULT_CIMD_URL,
  LOCAL_CIMD_URL,
} from '../src/core/mcp-client/cimd.js';

const VAULT_ROOT = join(process.cwd(), '.test-vault-mcp-client');
const MOCK_PORT = 5900;
const MOCK_BASE = `http://127.0.0.1:${MOCK_PORT}`;
const MCP_URL = `${MOCK_BASE}/mcp`;

interface AuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  resource: string;
  scope: string;
  used: boolean;
}

interface IssuedToken {
  access_token: string;
  refresh_token: string;
  client_id: string;
  resource: string;
  scope: string;
  expires_at: number;
  rotated_from?: string;
  revoked: boolean;
}

// Mock MCP server state — cleared between test suites if needed
const state = {
  clients: new Map<string, { client_id: string; redirect_uris: string[] }>(),
  codes: new Map<string, AuthCode>(),
  tokens: new Map<string, IssuedToken>(), // access -> bundle
  refreshTokens: new Map<string, IssuedToken>(), // refresh -> bundle
  // Captured request metadata so tests can assert on the raw wire format
  lastAuthorizeQuery: null as URLSearchParams | null,
  lastTokenBody: null as URLSearchParams | null,
  tokenRequests: [] as Array<{ grant: string; resource: string | null }>,
};

function randomToken(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

function base64UrlFromSha256(input: string): string {
  return createHash('sha256').update(input).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sendJson(res: http.ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(body));
}

function unauthorized(res: http.ServerResponse): void {
  res.writeHead(401, {
    'Content-Type': 'application/json',
    'WWW-Authenticate': `Bearer realm="mock", resource_metadata="${MOCK_BASE}/.well-known/oauth-protected-resource", error="invalid_token"`,
  });
  res.end(JSON.stringify({ error: 'invalid_token' }));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

let server: http.Server;

async function startMockServer(): Promise<void> {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', MOCK_BASE);

    // ── PRM (RFC 9728) ────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-protected-resource') {
      sendJson(res, 200, {
        resource: MCP_URL,
        authorization_servers: [MOCK_BASE],
        scopes_supported: ['read:all', 'write:all'],
        bearer_methods_supported: ['header'],
      });
      return;
    }

    // ── ASM (RFC 8414) ────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-authorization-server') {
      sendJson(res, 200, {
        issuer: MOCK_BASE,
        authorization_endpoint: `${MOCK_BASE}/oauth/authorize`,
        token_endpoint: `${MOCK_BASE}/oauth/token`,
        registration_endpoint: `${MOCK_BASE}/oauth/register`,
        code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        response_types_supported: ['code'],
        scopes_supported: ['read:all', 'write:all'],
      });
      return;
    }

    // ── DCR (RFC 7591) ────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname === '/oauth/register') {
      const bodyText = await readBody(req);
      const body = JSON.parse(bodyText || '{}') as {
        redirect_uris?: string[];
        client_name?: string;
      };
      const clientId = randomToken('dcr_client');
      const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
      state.clients.set(clientId, { client_id: clientId, redirect_uris: redirectUris });
      sendJson(res, 200, {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        redirect_uris: redirectUris,
        client_name: body.client_name ?? 'wikimem-mcp-client',
      });
      return;
    }

    // ── /authorize (auto-approve; returns code via 302) ───────────────
    if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
      state.lastAuthorizeQuery = url.searchParams;
      const clientId = url.searchParams.get('client_id') ?? '';
      const redirect = url.searchParams.get('redirect_uri') ?? '';
      const codeChallenge = url.searchParams.get('code_challenge') ?? '';
      const method = url.searchParams.get('code_challenge_method') ?? '';
      const resource = url.searchParams.get('resource') ?? '';
      const scope = url.searchParams.get('scope') ?? '';
      const stateParam = url.searchParams.get('state') ?? '';
      if (!state.clients.has(clientId)) {
        sendJson(res, 400, { error: 'invalid_client' });
        return;
      }
      if (method !== 'S256' || !codeChallenge) {
        sendJson(res, 400, { error: 'pkce_required' });
        return;
      }
      const code = randomToken('code');
      state.codes.set(code, {
        code,
        client_id: clientId,
        redirect_uri: redirect,
        code_challenge: codeChallenge,
        resource,
        scope,
        used: false,
      });
      const target = new URL(redirect);
      target.searchParams.set('code', code);
      target.searchParams.set('state', stateParam);
      res.writeHead(302, { Location: target.toString() });
      res.end();
      return;
    }

    // ── /token: authorization_code + refresh_token ────────────────────
    if (req.method === 'POST' && url.pathname === '/oauth/token') {
      const raw = await readBody(req);
      const body = new URLSearchParams(raw);
      state.lastTokenBody = body;
      state.tokenRequests.push({ grant: body.get('grant_type') ?? '', resource: body.get('resource') });
      const grant = body.get('grant_type');

      if (grant === 'authorization_code') {
        const code = body.get('code') ?? '';
        const verifier = body.get('code_verifier') ?? '';
        const redirect = body.get('redirect_uri') ?? '';
        const reqResource = body.get('resource') ?? '';
        const entry = state.codes.get(code);
        if (!entry || entry.used || entry.redirect_uri !== redirect) {
          sendJson(res, 400, { error: 'invalid_grant' });
          return;
        }
        // PKCE check
        const derived = base64UrlFromSha256(verifier);
        if (derived !== entry.code_challenge) {
          sendJson(res, 400, { error: 'invalid_pkce' });
          return;
        }
        // Resource indicator must match
        if (!reqResource || reqResource !== entry.resource) {
          sendJson(res, 400, { error: 'invalid_resource' });
          return;
        }
        entry.used = true;
        const access = randomToken('access');
        const refresh = randomToken('refresh');
        const bundle: IssuedToken = {
          access_token: access,
          refresh_token: refresh,
          client_id: entry.client_id,
          resource: entry.resource,
          scope: entry.scope,
          expires_at: Date.now() + 60_000,
          revoked: false,
        };
        state.tokens.set(access, bundle);
        state.refreshTokens.set(refresh, bundle);
        sendJson(res, 200, {
          access_token: access,
          refresh_token: refresh,
          token_type: 'Bearer',
          expires_in: 60,
          scope: entry.scope,
        });
        return;
      }

      if (grant === 'refresh_token') {
        const oldRefresh = body.get('refresh_token') ?? '';
        const existing = state.refreshTokens.get(oldRefresh);
        if (!existing || existing.revoked) {
          // Reuse detection: if this was already rotated, revoke the new chain.
          sendJson(res, 400, { error: 'invalid_grant' });
          return;
        }
        // Rotate (OAuth 2.1 §4.3.1)
        existing.revoked = true;
        state.tokens.delete(existing.access_token);
        const newAccess = randomToken('access');
        const newRefresh = randomToken('refresh');
        const bundle: IssuedToken = {
          access_token: newAccess,
          refresh_token: newRefresh,
          client_id: existing.client_id,
          resource: existing.resource,
          scope: existing.scope,
          expires_at: Date.now() + 60_000,
          rotated_from: oldRefresh,
          revoked: false,
        };
        state.tokens.set(newAccess, bundle);
        state.refreshTokens.set(newRefresh, bundle);
        sendJson(res, 200, {
          access_token: newAccess,
          refresh_token: newRefresh,
          token_type: 'Bearer',
          expires_in: 60,
          scope: existing.scope,
        });
        return;
      }

      sendJson(res, 400, { error: 'unsupported_grant_type' });
      return;
    }

    // ── /mcp: Bearer-guarded JSON-RPC ─────────────────────────────────
    if (url.pathname === '/mcp') {
      const authHeader = req.headers['authorization'];
      const token = typeof authHeader === 'string' && /^Bearer\s+(.+)$/i.exec(authHeader);
      if (!token) {
        unauthorized(res);
        return;
      }
      const access = token[1];
      const bundle = state.tokens.get(access!);
      if (!bundle || bundle.revoked || bundle.expires_at < Date.now()) {
        unauthorized(res);
        return;
      }
      const raw = await readBody(req);
      const rpc = JSON.parse(raw || '{}') as {
        jsonrpc?: string;
        id?: number;
        method?: string;
        params?: Record<string, unknown>;
      };

      if (rpc.method === 'tools/list') {
        sendJson(res, 200, {
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            tools: [
              { name: 'echo', description: 'Echo back arguments', inputSchema: { type: 'object', properties: { msg: { type: 'string' } } } },
              { name: 'add', description: 'Add two numbers', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } } },
            ],
          },
        });
        return;
      }

      if (rpc.method === 'tools/call') {
        const params = rpc.params as { name: string; arguments: Record<string, unknown> };
        if (params.name === 'echo') {
          sendJson(res, 200, {
            jsonrpc: '2.0',
            id: rpc.id,
            result: { content: [{ type: 'text', text: JSON.stringify(params.arguments) }], isError: false },
          });
          return;
        }
        if (params.name === 'add') {
          const args = params.arguments as { a: number; b: number };
          sendJson(res, 200, {
            jsonrpc: '2.0',
            id: rpc.id,
            result: { content: [{ type: 'text', text: String(args.a + args.b) }], isError: false },
          });
          return;
        }
        sendJson(res, 200, {
          jsonrpc: '2.0',
          id: rpc.id,
          error: { code: -32602, message: 'unknown tool' },
        });
        return;
      }

      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: rpc.id,
        error: { code: -32601, message: 'method not found' },
      });
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  await new Promise<void>((resolve) => server.listen(MOCK_PORT, '127.0.0.1', resolve));
}

function simulateBrowserConsent(authorizeUrl: string): Promise<{ code: string; state: string }> {
  // The mock `/authorize` endpoint returns a 302 with `?code=...&state=...`.
  // We don't want Node to follow it (it'd hit the invalid callback URL); we
  // capture the Location header directly.
  return new Promise((resolve, reject) => {
    const u = new URL(authorizeUrl);
    const req = http.request(
      { method: 'GET', hostname: u.hostname, port: u.port, path: u.pathname + u.search },
      (res) => {
        res.resume();
        const loc = res.headers['location'];
        if (res.statusCode !== 302 || typeof loc !== 'string') {
          reject(new Error(`Expected 302 from /authorize, got ${res.statusCode}`));
          return;
        }
        const target = new URL(loc);
        const code = target.searchParams.get('code');
        const st = target.searchParams.get('state');
        if (!code || !st) {
          reject(new Error('callback URL missing code/state'));
          return;
        }
        resolve({ code, state: st });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

beforeAll(async () => {
  if (existsSync(VAULT_ROOT)) rmSync(VAULT_ROOT, { recursive: true, force: true });
  mkdirSync(VAULT_ROOT, { recursive: true });
  await startMockServer();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (existsSync(VAULT_ROOT)) rmSync(VAULT_ROOT, { recursive: true, force: true });
});

describe('PKCE + canonicalization primitives', () => {
  it('generatePkce produces an S256 pair that verifies', () => {
    const pair = generatePkce();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.verifier.length).toBeLessThanOrEqual(128);
    const derived = base64UrlFromSha256(pair.verifier);
    expect(pair.challenge).toBe(derived);
  });

  it('generateState is unique and non-empty', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });

  it('canonicalizeResource strips trailing slash, lowercases scheme/host', () => {
    expect(canonicalizeResource('HTTPS://Example.COM/mcp/')).toBe('https://example.com/mcp');
    expect(canonicalizeResource('https://example.com/')).toBe('https://example.com/');
    expect(canonicalizeResource('http://127.0.0.1:5900/mcp')).toBe('http://127.0.0.1:5900/mcp');
  });

  it('parseResourceMetadataFromChallenge finds both quoted and unquoted values', () => {
    expect(
      parseResourceMetadataFromChallenge('Bearer resource_metadata="https://x.example/.well-known/y"'),
    ).toBe('https://x.example/.well-known/y');
    expect(
      parseResourceMetadataFromChallenge('Bearer resource_metadata=https://x.example/.well-known/y'),
    ).toBe('https://x.example/.well-known/y');
    expect(parseResourceMetadataFromChallenge(null)).toBeNull();
  });

  it('useStaticClientId wraps a pre-registered client_id with optional secret', () => {
    const pub = useStaticClientId('abc', ['http://x']);
    expect(pub.client_id).toBe('abc');
    expect(pub.token_endpoint_auth_method).toBe('none');
    expect(pub.client_secret).toBeUndefined();
    const conf = useStaticClientId('abc', ['http://x'], 'sek');
    expect(conf.token_endpoint_auth_method).toBe('client_secret_basic');
    expect(conf.client_secret).toBe('sek');
  });
});

describe('Mock MCP server — discovery endpoints', () => {
  it('401 probe returns the PRM pointer', async () => {
    const prmUrl = await probeForResourceMetadata(MCP_URL);
    expect(prmUrl).toBe(`${MOCK_BASE}/.well-known/oauth-protected-resource`);
  });

  it('PRM fetch returns spec-compliant body', async () => {
    const prm = await fetchProtectedResourceMetadata(`${MOCK_BASE}/.well-known/oauth-protected-resource`);
    expect(prm.resource).toBe(MCP_URL);
    expect(prm.authorization_servers).toEqual([MOCK_BASE]);
    expect(prm.bearer_methods_supported).toContain('header');
    expect(prm.scopes_supported).toContain('read:all');
  });

  it('ASM fetch returns spec-compliant body', async () => {
    const asm = await fetchAuthorizationServerMetadata(MOCK_BASE);
    expect(asm.issuer).toBe(MOCK_BASE);
    expect(asm.authorization_endpoint).toBe(`${MOCK_BASE}/oauth/authorize`);
    expect(asm.token_endpoint).toBe(`${MOCK_BASE}/oauth/token`);
    expect(asm.registration_endpoint).toBe(`${MOCK_BASE}/oauth/register`);
    expect(asm.code_challenge_methods_supported).toContain('S256');
    expect(asm.grant_types_supported).toContain('authorization_code');
  });

  it('discoverMcpServer chains probe→PRM→ASM and returns the normalized result', async () => {
    const d = await discoverMcpServer(MCP_URL);
    expect(d.canonicalResource).toBe(canonicalizeResource(MCP_URL));
    expect(d.prm.authorization_servers).toEqual([MOCK_BASE]);
    expect(d.asm.issuer).toBe(MOCK_BASE);
  });
});

describe('DCR', () => {
  it('registerDynamicClient issues a client_id for a public client', async () => {
    const asm = await fetchAuthorizationServerMetadata(MOCK_BASE);
    const reg = await registerDynamicClient(asm, {
      clientName: 'Test wikimem-mcp-client',
      redirectUris: ['http://127.0.0.1:9/cb'],
      scope: 'read:all',
    });
    expect(reg.client_id).toMatch(/^dcr_client_/);
    expect(reg.token_endpoint_auth_method).toBe('none');
    expect(reg.redirect_uris).toEqual(['http://127.0.0.1:9/cb']);
    expect(reg.client_secret).toBeUndefined();
  });
});

describe('End-to-end: connect → finalize → tools/list → tools/call', () => {
  it('happy path: full flow, Resource Indicator carried on BOTH endpoints', async () => {
    const client = new McpClient({ vaultRoot: VAULT_ROOT, clientName: 'wikimem-test' });
    const prepared = await client.connect({
      mcpUrl: MCP_URL,
      redirectUri: 'http://127.0.0.1:9/cb',
    });

    // Verify authorizeUrl carries PKCE + resource
    const auth = new URL(prepared.authorizeUrl);
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
    expect(auth.searchParams.get('code_challenge')).toBeTruthy();
    expect(auth.searchParams.get('resource')).toBe(canonicalizeResource(MCP_URL));
    expect(auth.searchParams.get('state')).toBe(prepared.state);

    // Simulate the user consenting
    const { code, state: cbState } = await simulateBrowserConsent(prepared.authorizeUrl);
    expect(cbState).toBe(prepared.state);

    // Finalize token exchange
    const entry = await client.finalize(prepared, code);
    expect(entry.access_token).toMatch(/^access_/);
    expect(entry.refresh_token).toMatch(/^refresh_/);
    expect(entry.mcp_url).toBe(canonicalizeResource(MCP_URL));
    // Client resolves scope from PRM.scopes_supported by default.
    expect(entry.scope).toBe('read:all write:all');

    // Verify the token request carried resource=
    const tokenReq = state.tokenRequests.at(-1);
    expect(tokenReq?.grant).toBe('authorization_code');
    expect(tokenReq?.resource).toBe(canonicalizeResource(MCP_URL));

    // tools/list
    const tools = await client.listTools(MCP_URL);
    expect(tools.map((t) => t.name).sort()).toEqual(['add', 'echo']);

    // tools/call
    const result = await client.callTool(MCP_URL, 'add', { a: 2, b: 3 });
    expect(result.isError).toBe(false);
    expect(result.content?.[0]?.text).toBe('5');

    // Connections list (redacted)
    const connections = client.listConnections();
    expect(connections.length).toBe(1);
    const redacted = connections[0] as Record<string, unknown>;
    expect(redacted['access_token']).toBeUndefined();
    expect(redacted['refresh_token']).toBeUndefined();
    expect(redacted['mcp_url']).toBe(canonicalizeResource(MCP_URL));
  });

  it('no token logging: the client module does not log any token value', () => {
    // Read the compiled-ish sources and grep for logger calls that reference
    // access_token / refresh_token. This is a belt-and-suspenders check —
    // the actual logging ban is enforced in code review, but a regression
    // here would break the security contract.
    const files = [
      'src/core/mcp-client/client.ts',
      'src/core/mcp-client/oauth-pkce.ts',
      'src/core/mcp-client/token-store.ts',
      'src/core/mcp-client/metadata-discovery.ts',
      'src/core/mcp-client/dcr.ts',
    ];
    const banned = /console\.(log|warn|error|info|debug)\s*\([^)]*(access_token|refresh_token|client_secret)/i;
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      expect(src.match(banned), `token logging found in ${f}`).toBeNull();
    }
  });

  it('refresh rotation: new refresh token invalidates old; token re-use detection on replay', async () => {
    const client = new McpClient({ vaultRoot: VAULT_ROOT, clientName: 'wikimem-test' });
    // Force the stored entry to be expired so jsonRpc triggers a refresh.
    const beforeRefresh = client._getEntry(MCP_URL);
    expect(beforeRefresh).toBeTruthy();
    const oldRefresh = beforeRefresh!.refresh_token;
    expect(oldRefresh).toBeTruthy();

    const rotated = await client.refresh(MCP_URL);
    expect(rotated.access_token).not.toBe(beforeRefresh!.access_token);
    expect(rotated.refresh_token).not.toBe(oldRefresh);

    // Replay the old refresh token — server must reject.
    const replay = await fetch(`${MOCK_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: oldRefresh!,
        client_id: beforeRefresh!.client_id,
      }).toString(),
    });
    expect(replay.status).toBe(400);
  });

  it('401 auto-refresh on stale access token, retries once and succeeds', async () => {
    const client = new McpClient({ vaultRoot: VAULT_ROOT, clientName: 'wikimem-test' });
    // Forcibly expire the access token by manipulating the mock state.
    const entry = client._getEntry(MCP_URL)!;
    const bundle = state.tokens.get(entry.access_token);
    expect(bundle).toBeTruthy();
    bundle!.expires_at = Date.now() - 1; // Immediately expired
    // Now call — the server returns 401, client must refresh + retry.
    const tools = await client.listTools(MCP_URL);
    expect(tools.length).toBe(2);
  });

  it('disconnect wipes the stored tokens', async () => {
    const client = new McpClient({ vaultRoot: VAULT_ROOT });
    expect(client._getEntry(MCP_URL)).toBeTruthy();
    client.disconnect(MCP_URL);
    expect(client._getEntry(MCP_URL)).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════
// CIMD (Client ID Metadata Documents — Nov 2025 spec, draft-parecki)
// ════════════════════════════════════════════════════════════════════════
//
// We stand up a SECOND mock MCP server on a separate port that advertises
// `client_id_metadata_document_supported: true`. The client should detect
// CIMD and skip the /register endpoint entirely — using the canonical
// CIMD URL as its `client_id` directly. We assert that no /register call
// is observed by the mock AS.

const CIMD_PORT = 5901;
const CIMD_BASE = `http://127.0.0.1:${CIMD_PORT}`;
const CIMD_MCP_URL = `${CIMD_BASE}/mcp`;
// Override the canonical CIMD URL for the test so the AS can resolve it.
const TEST_CIMD_CLIENT_ID = `${CIMD_BASE}/.well-known/oauth-client-metadata.json`;
const VAULT_ROOT_CIMD = join(process.cwd(), '.test-vault-mcp-client-cimd');

interface CimdAuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  resource: string;
  scope: string;
}

interface CimdToken {
  access_token: string;
  refresh_token: string;
  client_id: string;
  resource: string;
  scope: string;
  expires_at: number;
}

const cimdState = {
  // Whether the server advertises BOTH (DCR + CIMD). When true the test
  // asserts the client picks CIMD (preference order per cimd.ts).
  advertiseDcr: false,
  // Tracks whether /register was ever called. If CIMD works correctly
  // this MUST stay 0 — the whole point is to skip DCR.
  registerCalls: 0,
  codes: new Map<string, CimdAuthCode>(),
  tokens: new Map<string, CimdToken>(),
  // Capture the metadata file fetches so we can prove the AS would have
  // resolved our CIMD URL. (We don't actually require the AS to fetch it
  // for the test to pass — most ASes cache, and the CIMD spec only says
  // SHOULD validate.)
  cimdMetadataFetches: 0,
  lastAuthorizeQuery: null as URLSearchParams | null,
  lastTokenBody: null as URLSearchParams | null,
};

let cimdServer: http.Server;

async function startCimdMockServer(): Promise<void> {
  cimdServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', CIMD_BASE);

    // ── PRM ──────────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-protected-resource') {
      sendJson(res, 200, {
        resource: CIMD_MCP_URL,
        authorization_servers: [CIMD_BASE],
        scopes_supported: ['read:cimd'],
        bearer_methods_supported: ['header'],
      });
      return;
    }

    // ── ASM (CIMD-aware) ─────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-authorization-server') {
      const body: Record<string, unknown> = {
        issuer: CIMD_BASE,
        authorization_endpoint: `${CIMD_BASE}/oauth/authorize`,
        token_endpoint: `${CIMD_BASE}/oauth/token`,
        code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        response_types_supported: ['code'],
        scopes_supported: ['read:cimd'],
        client_id_metadata_document_supported: true,
      };
      // Toggle: when both DCR and CIMD are advertised, we expect the
      // client to prefer CIMD. cimdState.advertiseDcr controls that.
      if (cimdState.advertiseDcr) {
        body['registration_endpoint'] = `${CIMD_BASE}/oauth/register`;
      }
      sendJson(res, 200, body);
      return;
    }

    // ── CIMD client metadata document ────────────────────────────────
    // Self-host the test client's metadata document. Mirrors the
    // production file at src/web/public/.well-known/oauth-client-metadata.json
    // but with a `client_id` matching this test server's URL.
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-client-metadata.json') {
      cimdState.cimdMetadataFetches += 1;
      sendJson(res, 200, {
        client_id: TEST_CIMD_CLIENT_ID,
        client_name: 'WikiMem (CIMD test)',
        client_uri: 'https://wikimem.dev',
        redirect_uris: ['http://127.0.0.1:9/cb'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'read:cimd',
        software_id: 'wikimem',
      });
      return;
    }

    // ── /register: track if called (it MUST NOT be when CIMD wins) ───
    if (req.method === 'POST' && url.pathname === '/oauth/register') {
      cimdState.registerCalls += 1;
      // Even if called, return a sensible response so the test can
      // distinguish "called and used" from "skipped entirely".
      sendJson(res, 200, {
        client_id: 'dcr_should_not_be_used',
        token_endpoint_auth_method: 'none',
        redirect_uris: ['http://127.0.0.1:9/cb'],
      });
      return;
    }

    // ── /authorize ───────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
      cimdState.lastAuthorizeQuery = url.searchParams;
      const clientId = url.searchParams.get('client_id') ?? '';
      const redirect = url.searchParams.get('redirect_uri') ?? '';
      const codeChallenge = url.searchParams.get('code_challenge') ?? '';
      const method = url.searchParams.get('code_challenge_method') ?? '';
      const resource = url.searchParams.get('resource') ?? '';
      const scope = url.searchParams.get('scope') ?? '';
      const stateParam = url.searchParams.get('state') ?? '';
      // CIMD-aware AS: client_id MUST be the metadata URL.
      if (clientId !== TEST_CIMD_CLIENT_ID && clientId !== 'dcr_should_not_be_used') {
        sendJson(res, 400, { error: 'invalid_client_id_for_cimd_as', received: clientId });
        return;
      }
      if (method !== 'S256' || !codeChallenge) {
        sendJson(res, 400, { error: 'pkce_required' });
        return;
      }
      const code = randomToken('cimd_code');
      cimdState.codes.set(code, { code, client_id: clientId, redirect_uri: redirect, code_challenge: codeChallenge, resource, scope });
      const target = new URL(redirect);
      target.searchParams.set('code', code);
      target.searchParams.set('state', stateParam);
      res.writeHead(302, { Location: target.toString() });
      res.end();
      return;
    }

    // ── /token ───────────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname === '/oauth/token') {
      const raw = await readBody(req);
      const body = new URLSearchParams(raw);
      cimdState.lastTokenBody = body;
      const grant = body.get('grant_type');
      if (grant === 'authorization_code') {
        const code = body.get('code') ?? '';
        const verifier = body.get('code_verifier') ?? '';
        const reqResource = body.get('resource') ?? '';
        const sentClientId = body.get('client_id') ?? '';
        const entry = cimdState.codes.get(code);
        if (!entry) { sendJson(res, 400, { error: 'invalid_grant' }); return; }
        const derived = base64UrlFromSha256(verifier);
        if (derived !== entry.code_challenge) { sendJson(res, 400, { error: 'invalid_pkce' }); return; }
        if (reqResource !== entry.resource) { sendJson(res, 400, { error: 'invalid_resource' }); return; }
        if (sentClientId !== entry.client_id) { sendJson(res, 400, { error: 'client_id_mismatch' }); return; }
        const access = randomToken('cimd_access');
        const refresh = randomToken('cimd_refresh');
        cimdState.tokens.set(access, {
          access_token: access,
          refresh_token: refresh,
          client_id: entry.client_id,
          resource: entry.resource,
          scope: entry.scope,
          expires_at: Date.now() + 60_000,
        });
        sendJson(res, 200, {
          access_token: access,
          refresh_token: refresh,
          token_type: 'Bearer',
          expires_in: 60,
          scope: entry.scope,
        });
        return;
      }
      sendJson(res, 400, { error: 'unsupported_grant_type' });
      return;
    }

    // ── /mcp: bearer-guarded; minimal tools/list ─────────────────────
    if (url.pathname === '/mcp') {
      const authHeader = req.headers['authorization'];
      const m = typeof authHeader === 'string' && /^Bearer\s+(.+)$/i.exec(authHeader);
      if (!m) {
        res.writeHead(401, {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer realm="cimd-mock", resource_metadata="${CIMD_BASE}/.well-known/oauth-protected-resource"`,
        });
        res.end(JSON.stringify({ error: 'invalid_token' }));
        return;
      }
      const access = m[1];
      const tok = cimdState.tokens.get(access!);
      if (!tok) {
        res.writeHead(401, {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer realm="cimd-mock", resource_metadata="${CIMD_BASE}/.well-known/oauth-protected-resource"`,
        });
        res.end(JSON.stringify({ error: 'invalid_token' }));
        return;
      }
      const raw = await readBody(req);
      const rpc = JSON.parse(raw || '{}') as { id?: number; method?: string };
      if (rpc.method === 'tools/list') {
        sendJson(res, 200, {
          jsonrpc: '2.0',
          id: rpc.id,
          result: { tools: [{ name: 'cimd_ping', description: 'cimd-only tool' }] },
        });
        return;
      }
      sendJson(res, 200, { jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'method not found' } });
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  await new Promise<void>((resolve) => cimdServer.listen(CIMD_PORT, '127.0.0.1', resolve));
}

describe('CIMD primitives', () => {
  it('buildCimdClientId returns the canonical URL by default', () => {
    delete process.env['WIKIMEM_CIMD_LOCAL'];
    expect(buildCimdClientId()).toBe(DEFAULT_CIMD_URL);
  });

  it('buildCimdClientId honors caller override', () => {
    expect(buildCimdClientId({ canonicalCimdUrl: 'https://example.com/.well-known/x.json' }))
      .toBe('https://example.com/.well-known/x.json');
  });

  it('buildCimdClientId returns the local URL when WIKIMEM_CIMD_LOCAL=1', () => {
    process.env['WIKIMEM_CIMD_LOCAL'] = '1';
    try {
      expect(buildCimdClientId()).toBe(LOCAL_CIMD_URL);
    } finally {
      delete process.env['WIKIMEM_CIMD_LOCAL'];
    }
  });

  it('asSupportsCimd is true only when AS advertises support, false otherwise', () => {
    const baseAsm = {
      issuer: 'x',
      authorization_endpoint: 'x',
      token_endpoint: 'x',
      code_challenge_methods_supported: ['S256'],
      grant_types_supported: ['authorization_code'],
      response_types_supported: ['code'],
    };
    expect(asSupportsCimd(baseAsm as never)).toBe(false);
    expect(asSupportsCimd({ ...baseAsm, client_id_metadata_document_supported: true } as never)).toBe(true);
    // Spec-draft alternates accepted only when explicitly true.
    expect(asSupportsCimd({ ...baseAsm, cimd_supported: true } as never)).toBe(true);
    expect(asSupportsCimd({ ...baseAsm, client_id_metadata_documents_supported: true } as never)).toBe(true);
    // Falsy / absent → false.
    expect(asSupportsCimd({ ...baseAsm, client_id_metadata_document_supported: false } as never)).toBe(false);
  });

  it('prepareClientForCimd returns the URL as client_id without a secret', () => {
    const c = prepareClientForCimd({
      redirectUris: ['http://127.0.0.1:9/cb'],
      canonicalCimdUrl: 'https://example.com/.well-known/y.json',
    });
    expect(c.client_id).toBe('https://example.com/.well-known/y.json');
    expect(c.token_endpoint_auth_method).toBe('none');
    expect(c.client_secret).toBeUndefined();
    expect(c.redirect_uris).toEqual(['http://127.0.0.1:9/cb']);
  });
});

describe('CIMD end-to-end against a CIMD-aware mock AS', () => {
  beforeAll(async () => {
    if (existsSync(VAULT_ROOT_CIMD)) rmSync(VAULT_ROOT_CIMD, { recursive: true, force: true });
    mkdirSync(VAULT_ROOT_CIMD, { recursive: true });
    await startCimdMockServer();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => cimdServer.close(() => resolve()));
    if (existsSync(VAULT_ROOT_CIMD)) rmSync(VAULT_ROOT_CIMD, { recursive: true, force: true });
  });

  it('CIMD-only AS: client uses metadata URL as client_id and SKIPS /register', async () => {
    cimdState.advertiseDcr = false; // CIMD-only
    cimdState.registerCalls = 0;
    const client = new McpClient({ vaultRoot: VAULT_ROOT_CIMD, clientName: 'wikimem-cimd-test' });
    const prepared = await client.connect({
      mcpUrl: CIMD_MCP_URL,
      redirectUri: 'http://127.0.0.1:9/cb',
      cimdClientIdUrl: TEST_CIMD_CLIENT_ID,
    });

    expect(prepared.client.client_id).toBe(TEST_CIMD_CLIENT_ID);
    expect(prepared.client.client_secret).toBeUndefined();
    // Critical: the whole point of CIMD is to skip DCR.
    expect(cimdState.registerCalls).toBe(0);
    // Authorize URL carries our CIMD URL as client_id.
    const auth = new URL(prepared.authorizeUrl);
    expect(auth.searchParams.get('client_id')).toBe(TEST_CIMD_CLIENT_ID);
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
    expect(auth.searchParams.get('resource')).toBe(canonicalizeResource(CIMD_MCP_URL));

    // Walk the rest of the flow to prove the registered client_id round-trips.
    const u = new URL(prepared.authorizeUrl);
    const consent = await new Promise<{ code: string; state: string }>((resolve, reject) => {
      const r = http.request(
        { method: 'GET', hostname: u.hostname, port: u.port, path: u.pathname + u.search },
        (res) => {
          res.resume();
          const loc = res.headers['location'];
          if (res.statusCode !== 302 || typeof loc !== 'string') {
            reject(new Error(`Expected 302, got ${res.statusCode}`));
            return;
          }
          const t = new URL(loc);
          const code = t.searchParams.get('code');
          const st = t.searchParams.get('state');
          if (!code || !st) { reject(new Error('missing code/state')); return; }
          resolve({ code, state: st });
        },
      );
      r.on('error', reject);
      r.end();
    });
    expect(consent.state).toBe(prepared.state);
    const entry = await client.finalize(prepared, consent.code);
    expect(entry.client_id).toBe(TEST_CIMD_CLIENT_ID);
    expect(entry.access_token).toMatch(/^cimd_access_/);
    // The /register endpoint must STILL not have been called after the
    // full token exchange — CIMD path is registration-free end-to-end.
    expect(cimdState.registerCalls).toBe(0);
    // tools/list works with the bearer.
    const tools = await client.listTools(CIMD_MCP_URL);
    expect(tools.map((t) => t.name)).toEqual(['cimd_ping']);
  });

  it('AS advertises BOTH DCR + CIMD: client prefers CIMD (no /register call)', async () => {
    cimdState.advertiseDcr = true; // Both modes advertised
    cimdState.registerCalls = 0;
    // Use a fresh vault to avoid token-store pollution from the previous test.
    const VAULT2 = join(process.cwd(), '.test-vault-mcp-client-cimd-pref');
    if (existsSync(VAULT2)) rmSync(VAULT2, { recursive: true, force: true });
    mkdirSync(VAULT2, { recursive: true });
    try {
      const client = new McpClient({ vaultRoot: VAULT2 });
      const prepared = await client.connect({
        mcpUrl: CIMD_MCP_URL,
        redirectUri: 'http://127.0.0.1:9/cb',
        cimdClientIdUrl: TEST_CIMD_CLIENT_ID,
      });
      // Documented preference (cimd.ts spec ladder): when both modes are
      // available, CIMD wins because it avoids the /register round-trip
      // and the per-install AS DB row.
      expect(prepared.client.client_id).toBe(TEST_CIMD_CLIENT_ID);
      expect(cimdState.registerCalls).toBe(0);
    } finally {
      if (existsSync(VAULT2)) rmSync(VAULT2, { recursive: true, force: true });
    }
  });

  it('staticClientId still wins over CIMD when caller supplies it explicitly', async () => {
    cimdState.advertiseDcr = false;
    cimdState.registerCalls = 0;
    const VAULT3 = join(process.cwd(), '.test-vault-mcp-client-static');
    if (existsSync(VAULT3)) rmSync(VAULT3, { recursive: true, force: true });
    mkdirSync(VAULT3, { recursive: true });
    try {
      const client = new McpClient({ vaultRoot: VAULT3 });
      const prepared = await client.connect({
        mcpUrl: CIMD_MCP_URL,
        redirectUri: 'http://127.0.0.1:9/cb',
        staticClientId: 'user-pasted-client',
      });
      expect(prepared.client.client_id).toBe('user-pasted-client');
      expect(cimdState.registerCalls).toBe(0);
    } finally {
      if (existsSync(VAULT3)) rmSync(VAULT3, { recursive: true, force: true });
    }
  });
});
