import { queryGroq } from "./piggyClient.js";
import { toolRegistry } from "./piggyToolRegistry.js";
import { Action } from "./piggyCognitiveTypes.js";

/**
 * Automatically decides which tools to select, why, and their execution sequence
 * based on the user's goal and current context.
 */
export async function selectToolsForGoal(
  userQuery: string,
  contextSummary: string
): Promise<Partial<Action>[]> {
  // Format tool definitions as context payload
  const toolsPayload = Object.values(toolRegistry).map(entry => ({
    id: entry.definition.id,
    name: entry.definition.name,
    description: entry.definition.description,
    supportedActions: entry.definition.supportedActions,
    requiredInputs: entry.definition.requiredInputs
  }));

  const prompt = `You are the Piggy AI Autonomous Tool Selector.
Analyze the user query and database context. Decide if any tool operations are required to fulfill the request.
Here are the available tools:
${JSON.stringify(toolsPayload, null, 2)}

Important Rules:
- If no tool calls are needed, return an empty steps list: {"steps": []}.
- Dates must be formatted as YYYY-MM-DD.
- Build dependencies if a step requires the output of a prior step.
- Set executionOrder correctly.

User Request: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object:
{
  "steps": [
    {
      "id": "step-1",
      "toolId": "task",
      "action": "create",
      "args": { "title": "Revise React router", "category": "personal", "action": "create" },
      "dependencies": [],
      "executionOrder": 1,
      "expectedResult": "Task is added to user tasks"
    }
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Tool Selector. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.steps)) {
      return result.steps;
    }
    return [];
  } catch (error) {
    console.error("[TOOL SELECTOR] Error selecting tools:", error);
    return [];
  }
}
