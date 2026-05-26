/**
 * Client ID Metadata Documents (CIMD) — Nov 2025 MCP spec extension
 * (draft-parecki-oauth-client-id-metadata-document, MCP SEP-991/SEP-1032).
 *
 * The CIMD pattern lets a public OAuth client (like WikiMem running on a
 * user's laptop) skip Dynamic Client Registration entirely. Instead of
 * POSTing to `/register` and getting back an opaque `client_id`, the client
 * advertises its metadata at a stable HTTPS URL and uses *that URL itself*
 * as its `client_id` on every authorize/token request.
 *
 * Why this matters for WikiMem:
 *   - WikiMem is open-source. Every user runs their own instance. With DCR
 *     each user's instance would call `/register` against every AS they
 *     connect to — fine for a small number of users, but unbounded for an
 *     OSS tool. CIMD collapses that to a single shared metadata URL that
 *     EVERY WikiMem install advertises as its client_id.
 *   - The AS fetches the metadata document at runtime (with caching) and
 *     uses the values it finds (`client_name`, `redirect_uris`, etc.) to
 *     render the consent screen. No DB row per client, no client store.
 *   - Anthropic's Claude Connectors use a similar pattern via Anthropic's
 *     own `auth_callback`. CIMD is the OSS-friendly version of that.
 *
 * Spec ladder this module sits on:
 *
 *   1. AS supports CIMD (`client_id_metadata_document_supported: true`)
 *      → use `prepareClientForCimd()`. NO `/register` call.
 *   2. Else AS advertises `registration_endpoint`
 *      → fall back to `registerDynamicClient()` (see `dcr.ts`).
 *   3. Else user supplied a pre-registered `staticClientId`
 *      → fall back to `useStaticClientId()`.
 *   4. Else throw — instruct the user to paste a client_id manually.
 *
 * The module is intentionally tiny — CIMD is just "use a URL as your
 * client_id and don't call /register". All the heavy lifting (PKCE,
 * resource indicator, refresh rotation) lives in `client.ts` and is shared
 * across the three registration paths.
 */

import type { AuthorizationServerMetadata } from './metadata-discovery.js';
import type { RegisteredMcpClient } from './dcr.js';

/**
 * The canonical HTTPS URL where WikiMem publishes its CIMD metadata.
 *
 * This is the value users see on consent screens and the value the AS
 * fetches to learn our `client_name`, `redirect_uris`, etc. It is NOT a
 * secret — it's literally meant to be public.
 *
 * The fallback (`WIKIMEM_CIMD_LOCAL=1`) points at the user's local
 * `wikimem serve` instance for development. Most ASes will reject non-HTTPS
 * client_id URLs — this branch exists for offline integration tests, NOT
 * for production AS connections.
 */
export const DEFAULT_CIMD_URL =
  'https://wikimem.dev/.well-known/oauth-client-metadata.json';

export const LOCAL_CIMD_URL =
  'http://127.0.0.1:3456/.well-known/oauth-client-metadata.json';

export interface CimdClientIdOpts {
  /**
   * Override the canonical CIMD URL. If unset, returns `DEFAULT_CIMD_URL`
   * unless `WIKIMEM_CIMD_LOCAL=1` is set, in which case `LOCAL_CIMD_URL`.
   */
  canonicalCimdUrl?: string;
}

/**
 * Build the `client_id` value WikiMem sends on `/authorize` and `/token`
 * requests when the AS supports CIMD.
 *
 * This is just a URL — but per the CIMD spec the URL MUST be the same as
 * the value advertised in the metadata document's `client_id` field. So
 * the metadata file at that URL must contain `"client_id": "<this url>"`.
 */
export function buildCimdClientId(opts: CimdClientIdOpts = {}): string {
  if (opts.canonicalCimdUrl && opts.canonicalCimdUrl.trim()) {
    return opts.canonicalCimdUrl.trim();
  }
  if (process.env['WIKIMEM_CIMD_LOCAL'] === '1') {
    return LOCAL_CIMD_URL;
  }
  return DEFAULT_CIMD_URL;
}

/**
 * Decide whether an AS advertises support for Client ID Metadata Documents.
 *
 * Per draft-parecki-oauth-client-id-metadata-document the AS metadata
 * SHOULD include `client_id_metadata_document_supported: true`. The spec
 * is still draft so we also accept a couple of pre-IETF-registered
 * spelling variants observed in the wild — but only as a positive hint;
 * we never *infer* CIMD from absent metadata.
 *
 * Returns `false` whenever the signal is missing or ambiguous so the
 * caller falls through to DCR / static client_id.
 */
export function asSupportsCimd(asm: AuthorizationServerMetadata): boolean {
  const raw = asm as unknown as Record<string, unknown>;
  // Canonical flag from the Nov 2025 spec.
  if (raw['client_id_metadata_document_supported'] === true) return true;
  // Some early implementations spell it slightly differently; accept the
  // alternates only when explicitly true.
  if (raw['cimd_supported'] === true) return true;
  if (raw['client_id_metadata_documents_supported'] === true) return true;
  return false;
}

export interface PrepareCimdInput {
  /** Redirect URI(s) WikiMem will use on this connection. */
  redirectUris: string[];
  /** Override the canonical CIMD URL (test/dev knob). */
  canonicalCimdUrl?: string;
}

/**
 * Build the registered-client record for a CIMD-mediated connection.
 *
 * No network call: the entire point of CIMD is that registration is
 * implicit (the AS resolves the URL when it first sees it). The returned
 * `client_id` IS the metadata URL — wikimem will pass it verbatim on
 * every `/authorize` and `/token` request.
 *
 * Always public — CIMD is for public clients. We never set a secret here.
 */
export function prepareClientForCimd(input: PrepareCimdInput): RegisteredMcpClient {
  const buildOpts: CimdClientIdOpts = {};
  if (input.canonicalCimdUrl !== undefined) {
    buildOpts.canonicalCimdUrl = input.canonicalCimdUrl;
  }
  const clientId = buildCimdClientId(buildOpts);
  return {
    client_id: clientId,
    token_endpoint_auth_method: 'none',
    redirect_uris: input.redirectUris,
  };
}
