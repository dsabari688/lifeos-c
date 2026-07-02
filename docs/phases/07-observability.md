# Phase 7 — Observability

**Status:** Blocked on Phase 1  
**Score impact:** Medium — required to trust Phase 9 soak results

A swallowed write error should be **loud** in logs, not silent.

## Tasks

- [ ] Confirm `server/logger.ts` captures write failures with stack traces and request IDs
- [ ] Confirm `server/monitoring/metrics.ts` exposes counters for Phase 1 failure paths
- [ ] Add log signals (or alerting) for:
  - **Write failures** — save rejected, disk full, corrupt JSON
  - **Retry exhaustion** — agent step failed after max retries
  - **Rate-limit trips** — auth brute-force, AI abuse, API flood
- [ ] Verify request IDs on error logs from async write paths

## Key files

| File | Purpose |
|------|---------|
| `server/logger.ts` | Winston structured logging |
| `server/monitoring/metrics.ts` | Metrics |
| `server/middleware/requestId.ts` | Correlation IDs |
| `server/db/repository.ts` | Log on write failure / backup rotation |

## Acceptance criteria

- [ ] Forced write failure → `error`-level log with `requestId` and user context
- [ ] Retry exhaustion logs tool name, args, attempt count
- [ ] Rate-limit hit logs endpoint, key, and window
- [ ] No `console.log`-only paths on critical failures

[← Phase 6](./06-frontend-completeness.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 8 →](./08-documentation.md)
