import { describe, it, expect, vi } from "vitest";
import { requestIdMiddleware } from "./requestId.js";
import { loggerStorage } from "../logger.js";

describe("requestIdMiddleware", () => {
  it("should use existing x-request-id header if present", () => {
    const req: any = {
      headers: {
        "x-request-id": "preset-id-456"
      }
    };
    const res: any = {
      setHeader: vi.fn()
    };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe("preset-id-456");
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "preset-id-456");
    expect(next).toHaveBeenCalled();

    // Verify context store has request ID inside the run callback
    const store = loggerStorage.getStore();
    // Since Next is run inside loggerStorage.run, during the call we expect it to be active.
    // However, when next returns, the run completes or is executed synchronously.
    // Let's assert it runs next in context:
    let loggedStoreInsideNext: any = null;
    const trackingNext = vi.fn().mockImplementation(() => {
      loggedStoreInsideNext = loggerStorage.getStore();
    });
    requestIdMiddleware(req, res, trackingNext);
    expect(loggedStoreInsideNext).toEqual({ requestId: "preset-id-456" });
  });

  it("should generate a random UUID if x-request-id header is absent", () => {
    const req: any = {
      headers: {}
    };
    const res: any = {
      setHeader: vi.fn()
    };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", req.id);
    expect(next).toHaveBeenCalled();
  });
});
