import { describe, it, expect, vi } from "vitest";
import { authorize } from "./authorize.js";
import { dbService } from "../db/index.js";

vi.mock("../db/index.js", () => ({
  dbService: {
    getDatabaseState: vi.fn()
  }
}));

describe("authorize middleware", () => {
  it("should return 401 if req.user or req.user.id is missing", () => {
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    authorize("Admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining("Access denied") });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user role is not allowed", () => {
    const req: any = { user: { id: "user-123" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: [
        { id: "user-123", role: "Guest" }
      ]
    } as any);

    authorize("Admin", "User")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("Access Forbidden")
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next if user role is allowed", () => {
    const req: any = { user: { id: "user-123" } };
    const res: any = {};
    const next = vi.fn();

    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: [
        { id: "user-123", role: "Admin" }
      ]
    } as any);

    authorize("Admin", "User")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should default to User role if user has no assigned role in database", () => {
    const req: any = { user: { id: "user-123" } };
    const res: any = {};
    const next = vi.fn();

    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: [
        { id: "user-123" }
      ]
    } as any);

    authorize("User")(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
