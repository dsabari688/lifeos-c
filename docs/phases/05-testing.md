# Phase 5 — Testing, for Real

**Status:** Blocked on Phases 1–2  
**Score impact:** High — prevents regression of bugs found twice already

The dead-code bug existed *because* unit tests passed on isolated functions nothing was calling.

## Tasks

- [ ] Tests for **Phase 1 write-path fixes** (await saves, HTTP error on failure, concurrent updates)
- [ ] Tests for **Phase 2 retry-loop fix** (no 3× identical deterministic retries)
- [ ] Tests for **surviving tool system** from Phase 2
- [ ] **Integration tests against actual HTTP routes**:
  - `data.routes.ts` — CRUD + save paths
  - `ai.routes.ts` — chat / planner / agent
  - Auth routes — login, register, token refresh
- [ ] Raise coverage thresholds in `server/vitest.config.ts` **only after** real coverage backs the number — don't fake the metric

## Key files

| File | Purpose |
|------|---------|
| `server/vitest.config.ts` | Coverage thresholds |
| `server/db/db.test.ts` | Extend for write failures |
| `server/piggy/cognitive.test.ts` | Update after Phase 2 |
| New: `server/routes/*.integration.test.ts` | HTTP-level tests |

## Acceptance criteria

- [ ] Integration test fails if route calls `saveDatabaseState` without await
- [ ] Tool execution tested through surviving Phase 2 path only
- [ ] Coverage reflects executed route handlers
- [ ] CI runs integration tests on every PR

[← Phase 4](./04-security-hardening.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 6 →](./06-frontend-completeness.md)
