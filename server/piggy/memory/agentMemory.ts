import { queryGroq } from "../core/piggyClient.js";
import { transitionWorkflowState } from "../types/agentTypes.js";

// --- Consolidated from piggyKnowledgeGraph.ts ---
export interface GraphNode {
  id: string;
  type: 'goal' | 'habit' | 'task' | 'memory' | 'deadline' | 'expense' | 'sleep' | 'mood' | 'focus';
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Maps connections between user entities, telemetry logs, and cognitive memories.
 */
export function buildUserKnowledgeGraph(userData: any): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const tasks = userData.tasks || [];
  const habits = userData.habits || [];
  const goals = userData.goals || [];
  const expenses = userData.expenses || [];
  const sleepLogs = userData.sleepLogs || [];
  const moods = userData.moods || [];
  const aiMemory = userData.aiMemory || [];

  // 1. Add Goals Nodes
  goals.forEach((g: any) => {
    nodes.push({ id: g.id, type: 'goal', label: g.title });
  });

  // 2. Add Habits Nodes & Connect to Goals if title matches
  habits.forEach((h: any) => {
    nodes.push({ id: h.id, type: 'habit', label: h.name });
    
    // Connect workout habit to physical goals, etc.
    const isExercise = h.name.toLowerCase().includes("exercise") || h.name.toLowerCase().includes("workout");
    if (isExercise) {
      const targetGoal = goals.find((g: any) => 
        g.title.toLowerCase().includes("fit") || 
        g.title.toLowerCase().includes("weight") || 
        g.title.toLowerCase().includes("health")
      );
      if (targetGoal) {
        edges.push({
          id: `edge-${h.id}-${targetGoal.id}`,
          source: h.id,
          target: targetGoal.id,
          relationship: "supports_goal"
        });
      }
    }
  });

  // 3. Add Tasks Nodes & Connect to Goals/Habits
  tasks.slice(-15).forEach((t: any) => {
    nodes.push({ id: t.id, type: 'task', label: t.title });

    // Connect to Goals if task title matches goal keyword
    goals.forEach((g: any) => {
      const words = g.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
      if (words.some((w: string) => t.title.toLowerCase().includes(w))) {
        edges.push({
          id: `edge-${t.id}-${g.id}`,
          source: t.id,
          target: g.id,
          relationship: "milestone_for"
        });
      }
    });
  });

  // 4. Add Expense Nodes & Check Limits
  expenses.slice(-5).forEach((e: any) => {
    nodes.push({ id: e.id, type: 'expense', label: `${e.description} ($${e.amount})` });
  });

  // 5. Connect sleep and mood correlations
  if (sleepLogs.length > 0 && moods.length > 0) {
    const lastSleep = sleepLogs[sleepLogs.length - 1];
    const lastMood = moods[moods.length - 1];
    
    const sleepNodeId = `sleep-${lastSleep.date}`;
    const moodNodeId = `mood-${lastMood.id}`;

    nodes.push({ id: sleepNodeId, type: 'sleep', label: `${lastSleep.duration}h Sleep` });
    nodes.push({ id: moodNodeId, type: 'mood', label: `Mood: ${lastMood.mood}` });

    if (lastSleep.duration < 6.5 && (lastMood.mood === "stressed" || lastMood.mood === "😞")) {
      edges.push({
        id: `edge-${sleepNodeId}-${moodNodeId}`,
        source: sleepNodeId,
        target: moodNodeId,
        relationship: "depresses_mood"
      });
    }
  }

  // 6. Add Memories Nodes
  aiMemory.slice(-5).forEach((m: any) => {
    nodes.push({ id: m.id, type: 'memory', label: m.fact });
  });

  return {
    nodes,
    edges
  };
}

// --- Consolidated from piggyMemory.ts ---
// Piggy AI v4.0 — Memory Vault Filtering Module

export interface AIMemoryFact {
  id: string;
  fact: string;
  category: 'deadline' | 'exam' | 'preference' | 'constraint' | 'goal';
  timestamp: string;
}

/**
 * Filters the list of stored memories to return only the most contextually relevant 
 * facts for the user's current input, optimizing token usage.
 */
