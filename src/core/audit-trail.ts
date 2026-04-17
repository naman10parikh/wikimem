import { appendFileSync, existsSync, mkdirSync, openSync, readSync, statSync, readFileSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'ingest' | 'scrape' | 'improve' | 'observe' | 'edit' | 'restore';
  actor: 'human' | 'agent' | 'webhook' | 'observer';
  source?: string;
  summary: string;
  pagesAffected: string[];
  commitHash?: string;
  duration?: number;
}

export function getAuditTrailPath(vaultRoot: string): string {
  return join(vaultRoot, '.wikimem', 'audit-trail.jsonl');
}

export function appendAuditEntry(
  vaultRoot: string,
  entry: Omit<AuditEntry, 'id' | 'timestamp'>,
): AuditEntry {
  const dir = join(vaultRoot, '.wikimem');
  mkdirSync(dir, { recursive: true });
  const full: AuditEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  appendFileSync(getAuditTrailPath(vaultRoot), JSON.stringify(full) + '\n', 'utf-8');
  return full;
}

/** Read the last N bytes of a file as a string (for tail-read optimisation). */
function readTailBytes(filePath: string, byteCount: number): string {
  const stat = statSync(filePath);
  const readFrom = Math.max(0, stat.size - byteCount);
  const buf = Buffer.allocUnsafe(stat.size - readFrom);
  const fd = openSync(filePath, 'r');
  try {
    readSync(fd, buf, 0, buf.length, readFrom);
  } finally {
    closeSync(fd);
  }
  return buf.toString('utf-8');
}

const TAIL_READ_THRESHOLD = 50 * 1024; // 50 KB — full read below this

export function readAuditTrail(
  vaultRoot: string,
  limit = 50,
  actor?: string,
  action?: string,
  since?: string,
  before?: string,
): AuditEntry[] {
  const trailPath = getAuditTrailPath(vaultRoot);
  if (!existsSync(trailPath)) return [];

  // When filtering only by limit (no actor/action/since/before), use tail-read to
  // avoid reading the entire file.  Falls back to full read for files < 50 KB or
  // when additional filters are active (they need the full dataset).
  const needsFullScan = (actor && actor !== 'all') || (action && action !== 'all') || since || before;
  const fileSize = statSync(trailPath).size;
  const usesTailRead = !needsFullScan && fileSize >= TAIL_READ_THRESHOLD;

  let rawText: string;
  if (usesTailRead) {
    // Read only the last limit*500 bytes — generous estimate per JSONL line
    rawText = readTailBytes(trailPath, limit * 500);
  } else {
    rawText = readFileSync(trailPath, 'utf-8');
  }

  const lines = rawText.trim().split('\n').filter(Boolean);
  let entries: AuditEntry[] = [];

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as AuditEntry);
    } catch {
      // skip malformed lines (including partial first line from tail-read)
    }
  }

  if (actor && actor !== 'all') entries = entries.filter((e) => e.actor === actor);
  if (action && action !== 'all') entries = entries.filter((e) => e.action === action);
  if (since) entries = entries.filter((e) => e.timestamp >= since);
  if (before) entries = entries.filter((e) => e.timestamp <= before);

  // Most-recent first
  return entries.reverse().slice(0, limit);
}
