import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hostname, userInfo } from 'node:os';

// ── Gitignore ────────────────────────────────────────────────────────────────

const GITIGNORE_BLOCK = `# wikimem — privacy protection
# Only wiki/ and AGENTS.md are safe to commit.
.wikimem/tokens.json
.wikimem/api-keys.json
.wikimem/observer-experiment-log.json
raw/
config.yaml
*.env
.env
.env.*
.DS_Store
*.pdf
*.docx
*.xlsx
*.pptx
*.mp3
*.mp4
*.mov
*.wav
*.jpg
*.jpeg
*.png
*.gif
*.zip
.wikimem-cache/
`;

const REQUIRED_ENTRIES = [
  '.wikimem/tokens.json',
  '.wikimem/api-keys.json',
  'raw/',
  'config.yaml',
];

export function ensureVaultGitignore(vaultRoot: string): void {
  const gitignorePath = join(vaultRoot, '.gitignore');

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, GITIGNORE_BLOCK, 'utf-8');
    return;
  }

  const existing = readFileSync(gitignorePath, 'utf-8');
  const missing = REQUIRED_ENTRIES.filter((entry) => !existing.includes(entry));

  if (missing.length > 0) {
    const additions = missing.join('\n');
    writeFileSync(
      gitignorePath,
      `${existing}\n# Added by wikimem (privacy protection)\n${additions}\n`,
      'utf-8',
    );
  }
}

// ── Encryption (AES-256-GCM, machine-bound key) ──────────────────────────────

const ENC_PREFIX = 'enc:';

function deriveMachineKey(): Buffer {
  const seed = `${hostname()}::${userInfo().username}::wikimem-v1`;
  return createHash('sha256').update(seed).digest();
}

/**
 * Encrypt a plaintext string. Returns `enc:<hex iv>:<hex authTag>:<hex ciphertext>`.
 */
export function encryptValue(plaintext: string): string {
  const key = deriveMachineKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a value previously encrypted with `encryptValue`. Returns the
 * original plaintext, or `null` if the value is not encrypted or decryption
 * fails (e.g. machine mismatch).
 */
export function decryptValue(value: string): string | null {
  if (!value.startsWith(ENC_PREFIX)) return null;
  try {
    const parts = value.slice(ENC_PREFIX.length).split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, ciphertextHex] = parts;
    if (!ivHex || !authTagHex || !ciphertextHex) return null;
    const key = deriveMachineKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch {
    return null;
  }
}

/** Returns true if the value looks like an encrypted blob. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

// ── Privacy accepted ─────────────────────────────────────────────────────────

export interface PrivacyAccepted {
  accepted: boolean;
  acceptedAt: string;
  version: number;
}

const PRIVACY_VERSION = 1;

function getPrivacyFilePath(vaultRoot: string): string {
  return join(vaultRoot, '.wikimem', 'privacy-accepted.json');
}

export function isPrivacyAccepted(vaultRoot: string): boolean {
  const filePath = getPrivacyFilePath(vaultRoot);
  if (!existsSync(filePath)) return false;
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<PrivacyAccepted>;
    return data.accepted === true && data.version === PRIVACY_VERSION;
  } catch {
    return false;
  }
}

export function markPrivacyAccepted(vaultRoot: string): void {
  const filePath = getPrivacyFilePath(vaultRoot);
  mkdirSync(join(vaultRoot, '.wikimem'), { recursive: true });
  const record: PrivacyAccepted = {
    accepted: true,
    acceptedAt: new Date().toISOString(),
    version: PRIVACY_VERSION,
  };
  writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

// ── Delete all data ───────────────────────────────────────────────────────────

import { rmSync, readdirSync } from 'node:fs';

/**
 * Permanently delete all vault data: wiki pages, raw files, tokens,
 * api-keys, observer logs, history, and the AGENTS.md schema.
 *
 * Returns a list of paths that were deleted.
 */
export function deleteAllVaultData(vaultRoot: string): string[] {
  const deleted: string[] = [];

  const targets = [
    join(vaultRoot, 'raw'),
    join(vaultRoot, 'wiki'),
    join(vaultRoot, '.wikimem', 'tokens.json'),
    join(vaultRoot, '.wikimem', 'api-keys.json'),
    join(vaultRoot, '.wikimem', 'observer-experiment-log.json'),
    join(vaultRoot, '.wikimem', 'privacy-accepted.json'),
    join(vaultRoot, 'AGENTS.md'),
    join(vaultRoot, 'config.yaml'),
  ];

  // Also delete any *.log files inside .wikimem/
  const wikimemDir = join(vaultRoot, '.wikimem');
  if (existsSync(wikimemDir)) {
    try {
      const entries = readdirSync(wikimemDir);
      for (const entry of entries) {
        if (entry.endsWith('.log') || entry.endsWith('.json')) {
          targets.push(join(wikimemDir, entry));
        }
      }
    } catch { /* non-fatal */ }
  }

  for (const target of targets) {
    if (existsSync(target)) {
      try {
        rmSync(target, { recursive: true, force: true });
        deleted.push(target);
      } catch { /* non-fatal */ }
    }
  }

  return deleted;
}

// ── Connector permission descriptions ────────────────────────────────────────

export interface ConnectorPermissions {
  read: string[];
  cannotDo: string[];
}

export const CONNECTOR_PERMISSIONS: Record<string, ConnectorPermissions> = {
  github: {
    read: ['Public and private repositories you authorize', 'Issues, pull requests, and comments', 'Starred projects and organization data'],
    cannotDo: ['Create, modify, or delete repositories', 'Push commits or merge PRs', 'Manage users or teams'],
  },
  slack: {
    read: ['Messages in channels you authorize', 'Thread replies and file metadata', 'Channel list and member profiles'],
    cannotDo: ['Send messages, reply to threads, or post files', 'Add/remove members or create channels', 'Delete or edit messages'],
  },
  google: {
    read: ['Email threads, labels, and attachment metadata (Gmail)', 'Files and folder structure you authorize (Drive)'],
    cannotDo: ['Send emails, create drafts, or delete messages', 'Upload, move, or delete Drive files', 'Access accounts or billing'],
  },
  linear: {
    read: ['Issues, projects, and cycle data', 'Team activity and comments', 'Labels and milestones'],
    cannotDo: ['Create or modify issues, projects, or cycles', 'Manage team settings or members', 'Delete any data'],
  },
  jira: {
    read: ['Issues, epics, and sprint data', 'Comments and attachments metadata', 'Project and board structure'],
    cannotDo: ['Create or modify issues', 'Change project settings', 'Delete any data'],
  },
  notion: {
    read: ['Pages and databases you share with the integration', 'Block content and properties'],
    cannotDo: ['Create, update, or delete pages', 'Change workspace settings', 'Access pages not explicitly shared'],
  },
};
