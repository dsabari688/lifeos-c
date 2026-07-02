# Repo Hygiene — Fix Before Anything Else (~10 minutes)

**Status:** In progress  
**Blocks:** Nothing downstream, but do this first.

These issues show up in the file listing itself and erode reviewer trust disproportionate to how long they take to fix.

## Problems found

| Issue | Detail |
|-------|--------|
| **Backup JSON in git** | 20+ files in `server/backup/database-2026-07-01-*.json`, generated minutes apart — automated backup job writing into a tracked folder. If any data is real/user data, it may already be in git history. |
| **Stray temp file** | `server/lifeos_db.json.tmp` — leftover from an unsafe write path. |
| **Coverage report in git** | `server/coverage/` (~30 HTML files) — build artifact, not source. |
| **Incomplete `.gitignore`** | Excludes `lifeos_db.json` but not `server/backup/`, `*.tmp`, or `coverage/`. |

## Tasks

- [ ] Add to `.gitignore`: `server/backup/`, `*.tmp`, `coverage/`, `server/coverage/`
- [ ] Untrack committed artifacts: `git rm -r --cached server/backup server/coverage server/lifeos_db.json.tmp`
- [ ] If backups contain real user data, treat as a leak — scrub from git history (`git filter-repo` or BFG), not just removal going forward

## Acceptance criteria

- [ ] No backup JSON, `.tmp`, or coverage HTML in `git status` after commit
- [ ] Runtime backups still work locally but are ignored by git
- [ ] History scrub completed if real user data was ever committed

[← Back to roadmap](../roadmap.md)
