# LifeOS Quality Roadmap — Path to a Defensible 9.5+

Ordered plan from current state to a **defensible 9.5+** (earned under real conditions, not claimed on paper). **Do not skip phases** — fixing symptoms before audit finishes risks missing the same root cause elsewhere.

**Audit coverage:** ~40% deeply reviewed · ~60% unreviewed

**Known patterns (found twice — expect at least one more):**
- Dead tool registry / duplicate execution paths
- Triple `buildPiggyPrompt()` call

Update the [progress tracker](#progress-tracker) as you complete work.

---

## All phases (detailed checklists)

| Phase | Summary | Detail |
|-------|---------|--------|
| **Repo hygiene** | Untrack backups, coverage, `.tmp`; fix `.gitignore` | [phases/00-repo-hygiene.md](./phases/00-repo-hygiene.md) |
| **0 — Audit** | Finish reviewing ~60% unreviewed code | [phases/00-audit.md](./phases/00-audit.md) |
| **1 — Data integrity** | Await saves, propagate errors, fix RMW race, backup rotation | [phases/01-data-integrity.md](./phases/01-data-integrity.md) |
| **2 — Duplication** | One tool path, two prompt calls, smart retries, one rate limiter | [phases/02-architectural-duplication.md](./phases/02-architectural-duplication.md) |
| **3 — Correctness** | NotificationDrawer, AnalyticsView, emoji, Smart Planner | [phases/03-correctness-bugs.md](./phases/03-correctness-bugs.md) |
| **4 — Security** | JWT secrets, env entropy, CSRF/sanitizer/permissions, per-user limits | [phases/04-security-hardening.md](./phases/04-security-hardening.md) |
| **5 — Testing** | Phase 1/2 tests + HTTP integration tests | [phases/05-testing.md](./phases/05-testing.md) |
| **6 — Frontend** | Real data wiring, dead handlers, accessibility | [phases/06-frontend-completeness.md](./phases/06-frontend-completeness.md) |
| **7 — Observability** | Loud write/retry/rate-limit failures in logs | [phases/07-observability.md](./phases/07-observability.md) |
| **8 — Documentation** | Honest `architecture.md` + write-consistency docs | [phases/08-documentation.md](./phases/08-documentation.md) |
| **9 — Validation** | Concurrent writes, crash recovery, soak test | [phases/09-real-world-validation.md](./phases/09-real-world-validation.md) |

Full index: [phases/README.md](./phases/README.md)

---

## Phase 0 — Finish the Audit (cannot skip)

**Do not start Phase 1 until complete.** See [phases/00-audit.md](./phases/00-audit.md).

| Area | Module / path |
|------|----------------|
| Cognition | `server/piggy/cognition/agentCognition.ts` |
| Intelligence | `server/piggy/core/piggyIntelligence.ts` |
| Agent modules | personality, planning, prediction, safety, memory under `server/piggy/` |
| Frontend views | Missions, Habits, TaskModal, Login, WeeklyReview, DailyReview, TrackNet, Expenses |
| Validators | `server/validators/` |
| Middleware | CSRF, sanitizer, permissions |
| TrackNet | `tracknet_engine/app.py` |

---

## Phase 1 — Data Integrity (highest severity)

See [phases/01-data-integrity.md](./phases/01-data-integrity.md).

- [ ] `saveUserData` / `saveDatabaseState` async and **awaited everywhere**
- [ ] Write failures propagate to HTTP response
- [ ] Fix read-modify-write race in `updateUserDataInternal`
- [ ] Backup retention / rotation for `server/backup/*.json`

---

## Phase 2 — Kill Architectural Duplication

See [phases/02-architectural-duplication.md](./phases/02-architectural-duplication.md).

- [ ] Pick one tool path (`executeToolMutation` vs `toolRegistry`/`executeToolWithGuard`); delete the other
- [ ] Collapse triple `buildPiggyPrompt()` to two meaningful calls
- [ ] Fix retry loop (no 3× identical deterministic failures)
- [ ] Delete dead duplicate `rateLimit.ts` (keep wired `rateLimiter.ts`)

---

## Phase 3 — Small Correctness Bugs

See [phases/03-correctness-bugs.md](./phases/03-correctness-bugs.md).

- [ ] Wire `userName` into `NotificationDrawer`
- [ ] Fix dead chevrons in `AnalyticsView`
- [ ] Fix mojibake emoji
- [ ] Smart Planner defaults from real user settings
- [ ] Phase 0 findings at this severity

---

## Phase 4 — Security Hardening

See [phases/04-security-hardening.md](./phases/04-security-hardening.md).

- [ ] Separate JWT secrets (access vs refresh)
- [ ] Minimum entropy on `JWT_SECRET` in env schema
- [ ] Deep-audit CSRF, sanitizer, permissions middleware
- [ ] Rate limiting per-user, not just per-IP

---

## Phase 5 — Testing, for Real

See [phases/05-testing.md](./phases/05-testing.md).

- [ ] Tests for Phase 1 write-path fixes
- [ ] Tests for Phase 2 retry-loop and tool-system fixes
- [ ] Integration tests against actual HTTP routes
- [ ] Raise coverage thresholds only after real coverage exists

---

## Phase 6 — Frontend Completeness

See [phases/06-frontend-completeness.md](./phases/06-frontend-completeness.md).

- [ ] Every view on real backend data (no mock state)
- [ ] Dead handler sweep across components
- [ ] Accessibility pass (labels, keyboard, contrast)

---

## Phase 7 — Observability

See [phases/07-observability.md](./phases/07-observability.md).

- [ ] `logger.ts` / `monitoring` / `metrics.ts` capture Phase 1 failures loudly
- [ ] Log signals for write failures, retry exhaustion, rate-limit trips

---

## Phase 8 — Documentation

See [phases/08-documentation.md](./phases/08-documentation.md).

- [ ] Update [architecture.md](./architecture.md) post–Phase 2 cleanup
- [ ] Document write-consistency guarantees honestly

---

## Phase 9 — Real-World Validation (earns 9.5+)

See [phases/09-real-world-validation.md](./phases/09-real-world-validation.md).

- [ ] Concurrent writes — no lost updates
- [ ] Kill mid-write — temp-file + rename recovery
- [ ] Soak test — days to weeks, clean logs
- [ ] **Gate:** zero data-loss, zero silent failures → score earned

---

## Why 9.5+, Not "10 on Paper"

The gap is in **Phases 0, 1, 2, and 9** — audit coverage, data integrity, killing duplicate systems, proving under real conditions. Polish (Phases 3, 6, docs) won't move the needle if writes are racy or silent.

---

## Progress tracker

| Phase | Status | Notes |
|-------|--------|-------|
| Repo hygiene | Not started | See [00-repo-hygiene.md](./phases/00-repo-hygiene.md) |
| 0 — Audit | In progress (~40%) | ~60% unreviewed |
| 1 — Data integrity | Blocked on Phase 0 | Highest severity |
| 2 — Duplication | Blocked on Phase 0 | |
| 3 — Correctness | Blocked on Phase 0 | |
| 4 — Security | Blocked on Phase 0 | |
| 5 — Testing | Blocked on Phases 1–2 | |
| 6 — Frontend | Blocked on Phase 0 | |
| 7 — Observability | Blocked on Phase 1 | |
| 8 — Documentation | Blocked on Phase 2 | |
| 9 — Real-world validation | Blocked on Phases 1–8 | Earns 9.5+ |

---

## Related docs

- [Phase index](./phases/README.md)
- [System Architecture](./architecture.md)
- [README](../README.md)
