import { queryGroq } from "../core/piggyClient.js";
import { transitionWorkflowState } from "../types/piggyWorkflow.js";

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
