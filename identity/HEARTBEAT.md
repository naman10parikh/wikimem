# Codex — Heartbeat

What Codex checks on its own, how often, and what it does when something is wrong. The product schedule lives in
`src/core/scheduler.ts` (`AUTOMATION_DEFAULTS`); the repository schedule lives in `.github/workflows/`.

## Schedule

| Check | Frequency | Where it runs | Action on anomaly |
| --- | --- | --- | --- |
| Pipeline watcher: new files in `raw/` | Every minute (`* * * * *`) | inside `wikimem serve`, per vault | Log the failed file to `.wikimem/automation-log.jsonl`; skip it and keep watching |
| Connector sync (Slack, GitHub, RSS and the rest) | Every 6 hours (`0 */6 * * *`) | inside `wikimem serve`, per vault | Keep the last good copy; mark the connector stale in the Connectors view |
| Observer: score every page, find orphans and gaps | Daily at 03:00 (`0 3 * * *`) | inside `wikimem serve`, per vault | Report only; improvements stay under the budget cap (default $2.00) |
| Repository evals and self-review | Weekly, Monday 09:00 UTC, or on demand | `.github/workflows/improve.yml` | Write a proposals report; a person decides what to merge |
| Tests and evals on every push and pull request | Each change | `.github/workflows/ci.yml` | Block the merge until they pass |

## Health indicators

- **Healthy:** the observer ran in the last 24 hours, CI is green, the last weekly report has no failed eval.
- **Warning:** the observer missed one night, or a connector has not synced for 12 hours.
- **Critical:** an eval fails on `main`, or the observer has not run for 48 hours. Stop proposing changes until it is fixed.

## Recovery

1. Read the last entry in `.wikimem/automation-log.jsonl` (a vault) or the failed workflow run (the repository).
2. Check `memory/LEARNINGS.md` for a known fix.
3. If it is fixable, fix it, add a test or an eval that would have caught it, and rerun.
4. If not, open an issue with the log line and leave the vault as it was.
