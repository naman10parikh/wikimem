#!/usr/bin/env bash
# doc-health-check.sh — Validate documentation health across the Energy repo
# Run: ./scripts/doc-health-check.sh
# Non-blocking: prints warnings, exits 0 always (for use in SessionStart hooks)

set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")/..")"

PASS=0
FAIL=0
WARN=0

check_pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
check_fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo "  WARN: $1"; WARN=$((WARN + 1)); }

echo "=== DOC HEALTH CHECK ==="
echo ""

# 1. MEMORY.md line count
echo "[1] memory/MEMORY.md line count"
if [ -f memory/MEMORY.md ]; then
  LINES=$(wc -l < memory/MEMORY.md | tr -d ' ')
  if [ "$LINES" -le 200 ]; then
    check_pass "MEMORY.md is $LINES lines (limit: 200)"
  else
    check_fail "MEMORY.md is $LINES lines — exceeds 200 line limit. Extract sections to memory/topics/"
  fi
else
  check_warn "memory/MEMORY.md not found"
fi
echo ""

# 2. No versioned files outside archive directories
echo "[2] No versioned file suffixes (*-v[0-9]*.md, *-V[0-9]*.md) outside archive/"
VERSIONED=$(find . -name '*-v[0-9]*.md' -o -name '*-V[0-9]*.md' | grep -v '/archive' | grep -v 'node_modules' | grep -v '.git/' || true)
if [ -z "$VERSIONED" ]; then
  check_pass "No versioned files outside archive directories"
else
  check_fail "Versioned files found (should update in place or move to archive/):"
  echo "$VERSIONED" | while read -r f; do echo "    - $f"; done
fi
echo ""

# 3. No Untitled files in vault/
echo "[3] No 'Untitled' files in vault/"
UNTITLED=$(find vault/ -name 'Untitled*' 2>/dev/null || true)
if [ -z "$UNTITLED" ]; then
  check_pass "No Untitled files in vault/"
else
  check_fail "Untitled files found in vault/ — rename to descriptive names:"
  echo "$UNTITLED" | while read -r f; do echo "    - $f"; done
fi
echo ""

# 4. docs/architecture/INDEX.md exists
echo "[4] docs/architecture/INDEX.md exists"
if [ -f docs/architecture/INDEX.md ]; then
  check_pass "docs/architecture/INDEX.md exists"
else
  check_fail "docs/architecture/INDEX.md missing — create reading order index for architecture docs"
fi
echo ""

# 5. content/x-articles/INDEX.md exists
echo "[5] content/x-articles/INDEX.md exists"
if [ -f content/x-articles/INDEX.md ]; then
  check_pass "content/x-articles/INDEX.md exists"
else
  check_warn "content/x-articles/INDEX.md missing — create article index"
fi
echo ""

# 6. Stale VP outputs (older than 14 days, outside archive/)
echo "[6] VP outputs freshness (14-day max outside archive/)"
if [ -d .claude/vp-outputs ]; then
  STALE=$(find .claude/vp-outputs -maxdepth 1 -name '*.md' -mtime +14 2>/dev/null || true)
  if [ -z "$STALE" ]; then
    check_pass "No stale VP outputs (all <14 days or archived)"
  else
    STALE_COUNT=$(echo "$STALE" | wc -l | tr -d ' ')
    check_fail "$STALE_COUNT VP output(s) older than 14 days — archive to .claude/vp-outputs/archive-YYYYMMDD/:"
    echo "$STALE" | while read -r f; do echo "    - $f"; done
  fi
else
  check_warn ".claude/vp-outputs/ directory not found"
fi
echo ""

# Summary
echo "=== SUMMARY ==="
echo "  PASS: $PASS | FAIL: $FAIL | WARN: $WARN"
if [ "$FAIL" -gt 0 ]; then
  echo "  Status: NEEDS ATTENTION"
else
  echo "  Status: HEALTHY"
fi

# Always exit 0 (non-blocking for hooks)
exit 0
