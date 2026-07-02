# Phase 2 — Kill the Architectural Duplication

**Status:** Blocked on Phase 0  
**Score impact:** High — duplicate systems hide dead code and mask bugs

## Tasks

- [ ] **Pick one** tool-execution path and delete the other:
  - **Path A:** Simple `executeToolMutation` switch in `agentExecution.ts`
  - **Path B:** `toolRegistry` → `routeToolCall` → `executeToolWithGuard`
- [ ] Collapse the triple `buildPiggyPrompt()` call to **two meaningful calls**
- [ ] Fix the retry loop so it does **not** repeat deterministic failures 3× with identical args:
  - Skip retry for "not found" / validation errors, **or**
  - Adjust args/plan on each retry
- [ ] Delete the dead duplicate rate-limit module:
  - `server/middleware/rateLimit.ts` (likely dead duplicate)
  - `server/middleware/rateLimiter.ts` (imported by `app.ts`, `ai.routes.ts`, `auth.routes.ts`)

## Key files

| File | Issue |
|------|-------|
| `server/piggy/execution/agentExecution.ts` | Dual execution paths; retry loop ~L64–98 |
| `server/routes/ai.routes.ts` | Triple `buildPiggyPrompt()` ~L91, L96, L101 |
| `server/piggy/personality/agentPersonality.ts` | `buildPiggyPrompt` definition |
| `server/middleware/rateLimit.ts` | Duplicate of `rateLimiter.ts` |
| `server/middleware/rateLimiter.ts` | Active imports — verify before deleting the other |

## Acceptance criteria

- [ ] Single code path executes all agent tool mutations in production
- [ ] `buildPiggyPrompt` called at most twice per chat request, each with distinct purpose
- [ ] Deterministic failure (e.g. unknown tool ID) fails once, not three times with identical args
- [ ] Only one rate-limit middleware file remains
- [ ] Dead code and orphaned tests removed

[← Phase 1](./01-data-integrity.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 3 →](./03-correctness-bugs.md)
