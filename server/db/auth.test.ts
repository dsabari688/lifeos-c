import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

describe("Authentication & JWT Tests", () => {
  it("should sign and verify JSON Web Tokens cleanly", () => {
    const payload = { id: "user-123", email: "alex.mercer@stark.corp", name: "Alex" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.name).toBe(payload.name);
  });
});
