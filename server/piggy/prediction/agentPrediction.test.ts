import { describe, it, expect, vi } from 'vitest';
import { buildFailureModel, runPredictiveAnalytics, calculateTrends, buildSuccessModel, runPriorityEngine, runScenarioEngine, runOpportunityEngine } from './agentPrediction.js';
import { queryGroq } from '../core/piggyClient.js';

// Mock queryGroq for Priority, Scenario, and Opportunity engines
vi.mock('../core/piggyClient.js', () => ({
  queryGroq: vi.fn().mockImplementation((messages: any) => {
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
    if (systemMsg.includes("Priority Engine")) {
      return JSON.stringify({
        priority: "High",
        reason: "Test priority reason",
        breakdown: { deadlineImpact: 8, habitImpact: 7, goalImpact: 6, mentalLoad: 5, financialImpact: 4 }
      });
    }
    if (systemMsg.includes("Scenario Engine") || systemMsg.includes("Scenario Analysis")) {
      return JSON.stringify({
        bestCase: { outcome: "Success", likelihood: "80%" },
        expectedCase: { outcome: "Normal", likelihood: "15%" },
        worstCase: { outcome: "Failure", likelihood: "5%" },
        recoveryPlan: ["Plan B"]
      });
    }
    if (systemMsg.includes("Opportunity Engine")) {
      return JSON.stringify({
        opportunities: [
          {
            opportunity: "Early Morning Coding",
            benefit: "Unlocks 2 hours of quiet focus",
            difficulty: "medium",
            estimatedBenefit: "Accelerates your Learn React goal"
          }
        ]
      });
    }
    return JSON.stringify({});
  })
}));

