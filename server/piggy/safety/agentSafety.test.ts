import { describe, it, expect, vi } from 'vitest';
import {
  scoreConfidence,
  verifyResponse,
  runRiskEngine,
  runVerificationEngine,
  verifyStepExecution,
  runRetryLoop
} from './agentSafety.js';
import { queryGroq } from '../core/piggyClient.js';

vi.mock('../core/piggyClient.js', () => ({
  queryGroq: vi.fn().mockImplementation((messages: any) => {
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";

    if (systemMsg.includes("analytical verification")) {
      return JSON.stringify({
        confidence: 92,
        reason: "High data coverage",
        riskLevel: "low"
      });
    }
    if (systemMsg.includes("Self-Verification")) {
      return JSON.stringify({
        valid: true,
        issues: [],
        confidence: 0.95
      });
    }
    if (systemMsg.includes("Risk Engine")) {
      return JSON.stringify({
        risks: [
          { risk: "Burnout", probability: 75, reason: "Excessive focus", suggestedMitigation: "Take breaks" }
        ]
      });
    }
    if (systemMsg.includes("Verification Engine")) {
      return JSON.stringify({
        valid: true,
        verificationReport: "All checks passed",
        confidenceScore: 95,
        verificationErrors: [],
        repairSuggestions: []
      });
    }
    return JSON.stringify({});
  })
}));

vi.mock('../cognition/agentCognition.js', () => ({
  evaluateToolCall: vi.fn().mockImplementation((toolName: string, args: any, expected: string, actual: any) => {
    if (toolName === "success") {
      return { expectedResult: expected, actualResult: JSON.stringify(actual), difference: null, qualityScore: 100 };
    }
    return { expectedResult: expected, actualResult: JSON.stringify(actual), difference: "Mismatch found", qualityScore: 50 };
  })
}));

describe("Confidence Scoring", () => {
  it("scores confidence successfully from API", async () => {
    const result = await scoreConfidence("How am I doing?", "You're doing great.", "context");
    expect(result.confidence).toBe(92);
    expect(result.reason).toBe("High data coverage");
    expect(result.riskLevel).toBe("low");
  });

  it("returns fallback on API error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await scoreConfidence("test", "test", "test");

    expect(result.confidence).toBe(75);
    expect(result.reason).toContain("unavailable");
    expect(result.riskLevel).toBe("medium");
  });
});

describe("Response Verification", () => {
  it("verifies valid response", async () => {
    const result = await verifyResponse("plan my day", "Here's your plan", "context");
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.confidence).toBe(0.95);
  });

  it("returns fallback on error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await verifyResponse("test", "test", "test");

    expect(result.valid).toBe(true);
    expect(result.confidence).toBe(1.0);
  });
});

describe("Risk Engine", () => {
  it("returns detected risks", async () => {
    const result = await runRiskEngine("I've been working 14 hours", "context");
    expect(result.length).toBe(1);
    expect(result[0].risk).toBe("Burnout");
    expect(result[0].probability).toBe(75);
  });

  it("returns empty array on error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await runRiskEngine("test", "test");
    expect(result).toEqual([]);
  });
});

describe("Verification Engine", () => {
  it("returns verification report", async () => {
    const result = await runVerificationEngine("query", {}, [], [], "context");
    expect(result.valid).toBe(true);
    expect(result.confidenceScore).toBe(95);
    expect(result.verificationErrors).toEqual([]);
  });

  it("returns fallback on error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await runVerificationEngine("q", {}, [], [], "c");

    expect(result.valid).toBe(true);
    expect(result.confidenceScore).toBe(85);
    expect(result.verificationReport).toContain("fallback");
  });
});

describe("Step Execution Verification", () => {
  it("marks valid when tool evaluation passes", () => {
    const result = verifyStepExecution("success", {}, "expected", { data: "ok" });
    expect(result.valid).toBe(true);
    expect(result.retryRequirement).toBe(false);
    expect(result.qualityScore).toBe(100);
  });

  it("marks invalid and requires retry when evaluation fails", () => {
    const result = verifyStepExecution("failure", {}, "expected", { data: "bad" });
    expect(result.valid).toBe(false);
    expect(result.retryRequirement).toBe(true);
    expect(result.difference).toBe("Mismatch found");
  });
});

describe("Retry Loop Engine", () => {
  it("should return initial reply immediately if there are no initial issues and confidence is high", async () => {
    const userData = {};
    const result = await runRetryLoop(
      "system",
      [],
      "query",
      "context",
      userData,
      "Initial reply",
      [],
      85,
      "low"
    );

    expect(result.reply).toBe("Initial reply");
    expect(result.retriesUsed).toBe(0);
    expect(result.confidence).toBe(85);
  });

  it("should run retry loop and succeed if verifications pass on retry", async () => {
    const userData = {};
    // Mock queryGroq to return the corrected reply, then verification results
    vi.mocked(queryGroq).mockImplementation(async (messages: any) => {
      const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
      if (systemMsg.includes("analytical verification")) {
        return JSON.stringify({ confidence: 90, reason: "Good", riskLevel: "low" });
      }
      if (systemMsg.includes("Self-Verification")) {
        return JSON.stringify({ valid: true, issues: [], confidence: 0.9 });
      }
      return "Corrected reply text";
    });

    const result = await runRetryLoop(
      "system",
      [],
      "query",
      "context",
      userData,
      "Initial reply with issues",
      ["Some constraint issue"],
      50,
      "medium"
    );

    expect(result.reply).toBe("Corrected reply text");
    expect(result.retriesUsed).toBe(1);
    expect(result.confidence).toBe(90);
    expect(result.verificationIssues).toEqual([]);
    expect((userData as any).agentWorkflowState).toBe("Verifying");
  });

  it("should stop after maxRetries (3) if issues persist", async () => {
    const userData = {};
    vi.mocked(queryGroq).mockImplementation(async (messages: any) => {
      const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
      if (systemMsg.includes("analytical verification")) {
        return JSON.stringify({ confidence: 50, reason: "Still low", riskLevel: "medium" });
      }
      if (systemMsg.includes("Self-Verification")) {
        return JSON.stringify({ valid: false, issues: ["Persistent issue"], confidence: 0.5 });
      }
      return "Attempt reply text";
    });

    const result = await runRetryLoop(
      "system",
      [],
      "query",
      "context",
      userData,
      "Initial reply with issues",
      ["Persistent issue"],
      50,
      "medium"
    );

    expect(result.retriesUsed).toBe(3);
    expect(result.verificationIssues).toEqual(["Persistent issue"]);
  });

  it("should handle error in retry loop step gracefully and continue next attempt or exit", async () => {
    const userData = {};
    // Throw error on the first retry queryGroq call
    let callCount = 0;
    vi.mocked(queryGroq).mockImplementation(async (messages: any) => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Temporary LLM error");
      }
      const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
      if (systemMsg.includes("analytical verification")) {
        return JSON.stringify({ confidence: 95, reason: "Succeeded", riskLevel: "low" });
      }
      if (systemMsg.includes("Self-Verification")) {
        return JSON.stringify({ valid: true, issues: [], confidence: 0.95 });
      }
      return "Eventually corrected reply text";
    });

    const result = await runRetryLoop(
      "system",
      [],
      "query",
      "context",
      userData,
      "Initial reply",
      ["Mistake"],
      50,
      "medium"
    );

    expect(result.reply).toBe("Eventually corrected reply text");
    expect(result.retriesUsed).toBe(2); // First failed (error), second succeeded
    expect(result.confidence).toBe(95);
  });
});

