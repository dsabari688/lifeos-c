# Security Policy — LifeOS & Piggy AI v4.0

This document outlines the security architecture, threat model mitigations, token lifecycles, and configuration policies implemented in the LifeOS system.

---

## 1. Authentication & Session Lifecycles

### Token Lifecycles (Dual-Token Setup)
* **Access Tokens**: Short-lived (expires in **15 minutes**) JWT tokens containing standard identity claims. Enforced signature validation utilizes the `HS256` hashing algorithm.
* **Refresh Tokens**: Long-lived (expires in **7 days**) tokens designed to request fresh access tokens.

### Password Policy
Passwords must comply with strict complexity rules prior to salting:
* Minimum **8 characters** in length.
* At least **1 uppercase** letter.
* At least **1 lowercase** letter.
* At least **1 numerical digit**.
* At least **1 special character** (`@$!%*?&`).
Passwords are hashed using `bcrypt` with **12 salt rounds**.

---

## 2. API Abuse & Rate Limiting

Rate limiting is enforced at the IP level to defend endpoints:
* **Authentication**: 5 request attempts / 15 minutes window for login, OTP, and registration.
* **AI/Jarvis cognitive nodes**: 20 requests / 1 minute burst threshold.
* **General APIs**: 100 requests / 15 minutes window for basic CRUD operations.

---

## 3. Browser & Network Hardening

### Secure HTTP Headers
Production-ready HTTP headers are mounted using `helmet`:
* **CSP (Content Security Policy)**: Limits script execution to local paths and blocks inline vulnerabilities.
* **HSTS (HTTP Strict Transport Security)**: Forces encrypted TLS tunnels (`maxAge` = 1 year, includes subdomains).
* **Clickjacking Protection**: Restricts frame layouts (`frameAncestors: "'none'"`).
* **Permissions Policy**: Block access to geolocation, camera, and microphone (`camera=(), microphone=(), geolocation=()`).

### Secure CORS Whitelist
Cross-Origin Resource Sharing is configured with a strict whitelist check from environment variables (`CORS_WHITELIST`). Wildcard `*` entries are blocked, and `Access-Control-Allow-Credentials: true` is enforced for secure authentication contexts.

### CSRF Protection
A Double-Submit CSRF verification is active on all state-modifying requests (`POST`, `PUT`, `DELETE`), matching the `X-XSRF-TOKEN` request header with the `XSRF-TOKEN` cookie value.

---

## 4. Input Validation & Sanitization

* **Zod Schemas**: Every body input is parsed against strict validators prior to execution.
* **XSS Sanitizer**: Recursively escapes HTML script tags and strips `javascript:` URIs from request bodies, parameters, and query objects.
* **NoSQL/SQL Injection Defense**: Automatically strips keys beginning with the `$` prefix to prevent query operator hijack.

---

## 5. Upload Restrictions

File uploads (implemented for avatars and receipts) enforce strict criteria:
* **Format Whitelist**: Only `jpg`, `jpeg`, `png`, and `pdf` (plus standard video formats for TrackNet) are permitted.
* **Size Cap**: Capped at **10MB** maximum.
* **Script Blocking**: Rejects `.exe`, `.js`, `.py`, `.sh`, `.bat`, `.zip`, and `.php` files.
* **MIME verification**: Compares header content to actual file binary signatures.
* **Filename Sanitization**: Uploaded files are renamed using cryptographically secure `UUID` tags to avoid directory traversal exploits.

---

## 6. Telemetry & Failures Audit

* **Centralized Error Handling**: Suppresses call stacks and file paths in production, returning a generic `Internal Server Error` to clients while logging full details internally.
* **Audit Logger**: Logs sensitive status responses (401, 403, 429, 500) and critical events (logins, uploads, backups) with IP and user metadata.
* **30-Second Request Timeouts**: Restricts request lifetime to 30 seconds to prevent resource starvation.

---

## 7. Configuration Security

Startup environment variables are verified via a Zod schema at runtime (`server/security/env.ts`), aborting process execution if keys are missing or weak development secrets are detected in production.