describe("Prediction Engine", () => {
    it("builds failure model with sleep and stress triggers", () => {
        const userData = {
            sleepLogs: [{ duration: 5.5 }, { duration: 7.0 }],
            moods: [{ mood: "stressed" }, { mood: "happy" }]
        };

        const result = buildFailureModel(userData);
        expect(result.failureTriggers.length).toBeGreaterThan(0);
        expect(result.criticalFailureRiskHours.length).toBe(2);

        // Test default path when no triggers (empty logs)
        const defaultResult = buildFailureModel({});
        expect(defaultResult.failureTriggers.find(t => t.triggerFactor === "fatigue_drift")).toBeDefined();
    });

    it("calculates predictive metrics correctly", () => {
        const today = new Date();
        const getPastDateStr = (days: number) => {
            const d = new Date(today);
            d.setDate(d.getDate() - days);
            return d.toISOString().split("T")[0];
        };
        const getFutureDateStr = (days: number) => {
            const d = new Date(today);
            d.setDate(d.getDate() + days);
            return d.toISOString().split("T")[0];
        };

        const userData = {
            sleepLogs: [
                { duration: 8.0 },
                { duration: 8.0 },
                { duration: 8.0 },
                { duration: 7.0 } // avg sleep is 7.75. last sleep is 7.0. fair sleep
            ],
            moods: [{ mood: "stressed" }, { mood: "stressed" }], // stressCount = 2 > 1
            expenses: [{ amount: 500 }],
            profile: { budgetLimit: 1200 },
            tasks: [{ status: "pending", date: "2026-07-10" }],
            goals: [
                { id: "g1", title: "Learn TS", progress: 100, targetDate: getPastDateStr(2) }, // target date in past, progress 100
                { id: "g2", title: "Learn JS", progress: 50, targetDate: getPastDateStr(2) },  // target date in past, progress < 100
                { id: "g3", title: "Learn Python", progress: 10, targetDate: getFutureDateStr(10) } // target date in future, progress rate low -> success prob low (covers line 238)
            ],
            focusSessions: [{ durationMinutes: 90, score: 85 }]
        };

        const metrics = runPredictiveAnalytics(userData);
        expect(metrics.burnoutProbability).toBeGreaterThan(0);
        expect(metrics.predictedSleepQuality).toBe('fair');
        expect(metrics.predictedEnergyLevel).toBe(50); // 75 - 10 (fair sleep) - 15 (stressCount > 1) = 50
        expect(metrics.goalPredictions.length).toBe(3);
        expect(metrics.goalPredictions[0].probabilityOfSuccess).toBe(100);
        expect(metrics.goalPredictions[1].probabilityOfSuccess).toBe(5);
        expect(metrics.goalPredictions[2].probabilityOfSuccess).toBe(10);
    });

    it("calculates trends and builds success model across multiple weeks", () => {
        const today = new Date();
        const getDateAgo = (days: number) => {
            const d = new Date(today);
            d.setDate(d.getDate() - days);
            return d.toISOString().split("T")[0];
        };

        const userData = {
            sleepLogs: [
                { date: getDateAgo(3), duration: 8.0 },
                { date: getDateAgo(10), duration: 6.5 }
            ],
            focusSessions: [
                { timestamp: getDateAgo(2), durationMinutes: 60, score: 85 },
                { timestamp: getDateAgo(9), durationMinutes: 30, score: 75 }
            ],
            moods: [
                { createdAt: getDateAgo(4), mood: "happy" },
                { createdAt: getDateAgo(11), mood: "stressed" }
            ],
            habits: [
                {
                    name: "Meditate",
                    logs: [getDateAgo(3)], // 1 completion in week 1, 0 in week 2
                    streak: 3
                }
            ]
        };

        // 1. Test calculateTrends
        const trends = calculateTrends(userData);
        expect(trends.habitSlope).toBeDefined();
        expect(trends.focusDurationSlope).toBe(30); // 60 - 30
        expect(trends.moodSlope).toBe(4); // 5 (happy) - 1 (stressed) = 4

        // Test with habit improvement slope (>10)
        const improvementUserData = {
            ...userData,
            habits: [
                {
                    name: "Meditate",
                    logs: [getDateAgo(1), getDateAgo(2), getDateAgo(3), getDateAgo(10)], // 3 in week 1, 1 in week 2
                    streak: 3
                }
            ]
        };
        const improvementTrends = calculateTrends(improvementUserData);
        expect(improvementTrends.habitSlope).toBeGreaterThan(10);
        expect(improvementTrends.trendSummary).toContain("improved");

        // Test with habit drop slope (<-10)
        const dropUserData = {
            ...userData,
            habits: [
                {
                    name: "Meditate",
                    logs: [getDateAgo(3), getDateAgo(9), getDateAgo(10), getDateAgo(11)], // 1 in week 1, 3 in week 2
                    streak: 3
                }
            ]
        };
        const dropTrends = calculateTrends(dropUserData);
        expect(dropTrends.habitSlope).toBeLessThan(-10);
        expect(dropTrends.trendSummary).toContain("dropped");

        // 2. Test buildSuccessModel
        const successModel = buildSuccessModel(userData);
        expect(successModel.minSleepThreshold).toBe(8.0); // habit success date: 3 days ago. sleep duration on that day: 8.0
        expect(successModel.optimalFocusMinutes).toBe(60); // only focus session with score >= 80 is 60 minutes
        expect(successModel.successConditionsSummary).toContain("8 hours");
    });

    it("evaluates priority engine and scenario analysis with mock responses", async () => {
        const priorityRes = await runPriorityEngine("Urgent deadline help", "User has a deadline tomorrow");
        expect(priorityRes.priority).toBe("High");
        expect(priorityRes.breakdown.deadlineImpact).toBe(8);

        const scenarioRes = await runScenarioEngine("Plan launch", "Launch task", "context");
        expect(scenarioRes.bestCase.outcome).toBe("Success");
        expect(scenarioRes.recoveryPlan).toContain("Plan B");
    });

    it("evaluates opportunity engine with mock responses and handles errors", async () => {
        const oppRes = await runOpportunityEngine("Learn React", "context");
        expect(oppRes.length).toBe(1);
        expect(oppRes[0].opportunity).toBe("Early Morning Coding");

        const mockQueryGroq = vi.mocked(queryGroq);
        mockQueryGroq.mockRejectedValueOnce(new Error("Opportunity Groq API error"));
        const oppErrorRes = await runOpportunityEngine("Learn React", "context");
        expect(oppErrorRes.length).toBe(0);
    });

    it("handles errors in priority and scenario engines gracefully", async () => {
        const mockQueryGroq = vi.mocked(queryGroq);
        mockQueryGroq.mockRejectedValueOnce(new Error("Groq API error"));
        
        const priorityRes = await runPriorityEngine("Urgent deadline help", "context");
        expect(priorityRes.priority).toBe("Medium");
        expect(priorityRes.reason).toContain("unavailable");

        mockQueryGroq.mockRejectedValueOnce(new Error("Groq API error"));
        const scenarioRes = await runScenarioEngine("Plan launch", "Launch task", "context");
        expect(scenarioRes.bestCase.outcome).toBe("Optimistic completion.");
    });
});