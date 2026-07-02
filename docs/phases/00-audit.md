# Phase 0 — Finish the Audit (cannot skip)

**Status:** In progress (~40% reviewed, ~60% unreviewed)  
**Prerequisite:** [Repo hygiene](./00-repo-hygiene.md) recommended first  
**Blocks:** Phases 1–6, 4

You can't fix what hasn't been found. **Do not start Phase 1 until this phase is complete.**

Before fixing anything, finish reviewing the unreviewed ~60%. Write down findings with **file:line** as you go. You've already found the same bug pattern twice (dead tool registry, triple `buildPiggyPrompt()` call) — expect at least one more duplicate-system or dead-wiring surprise in unreviewed modules.

## Remaining deep-review targets

| Area | Module / path |
|------|----------------|
| Cognition engine internals | `server/piggy/cognition/agentCognition.ts` — decision / reasoning / recommendation logic |
| Piggy intelligence | `server/piggy/core/piggyIntelligence.ts` |
| Agent subsystems | Personality, planning, prediction, safety, memory modules under `server/piggy/` |
| Frontend views | Missions, Habits, TaskModal, Login, WeeklyReview, DailyReview, TrackNet, Expenses |
| Validation layer | Validators / schema layer (`server/validators/`) |
| Middleware (not yet touched) | CSRF, sanitizer, permissions |
| Visual cortex | `tracknet_engine/app.py` |

## Known patterns (found twice — hunt for a third)

- Dead tool registry / duplicate execution paths
- Triple `buildPiggyPrompt()` call

## Tasks

- [ ] Audit every row in the table above; record findings with severity and file:line
- [ ] Search unreviewed modules for duplicate-system or dead-wiring patterns
- [ ] Feed all findings into Phase 1–3 task lists — no orphan bugs

## Exit criteria

- [ ] Every item in the table has a written audit note
- [ ] At least one duplicate-system surprise documented (or explicitly ruled out per module)
- [ ] Phase 1–3 checklists updated with Phase 0 discoveries

[← Back to roadmap](../roadmap.md) · [Next: Phase 1 →](./01-data-integrity.md)
