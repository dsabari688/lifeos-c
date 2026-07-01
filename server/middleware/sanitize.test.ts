import { describe, it, expect, vi } from "vitest";
import { sanitizeRequest } from "./sanitize.js";

describe("sanitizeRequest middleware", () => {
  it("should sanitize req.body, req.query, and req.params if they exist", () => {
    const req: any = {
      body: { name: "<script>alert(1)</script>" },
      query: { q: "javascript:alert(1)" },
      params: { id: "id/1" }
    };
    const res: any = {};
    const next = vi.fn();

    sanitizeRequest(req, res, next);

    expect(req.body.name).toBe("alert(1)");
    expect(req.query.q).toBe("alert(1)");
    expect(req.params.id).toBe("id&#x2F;1");
    expect(next).toHaveBeenCalled();
  });

  it("should work fine if req.body, req.query, or req.params are missing", () => {
    const req: any = {};
    const res: any = {};
    const next = vi.fn();

    sanitizeRequest(req, res, next);

    expect(req.body).toBeUndefined();
    expect(req.query).toBeUndefined();
    expect(req.params).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
