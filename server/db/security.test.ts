import { describe, it, expect } from "vitest";
import { validatePasswordStrength, validateCsrfToken, deepSanitize } from "../security/index.js";
import { taskSchema } from "../validators/task.schema.js";
import { expenseSchema } from "../validators/expense.schema.js";
import { sanitizeRequest } from "../middleware/sanitize.js";

describe("Security Hardening & Input Validator Tests", () => {
  describe("Password Policy Strength Verification", () => {
    it("should accept compliant passwords containing required characters", () => {
      expect(validatePasswordStrength("SecureP@ss123")).toBe(true);
      expect(validatePasswordStrength("N0tW3ak$")).toBe(true);
    });

    it("should reject weak passwords lacking required characters", () => {
      expect(validatePasswordStrength("weak")).toBe(false);
      expect(validatePasswordStrength("lowercaseonly1!")).toBe(false);
      expect(validatePasswordStrength("UPPERCASEONLY1!")).toBe(false);
      expect(validatePasswordStrength("NoSpecialChar123")).toBe(false);
    });
  });

  describe("Request Schema Validation Constraints", () => {
    it("should reject tasks containing empty titles or invalid recur types", () => {
      const taskRes = taskSchema.safeParse({
        title: "",
        category: "high",
        date: "2026-07-01",
        recurType: "invalid-type"
      });
      expect(taskRes.success).toBe(false);
    });

    it("should reject negative financial expense payloads", () => {
      const expenseRes = expenseSchema.safeParse({
        amount: -50.00,
        category: "food",
        date: "2026-07-01"
      });
      expect(expenseRes.success).toBe(false);
    });
  });

  describe("Request Parameter Sanitization & SQL/NoSQL Injections Protection", () => {
    it("should escape script nodes and strip HTML tag elements", () => {
      const req = {
        body: { title: "<script>alert('hack')</script> Clean Title" },
        query: { search: "<img src='x' onerror='alert()' />" },
        params: { id: "123" }
      } as any;
      const res = {} as any;
      const next = () => {};

      sanitizeRequest(req, res, next);

      expect(req.body.title).not.toContain("<script>");
      expect(req.query.search).not.toContain("<img");
      expect(req.body.title).toBe("alert(&#x27;hack&#x27;) Clean Title");
    });

    it("should defend against NoSQL query operator injections by stripping keys starting with $", () => {
      const payload = {
        username: { $ne: "admin" },
        password: { $gt: "" }
      };
      const result = deepSanitize(payload);
      expect(result.username.ne).toBe("admin");
      expect(result.password.gt).toBe("");
      expect(result.username.$ne).toBeUndefined();
      expect(result.password.$gt).toBeUndefined();
    });
  });

  describe("CSRF Token Security Validation", () => {
    it("should permit safe HTTP methods without verification", () => {
      const req = { method: "GET" } as any;
      expect(validateCsrfToken(req)).toBe(true);
    });

    it("should reject state-modifying requests if CSRF tokens mismatch or are missing", () => {
      const req = {
        method: "POST",
        headers: {
          "cookie": "XSRF-TOKEN=token123",
          "x-xsrf-token": "different-token"
        }
      } as any;
      expect(validateCsrfToken(req)).toBe(false);
    });

    it("should validate state-modifying requests if CSRF tokens match perfectly", () => {
      const req = {
        method: "POST",
        headers: {
          "cookie": "XSRF-TOKEN=token123",
          "x-xsrf-token": "token123"
        }
      } as any;
      expect(validateCsrfToken(req)).toBe(true);
    });
  });
});
