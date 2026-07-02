# Phase 9 — Real-World Validation (earns 9.5+)

**Status:** Blocked on Phases 1–8  
**Score impact:** This is the gate — without it, the score is claimed, not earned

No amount of static review can certify concurrency safety or crash-recovery. **Cannot be skipped or faked.**

## Tasks

- [ ] **Concurrent writes:** Two rapid requests from same user; confirm no lost updates
- [ ] **Crash recovery:** Kill process mid-write; confirm temp-file + rename recovery on restart
- [ ] **Soak test:** Real daily use for days to weeks; watch logs for surprises
- [ ] **9.5+ gate:** Zero data-loss incidents + zero silent failures → mark earned in progress tracker

## How to run

| Test | Approach |
|------|----------|
| Concurrent writes | Two parallel `curl`/axios calls with same auth token |
| Crash recovery | `kill -9` during save, or pause in `repository.write` |
| Soak | Personal daily use + weekly log review |

## Acceptance criteria

- [ ] Test results documented with timestamps and log excerpts
- [ ] No lost-update repro after Phase 1 fix
- [ ] Clean restart after kill-during-write
- [ ] Soak period completed with sign-off date

[← Phase 8](./08-documentation.md) · [Back to roadmap](../roadmap.md)
