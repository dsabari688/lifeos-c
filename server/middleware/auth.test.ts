import { describe, it, expect, vi } from "vitest";
import { authenticateToken } from "./auth.js";
import { verifyToken } from "../security/jwt.js";

vi.mock("../security/jwt.js", () => ({
  verifyToken: vi.fn()
}));

vi.mock("../logger.js", () => ({
  logger: {
    warn: vi.fn()
  }
}));

describe("authenticateToken middleware", () => {
  it("should return 401 if Authorization header is missing", () => {
    const req: any = { headers: {} };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining("Access token required") });
    expect(next).not.toHaveBeenCalled();
  });

  it("should authenticate and call next if token is valid", () => {
    const req: any = { headers: { authorization: "Bearer valid-token" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();
    vi.mocked(verifyToken).mockReturnValue({ id: "user-123", email: "test@lifeos.com" });

    authenticateToken(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith("valid-token");
    expect(req.user).toEqual({ id: "user-123", email: "test@lifeos.com" });
    expect(next).toHaveBeenCalled();
  });

  it("should return 403 if token validation throws error", () => {
    const req: any = { headers: { authorization: "Bearer invalid-token" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining("Invalid or expired token") });
    expect(next).not.toHaveBeenCalled();
  });
});
