import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from './permissions.js';
import { validatePasswordStrength, hashPassword, verifyPassword } from './password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from './jwt.js';
import { recordAuditEvent } from './audit.js';
import { generateCsrfToken, validateCsrfToken } from './csrf.js';
import { deepSanitize } from './sanitizer.js';

// Mock logger for audit tests
vi.mock('../logger.js', () => ({
  winstonLogger: {
    info: vi.fn(),
    warn: vi.fn()
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe("Permissions", () => {
  it("Admin has all permissions", () => {
    expect(hasPermission("Admin", "view_metrics")).toBe(true);
    expect(hasPermission("Admin", "run_backup")).toBe(true);
    expect(hasPermission("Admin", "manage_users")).toBe(true);
    expect(hasPermission("Admin", "access_ai")).toBe(true);
    expect(hasPermission("Admin", "write_data")).toBe(true);
    expect(hasPermission("Admin", "read_data")).toBe(true);
  });

  it("User has limited permissions", () => {
    expect(hasPermission("User", "access_ai")).toBe(true);
    expect(hasPermission("User", "write_data")).toBe(true);
    expect(hasPermission("User", "read_data")).toBe(true);
    expect(hasPermission("User", "view_metrics")).toBe(false);
    expect(hasPermission("User", "run_backup")).toBe(false);
  });

  it("Guest has read-only access", () => {
    expect(hasPermission("Guest", "read_data")).toBe(true);
    expect(hasPermission("Guest", "write_data")).toBe(false);
    expect(hasPermission("Guest", "access_ai")).toBe(false);
  });

  it("returns false for non-existent permission", () => {
    expect(hasPermission("Admin", "non_existent_perm")).toBe(false);
  });

  it("returns false for non-existent role", () => {
    expect(hasPermission("NonExistentRole" as any, "read_data")).toBe(false);
  });

  it("ROLE_PERMISSIONS has correct structure", () => {
    expect(ROLE_PERMISSIONS.Admin.length).toBe(6);
    expect(ROLE_PERMISSIONS.User.length).toBe(3);
    expect(ROLE_PERMISSIONS.Guest.length).toBe(1);
  });
});

describe("Password Validation", () => {
  it("accepts valid strong password", () => {
    expect(validatePasswordStrength("MyP@ssw0rd")).toBe(true);
  });

  it("rejects password too short", () => {
    expect(validatePasswordStrength("Ab1@")).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(validatePasswordStrength("myp@ssw0rd")).toBe(false);
  });

  it("rejects password without lowercase", () => {
    expect(validatePasswordStrength("MYP@SSW0RD")).toBe(false);
  });

  it("rejects password without digit", () => {
    expect(validatePasswordStrength("MyP@ssword")).toBe(false);
  });

  it("rejects password without special character", () => {
    expect(validatePasswordStrength("MyPassw0rd")).toBe(false);
  });
});

describe("Password Hashing", () => {
  it("hashes a valid password successfully", async () => {
    const hash = await hashPassword("ValidP@ss1");
    expect(hash).toBeDefined();
    expect(hash).not.toBe("ValidP@ss1");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("throws error for weak password", async () => {
    await expect(hashPassword("weak")).rejects.toThrow("Password policy violation");
  });

  it("verifies correct password against hash", async () => {
    const hash = await hashPassword("TestP@ss1");
    const isValid = await verifyPassword("TestP@ss1", hash);
    expect(isValid).toBe(true);
  });

  it("rejects wrong password against hash", async () => {
    const hash = await hashPassword("TestP@ss1");
    const isValid = await verifyPassword("WrongP@ss1", hash);
    expect(isValid).toBe(false);
  });
});

describe("JWT Token Management", () => {
  const payload = { id: "user-1", email: "test@test.com", name: "Test User" };

  it("generates and verifies access token", () => {
    const token = generateAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.id).toBe("user-1");
    expect(decoded.email).toBe("test@test.com");
    expect(decoded.name).toBe("Test User");
  });

  it("generates refresh token", () => {
    const token = generateRefreshToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyToken(token);
    expect(decoded.id).toBe("user-1");
  });

  it("throws error for invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });

  it("throws error for tampered token", () => {
    const token = generateAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyToken(tampered)).toThrow();
  });
});

describe("Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs successful audit events with info level", async () => {
    const { winstonLogger } = await import('../logger.js');

    recordAuditEvent({
      userId: "user-1",
      ip: "127.0.0.1",
      action: "LOGIN",
      status: "success"
    });

    expect(winstonLogger.info).toHaveBeenCalledTimes(1);
    expect(winstonLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("[Audit Success]"),
      expect.objectContaining({ event: "AUDIT_LOG", action: "LOGIN" })
    );
  });

  it("logs failed audit events with warn level", async () => {
    const { winstonLogger } = await import('../logger.js');

    recordAuditEvent({
      ip: "192.168.1.1",
      action: "LOGIN_ATTEMPT",
      status: "failure",
      details: { reason: "Invalid password" }
    });

    expect(winstonLogger.warn).toHaveBeenCalledTimes(1);
    expect(winstonLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("[Audit Failure]"),
      expect.objectContaining({ event: "AUDIT_LOG", status: "failure" })
    );
  });

  it("logs success for guest user", async () => {
    const { winstonLogger } = await import('../logger.js');
    recordAuditEvent({
      ip: "127.0.0.1",
      action: "GUEST_ACTION",
      status: "success"
    });
    expect(winstonLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("User: guest"),
      expect.any(Object)
    );
  });

  it("logs failure with user ID and no details", async () => {
    const { winstonLogger } = await import('../logger.js');
    recordAuditEvent({
      userId: "user-999",
      ip: "127.0.0.1",
      action: "MUTATE",
      status: "failure"
    });
    expect(winstonLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("User: user-999 | Details: {}"),
      expect.any(Object)
    );
  });
});

describe("CSRF Protection", () => {
  it("generates a 64-character hex CSRF token", () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("always validates GET, HEAD, OPTIONS, TRACE as true", () => {
    const methods = ["GET", "HEAD", "OPTIONS", "TRACE"];
    for (const method of methods) {
      const req = {
        method,
        headers: {}
      } as any;
      expect(validateCsrfToken(req)).toBe(true);
    }
  });

  it("returns false for unsafe methods if tokens are missing", () => {
    const reqNoHeaders = {
      method: "POST",
      headers: {}
    } as any;
    expect(validateCsrfToken(reqNoHeaders)).toBe(false);

    const reqNoCookie = {
      method: "POST",
      headers: {
        "x-xsrf-token": "token123"
      }
    } as any;
    expect(validateCsrfToken(reqNoCookie)).toBe(false);

    const reqNoHeader = {
      method: "POST",
      headers: {
        cookie: "XSRF-TOKEN=token123"
      }
    } as any;
    expect(validateCsrfToken(reqNoHeader)).toBe(false);
  });

  it("returns true if CSRF header and cookie token match, false otherwise", () => {
    const reqMatch = {
      method: "POST",
      headers: {
        "x-xsrf-token": "match-token",
        cookie: "session=xyz; XSRF-TOKEN=match-token; other=abc"
      }
    } as any;
    expect(validateCsrfToken(reqMatch)).toBe(true);

    const reqMismatch = {
      method: "POST",
      headers: {
        "x-xsrf-token": "different-token",
        cookie: "XSRF-TOKEN=match-token"
      }
    } as any;
    expect(validateCsrfToken(reqMismatch)).toBe(false);

    const reqNoValue = {
      method: "POST",
      headers: {
        "x-xsrf-token": "some-token",
        cookie: "XSRF-TOKEN"
      }
    } as any;
    expect(validateCsrfToken(reqNoValue)).toBe(false);
  });
});

describe("Deep Sanitizer", () => {
  it("should sanitize dangerous HTML and scripts from strings", () => {
    const dirty = "<script>alert('xss')</script>Hello <img src=x onerror=alert(1)> javascript:alert(1) test / \" ' & < >";
    const clean = deepSanitize(dirty);
    expect(clean).toBe("alert(&#x27;xss&#x27;)Hello  alert(1) test &#x2F; &quot; &#x27; &amp; ");
  });

  it("should recursively sanitize arrays and objects", () => {
    const dirtyObj = {
      "$operator": "NoSQL",
      nested: {
        html: "<div>test</div>",
        list: ["<p>item</p>", 123, true]
      }
    };
    const cleanObj = deepSanitize(dirtyObj);
    expect(cleanObj).toEqual({
      "operator": "NoSQL",
      nested: {
        html: "test",
        list: ["item", 123, true]
      }
    });
  });

  it("should return non-string/non-object primitives as is", () => {
    expect(deepSanitize(123)).toBe(123);
    expect(deepSanitize(true)).toBe(true);
    expect(deepSanitize(null)).toBe(null);
  });
});

