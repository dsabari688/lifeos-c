# Phase 4 — Security Hardening

**Status:** Blocked on Phase 0  
**Score impact:** Medium — required before production-ready

## Tasks

- [ ] Separate JWT secrets for **access** vs. **refresh** tokens
- [ ] Enforce minimum entropy / length on `JWT_SECRET` in env schema (not just `min(1)`)
- [ ] Deep-audit and fix middleware from Phase 0:
  - CSRF (`server/security/csrf.ts`)
  - Sanitizer (`server/middleware/sanitize.ts`, `server/security/sanitizer.ts`)
  - Permissions (`server/middleware/permissions.ts`, `server/security/permissions.ts`)
- [ ] Confirm rate limiting is **per-user**, not just per-IP
- [ ] Verify auth rate limiters on register, verify-otp, login routes

## Key files

| File | Issue |
|------|-------|
| `server/security/jwt.ts` | Single secret for all token types |
| `server/security/env.ts` | `JWT_SECRET: z.string().min(1)` — too weak |
| `server/security/secrets.ts` | Secret loading / validation |
| `server/middleware/rateLimiter.ts` | Per-IP vs per-user keying |
| `server/routes/auth.routes.ts` | Auth endpoints + rate limits |

## Acceptance criteria

- [ ] Access and refresh tokens use different signing secrets
- [ ] Server refuses weak/missing JWT secrets in production
- [ ] CSRF, sanitization, permissions documented per route class
- [ ] Rate limits keyed by authenticated user ID where user is known

[← Phase 3](./03-correctness-bugs.md) · [Back to roadmap](../roadmap.md) · [Next: Phase 5 →](./05-testing.md)
