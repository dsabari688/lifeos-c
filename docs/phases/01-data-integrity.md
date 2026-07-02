# Phase 1 — Data Integrity (highest severity)

**Status:** Blocked on Phase 0  
**Score impact:** High — polish alone won't get you to 9.5+ if writes are racy or silent

An un-awaited write is a silent data-loss bug.

## Tasks

- [ ] Make `saveUserData` / `saveDatabaseState` properly async and **`await`ed everywhere** they are called
- [ ] Propagate write failures back to the HTTP response instead of swallowing them
- [ ] Fix the read-modify-write race in `updateUserDataInternal` — two concurrent requests for the same user reading stale state can clobber each other's writes
- [ ] Add retention / rotation for `server/backup/*.json` so it doesn't grow unbounded
- [ ] Ensure runtime backups never land in a git-tracked folder ([repo hygiene](./00-repo-hygiene.md))

## Key files

| File | Issue |
|------|-------|
| `server/db/index.ts` | `updateUserDataInternal` — read-modify-write without per-user lock |
| `server/db/repository.ts` | `saveUserData`, `write` — async persistence, temp-file + rename |
| `server/routes/data.routes.ts` | Verify all routes `await saveDatabaseState` |
| `server/routes/ai.routes.ts` | Multiple `saveDatabaseState(db)` — verify await + error handling |
| `server/routes/media.routes.ts` | `saveDatabaseState` without await |
| `server/services/taskService.ts` | `saveDatabaseState` without await |
| `server/services/habitService.ts` | `saveDatabaseState` without await |
| `server/jobs/scheduler.ts` | Background save without await |
| `server/index.ts` | Background agent callback without await |

## Acceptance criteria

- [ ] Every `saveDatabaseState` / `saveUserData` call site is awaited or explicitly documented as fire-and-forget with error logging
- [ ] Simulated write failure returns non-2xx to the client
- [ ] Backup directory has max count or TTL; old files deleted automatically
- [ ] Concurrent same-user updates do not lose fields (proven in [Phase 9](./09-real-world-validation.md))

[← Phase 0](./00-audit.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 2 →](./02-architectural-duplication.md)