export function retrieveRelevantMemories(query: string, memories: AIMemoryFact[]): AIMemoryFact[] {
  if (!memories || memories.length === 0) return [];
  const normalizedQuery = query.toLowerCase();

  // Category search keywords
  const categoryKeywords: Record<string, string[]> = {
    exam: ["exam", "study", "college", "test", "quiz", "class", "final", "semester", "preparation", "midterm"],
    deadline: ["deadline", "due", "submit", "flight", "trip", "travel", "date", "calendar", "schedule", "tomorrow", "upcoming"],
    preference: ["prefer", "like", "love", "favorite", "usually", "custom", "want", "study slot", "focus session", "hours", "duration"],
    constraint: ["skip", "cannot", "can't", "don't", "never", "only", "days", "sunday", "saturday", "weekend", "morning", "evening"],
    goal: ["goal", "target", "aim", "achieve", "objective", "plan", "milestone", "pacing"]
  };

  // 1. Identify query-matched categories
  const matchedCategories = new Set<string>();
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => normalizedQuery.includes(keyword))) {
      matchedCategories.add(category);
    }
  });

  // 2. Score facts by keyword relevance and category matching
  const scored = memories.map(m => {
    let score = 0;
    
    // Category match bonus
    if (matchedCategories.has(m.category)) {
      score += 4;
    }

    // Keyword overlaps
    const queryWords = normalizedQuery.split(/\W+/).filter(w => w.length > 3);
    const factWords = m.fact.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    queryWords.forEach(qw => {
      if (factWords.some(fw => fw.includes(qw) || qw.includes(fw))) {
        score += 3;
      }
    });

    return { fact: m, score };
  });

  // 3. Filter matched facts. If nothing scored, fall back to returning a general baseline of 4 facts
  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.fact);
  if (matched.length > 0) {
    return matched.slice(0, 5); // Return up to top 5 relevant memories
  }

  // General baseline default context
  return memories.slice(0, 4);
}

// --- Consolidated from piggyMemoryUpdater.ts ---

export interface NewMemoryFact {
  fact: string;
  category: 'deadline' | 'exam' | 'preference' | 'constraint' | 'goal' | 'routine' | 'habit' | 'project';
}

/**
 * Automatically extracts new preferences, habits, deadlines, routines, or goals
 * from the conversation session and registers them in the database context.
 */
export async function parseAndSaveMemoryUpdates(
  userQuery: string,
  finalResponse: string,
  userData: any
): Promise<void> {
  transitionWorkflowState(userData, 'Memory Update');

  const existingFactsStr = (userData.aiMemory || [])
    .map((m: any) => `- [${m.category}] ${m.fact}`)
    .join("\n");

  const prompt = `Analyze the conversation to extract any new personal preferences, routines, goals, deadlines, habits, or projects that should be remembered long-term.
Do not extract transient details. Do not duplicate information already stored.

Existing Memories:
${existingFactsStr || "(No memories stored)"}

Interaction:
User: "${userQuery}"
Response: "${finalResponse}"

Return a JSON object containing:
{
  "newFacts": [
    {
      "fact": "Clear, concise summary of the fact",
      "category": "deadline" | "exam" | "preference" | "constraint" | "goal" | "routine" | "habit" | "project"
    }
  ]
}

Format strictly as JSON. Output only the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Memory Extraction Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.newFacts)) {
      if (!userData.aiMemory) {
        userData.aiMemory = [];
      }

      for (const item of result.newFacts) {
        if (!item.fact || !item.category) continue;

        // Perform case-insensitive deduplication check
        const isDuplicate = userData.aiMemory.some(
          (m: any) => m.fact.toLowerCase().trim() === item.fact.toLowerCase().trim()
        );

        if (!isDuplicate) {
          const newMem = {
            id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            fact: item.fact,
            category: item.category,
            timestamp: new Date().toISOString()
          };
          userData.aiMemory.push(newMem);
          console.log(`[MEMORY UPDATER] Registered new memory fact: [${item.category}] ${item.fact}`);
        }
      }
    }
  } catch (error) {
    console.error("[MEMORY UPDATER] Failed to process memory updates:", error);
  }
}