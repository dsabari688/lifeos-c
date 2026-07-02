# Phase 8 — Documentation

**Status:** Blocked on Phase 2  
**Score impact:** Low for runtime; high for reviewer trust

## Tasks

- [ ] Update [architecture.md](../architecture.md) for post-cleanup reality:
  - Tool-execution system that survived Phase 2
  - Prompt build flow (two calls, not three)
  - Backup retention from Phase 1
  - Rate-limit strategy (per-user vs per-IP)
- [ ] Document **write-consistency guarantees honestly**:
  - What `WriteQueue` serializes vs what it does not (same-user RMW races)
  - What callers can assume after `await saveDatabaseState`
  - Recovery after crash mid-write (temp-file + rename)
- [ ] Update [roadmap.md](../roadmap.md) progress tracker as phases complete

## Acceptance criteria

- [ ] New contributor can trace task save UI → route → service → DB → disk from docs alone
- [ ] Architecture diagram matches Phase 2 deletions
- [ ] No doc claims "thread-safe" without specifying scope

[← Phase 7](./07-observability.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 9 →](./09-real-world-validation.md)
