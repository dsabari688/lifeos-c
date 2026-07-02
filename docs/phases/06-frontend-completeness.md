# Phase 6 — Frontend Completeness Pass

**Status:** Blocked on Phase 0  
**Score impact:** Medium for UX trust

## Tasks

- [ ] Confirm every view uses real backend data — zero mock / simulated state:
  - Missions (`MissionsView.tsx`)
  - Habits
  - TaskModal (`TaskModal.tsx`)
  - Login (`LoginView.tsx`)
  - WeeklyReview, DailyReview
  - TrackNet (`TrackNetView.tsx`)
  - Expenses
- [ ] Sweep all components for dead handlers (like `AnalyticsView` chevrons)
- [ ] Accessibility pass — currently untouched:
  - Form labels and `aria-*` on controls
  - Keyboard navigation (modals, drawers, tour)
  - Color contrast on text and buttons

## Key files

| Area | Files |
|------|-------|
| Views | `client/src/components/*.tsx` |
| State | `client/src/store/useStore.ts` |
| Wiring | `client/src/App.tsx` |

## Acceptance criteria

- [ ] No mock/demo data in production view paths
- [ ] Every button/link works or is removed
- [ ] axe or Lighthouse a11y scan passes on main views

[← Phase 5](./05-testing.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 7 →](./07-observability.md)
