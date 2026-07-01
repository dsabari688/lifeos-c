import { describe, it, expect, vi } from 'vitest';
import { buildUserKnowledgeGraph, retrieveRelevantMemories, parseAndSaveMemoryUpdates } from './agentMemory.js';
import { queryGroq } from '../core/piggyClient.js';

vi.mock('../core/piggyClient.js', () => ({
  queryGroq: vi.fn().mockResolvedValue(JSON.stringify({
    newFacts: [
      { fact: "User prefers evening study sessions", category: "preference" },
      { fact: "Exam on July 15th", category: "deadline" },
      { fact: "", category: "preference" } // Should be skipped (empty fact)
    ]
  }))
}));

describe("Knowledge Graph Builder", () => {
  it("builds nodes and edges from comprehensive user data", () => {
    const userData = {
      goals: [
        { id: "g1", title: "Get fit and healthy" },
        { id: "g2", title: "Learn TypeScript" }
      ],
      habits: [
        { id: "h1", name: "Exercise Workout" },
        { id: "h2", name: "Read 20 pages" }
      ],
      tasks: [
        { id: "t1", title: "Practice TypeScript generics" },
        { id: "t2", title: "Buy groceries" }
      ],
      expenses: [
        { id: "e1", description: "Coffee shop", amount: 5.50 }
      ],
      sleepLogs: [
        { date: "2026-06-30", duration: 5.5 }
      ],
      moods: [
        { id: "m1", mood: "stressed" }
      ],
      aiMemory: [
        { id: "mem1", fact: "Prefers morning workouts" }
      ]
    };

    const graph = buildUserKnowledgeGraph(userData);

    // Goal nodes
    expect(graph.nodes.find(n => n.id === "g1")).toBeDefined();
    expect(graph.nodes.find(n => n.id === "g2")).toBeDefined();

    // Habit nodes
    expect(graph.nodes.find(n => n.id === "h1")).toBeDefined();

    // Exercise habit -> fitness goal edge
    const exerciseEdge = graph.edges.find(e => e.source === "h1" && e.target === "g1");
    expect(exerciseEdge).toBeDefined();
    expect(exerciseEdge!.relationship).toBe("supports_goal");

    // Task -> Goal keyword matching (TypeScript -> Learn TypeScript)
    const taskGoalEdge = graph.edges.find(e => e.source === "t1" && e.target === "g2");
    expect(taskGoalEdge).toBeDefined();
    expect(taskGoalEdge!.relationship).toBe("milestone_for");

    // Non-matching task should not link
    const groceryEdge = graph.edges.find(e => e.source === "t2");
    expect(groceryEdge).toBeUndefined();

    // Expense nodes
    expect(graph.nodes.find(n => n.id === "e1")).toBeDefined();

    // Sleep + mood correlation edge (low sleep + stressed mood)
    const sleepMoodEdge = graph.edges.find(e => e.relationship === "depresses_mood");
    expect(sleepMoodEdge).toBeDefined();

    // Memory nodes
    expect(graph.nodes.find(n => n.id === "mem1")).toBeDefined();
  });

  it("handles empty user data without errors", () => {
    const graph = buildUserKnowledgeGraph({});
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("does not create sleep-mood edge when sleep is adequate", () => {
    const userData = {
      sleepLogs: [{ date: "2026-06-30", duration: 8.0 }],
      moods: [{ id: "m1", mood: "stressed" }]
    };
    const graph = buildUserKnowledgeGraph(userData);
    const depressEdge = graph.edges.find(e => e.relationship === "depresses_mood");
    expect(depressEdge).toBeUndefined();
  });

  it("does not create sleep-mood edge when mood is happy", () => {
    const userData = {
      sleepLogs: [{ date: "2026-06-30", duration: 5.0 }],
      moods: [{ id: "m1", mood: "happy" }]
    };
    const graph = buildUserKnowledgeGraph(userData);
    const depressEdge = graph.edges.find(e => e.relationship === "depresses_mood");
    expect(depressEdge).toBeUndefined();
  });

  it("does not connect non-exercise habits to fitness goals", () => {
    const userData = {
      goals: [{ id: "g1", title: "Get fit" }],
      habits: [{ id: "h1", name: "Read 20 pages" }]
    };
    const graph = buildUserKnowledgeGraph(userData);
    expect(graph.edges.length).toBe(0);
  });
});

describe("Memory Retrieval", () => {
  const memories = [
    { id: "m1", fact: "User prefers 2-hour deep work sessions", category: "preference" as const, timestamp: "2026-06-01" },
    { id: "m2", fact: "Exams start on July 10th", category: "exam" as const, timestamp: "2026-06-15" },
    { id: "m3", fact: "Flight to Mumbai on July 5th", category: "deadline" as const, timestamp: "2026-06-20" },
    { id: "m4", fact: "Cannot study on Sundays", category: "constraint" as const, timestamp: "2026-06-25" },
    { id: "m5", fact: "Goal is to learn React architecture", category: "goal" as const, timestamp: "2026-06-28" },
    { id: "m6", fact: "Generic note about day planning", category: "preference" as const, timestamp: "2026-06-29" }
  ];

  it("returns category-matched and keyword-matched memories sorted by relevance", () => {
    const result = retrieveRelevantMemories("When is my exam test scheduled?", memories);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
    // Should include exam-related memory as top result
    expect(result.find(m => m.id === "m2")).toBeDefined();
  });

  it("returns keyword-matched memories for focus/duration queries", () => {
    const result = retrieveRelevantMemories("What is my preferred focus session duration hours?", memories);
    expect(result.find(m => m.id === "m1")).toBeDefined();
  });

  it("returns fallback baseline of 4 memories when no match found", () => {
    const result = retrieveRelevantMemories("random xyz unrelated query", memories);
    expect(result.length).toBe(4);
  });

  it("returns empty array for empty memory list", () => {
    const result = retrieveRelevantMemories("test query", []);
    expect(result).toEqual([]);
  });

  it("matches goal category keywords", () => {
    const result = retrieveRelevantMemories("What is my current goal target?", memories);
    expect(result.find(m => m.id === "m5")).toBeDefined();
  });

  it("matches constraint category keywords", () => {
    const result = retrieveRelevantMemories("What days can't I skip on Sunday?", memories);
    expect(result.find(m => m.id === "m4")).toBeDefined();
  });

  it("matches deadline category keywords for travel", () => {
    const result = retrieveRelevantMemories("When is my flight trip travel date?", memories);
    expect(result.find(m => m.id === "m3")).toBeDefined();
  });
});

describe("Memory Updater", () => {
  it("parses and saves new memory facts from conversation, skipping empty facts", async () => {
    const userData: any = { agentWorkflowState: "Idle" };

    await parseAndSaveMemoryUpdates("I study best at night", "Great, noted.", userData);

    expect(userData.aiMemory).toBeDefined();
    // Should have 2 facts (skipped the empty one)
    expect(userData.aiMemory.length).toBe(2);
    expect(userData.aiMemory[0].fact).toBe("User prefers evening study sessions");
    expect(userData.aiMemory[0].category).toBe("preference");
    expect(userData.aiMemory[1].fact).toBe("Exam on July 15th");
  });

  it("deduplicates existing facts (case insensitive)", async () => {
    const userData: any = {
      aiMemory: [
        { id: "existing", fact: "User prefers evening study sessions", category: "preference", timestamp: "2026-06-01" }
      ]
    };

    await parseAndSaveMemoryUpdates("test", "test", userData);

    // Should only have 2 total (1 existing + 1 new non-duplicate)
    expect(userData.aiMemory.length).toBe(2);
  });

  it("handles queryGroq errors gracefully", async () => {
    const mockQueryGroq = vi.mocked(queryGroq);
    mockQueryGroq.mockRejectedValueOnce(new Error("API error"));

    const userData: any = {};
    await parseAndSaveMemoryUpdates("test", "test", userData);

    // Should not crash, aiMemory should not be created
    expect(userData.aiMemory).toBeUndefined();
  });

  it("handles malformed JSON response", async () => {
    const mockQueryGroq = vi.mocked(queryGroq);
    mockQueryGroq.mockResolvedValueOnce("{broken json");

    const userData: any = {};
    await parseAndSaveMemoryUpdates("test", "test", userData);

    expect(userData.aiMemory).toBeUndefined();
  });
});
