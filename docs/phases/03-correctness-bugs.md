# Phase 3 — Small Correctness Bugs

**Status:** Blocked on Phase 0  
**Score impact:** Low alone — do after Phases 1–2

## Tasks

- [ ] Wire real `userName` into `NotificationDrawer` instead of hardcoded `"Alex"` fallback
- [ ] Fix dead chevron buttons in `AnalyticsView` (month selector has no `onClick`)
- [ ] Fix mojibake emoji anywhere in the UI
- [ ] Pull Smart Planner defaults from real user settings:
  - `workHours`, `sleepHours`, `exercisePreference`
- [ ] Fix any equivalent small bugs found during Phase 0 in the unreviewed ~60%

## Key files

| File | Issue |
|------|-------|
| `client/src/components/NotificationDrawer.tsx` | `userName = "Alex"` default |
| `client/src/App.tsx` | `NotificationDrawer` missing `userName` prop |
| `client/src/components/AnalyticsView.tsx` | Chevron buttons without handlers |
| `client/src/store/useStore.ts` | Hardcoded Smart Planner defaults |
| `server/routes/ai.routes.ts` | Smart planner route hardcoded fallbacks |

## Acceptance criteria

- [ ] Notification drawer greets logged-in user by name
- [ ] Analytics month chevrons change displayed month
- [ ] No mojibake in user-visible strings
- [ ] Smart Planner uses profile/settings when body fields omitted

[← Phase 2](./02-architectural-duplication.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 4 →](./04-security-hardening.md)
