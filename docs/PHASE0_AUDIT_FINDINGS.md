# Phase 0 Audit Findings

## Overview
Completed audit of piggy/* subsystems, frontend views, validators, middleware, and tracknet_engine.

## Critical Bug Patterns Found

### 1. Triple buildPiggyPrompt() Call
**File:** `server/routes/ai.routes.ts`  
**Lines:** 91, 96, 101

```typescript
const contextSummary = buildPiggyPrompt(message, userData, activeContext);  // Line 91
const updatedContextSummary = buildPiggyPrompt(message, userData, activeContext);  // Line 96
const systemPrompt = buildPiggyPrompt(message, userData, activeContext);  // Line 101
```

**Issue:** The same expensive prompt-building function is called three times in sequence with identical arguments. This is wasteful and the user specifically mentioned looking for this pattern.

**Phase:** Phase 2 - Collapse to single call

---

### 2. Duplicate Rate Limiter Files
**Files:** 
- `server/middleware/rateLimit.ts` (29 lines)
- `server/middleware/rateLimiter.ts` (29 lines)

**Issue:** Two nearly identical rate limiter files exist with conflicting configurations:

| Endpoint | rateLimit.ts | rateLimiter.ts |
|----------|--------------|----------------|
| Auth     | 10/15min     | 5/15min        |
| AI       | 30/min       | 20/min         |
| API      | 100/min      | 100/15min      |

**Phase:** Phase 2 - Delete one, consolidate

---

### 3. Tool Execution Path Duplication
**File:** `server/piggy/execution/agentExecution.ts`

**Issue:** Two separate tool execution paths exist:

1. **Path A:** `executeAgentGoal` (lines ~200-300) → calls `executeToolMutation` directly
2. **Path B:** `executeToolWithGuard` (lines ~600-700) → calls `routeToolCall` → calls `executeToolMutation`

Both paths accomplish the same thing but with different logic (timeouts, retries, guards). This is architectural duplication.

**Phase:** Phase 2 - Pick one path, delete the other

---

## Security Concerns

### 4. Rate Limiting is IP-Based, Not User-Based
**Files:** `server/middleware/rateLimit.ts`, `server/middleware/rateLimiter.ts`

**Issue:** Both files use `express-rate-limit` which defaults to IP-based limiting. This means:
- Users behind NAT/proxies share limits
- Attackers can bypass by rotating IPs
- Legitimate users on shared networks are unfairly throttled

**Phase:** Phase 4 - Implement per-user rate limiting

---

### 5. CSRF Protection May Not Be Enforced
**File:** `server/security/csrf.ts`

**Issue:** The `validateCsrfToken` function exists and implements double-submit cookie pattern correctly, but it was not observed being applied in the route middleware chains during this audit. Need to verify it's actually being used on state-changing endpoints.

**Phase:** Phase 4 - Deep-audit CSRF enforcement

---

### 6. TrackNet Engine Security Issues
**File:** `tracknet_engine/app.py`

**Issues:**
- Line 117: `app.run(port=5002, debug=True)` - Debug mode enabled in production
- No authentication middleware on `/api/track` endpoint
- Accepts any video file upload without validation
- Dynamic OpenCV installation via subprocess (line 20) - potential supply chain risk

**Phase:** Phase 4 - Security hardening

---

## Other Observations

### 7. Validators
**Files:** `server/validators/task.schema.ts`, `server/validators/expense.schema.ts`

**Status:** ✅ Good
- Simple Zod schemas with proper validation
- Date format validation (YYYY-MM-DD)
- Enum validation for categories/priorities
- No obvious issues

---

### 8. Sanitizer Middleware
**File:** `server/middleware/sanitize.ts`

**Status:** ✅ Good
- Uses `deepSanitize` from security module
- Sanitizes body, query, and params
- Properly mutates request objects

---

### 9. Permissions Middleware
**File:** `server/middleware/permissions.ts`

**Status:** ✅ Good
- Role-based authorization (User, Premium, Admin)
- Defaults to "User" if no role assigned
- Proper 401/403 responses

---

### 10. Frontend Views
**Files Reviewed:**
- `client/src/components/MissionsView.tsx`
- `client/src/components/HabitsView.tsx`
- `client/src/components/TaskModal.tsx`
- `client/src/components/LoginView.tsx`
- `client/src/components/ExpensesView.tsx`
- `client/src/components/TrackNetView.tsx`
- `client/src/components/DailyReviewModal.tsx`
- `client/src/components/WeeklyReviewModal.tsx`

**Status:** ✅ All views appear to use real backend data
- No mock/simulated state detected
- All fetch from real API endpoints
- Proper token usage for authenticated requests

---

### 11. Piggy Subsystems
**Files Reviewed:**
- `server/piggy/cognition/agentCognition.ts`
- `server/piggy/core/piggyIntelligence.ts`
- `server/piggy/core/piggyContext.ts`
- `server/piggy/execution/agentExecution.ts`
- `server/piggy/memory/agentMemory.ts`
- `server/piggy/personality/agentPersonality.ts`
- `server/piggy/planning/agentPlanning.ts`
- `server/piggy/prediction/agentPrediction.ts`
- `server/piggy/safety/agentSafety.ts`

**Status:** ✅ Well-structured modular architecture
- Clean separation of concerns
- Each module has clear responsibility
- No obvious bugs beyond the tool execution duplication noted above

---

## Summary

**Critical Issues (Phase 2):**
1. Triple buildPiggyPrompt() call - performance waste
2. Duplicate rate limiter files - confusion/maintenance burden
3. Tool execution path duplication - architectural debt

**Security Issues (Phase 4):**
1. IP-based rate limiting instead of user-based
2. CSRF enforcement needs verification
3. TrackNet engine running in debug mode without auth

**Good Findings:**
- Validators are solid
- Sanitizer middleware is properly implemented
- Permissions middleware is role-based
- Frontend views use real data
- Piggy subsystems are well-architected

**Next Phase:** Phase 1 - Data Integrity (highest severity)
