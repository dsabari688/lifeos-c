import { queryGroq } from "../core/piggyClient.js";

export interface OpportunityFactor {
  opportunity: string;        // Opportunity name (e.g., Early Focus Window)
  benefit: string;            // The advantage (e.g., Save $20, Accelerate goal by 2 days)
  difficulty: 'low' | 'medium' | 'high';
  estimatedBenefit: string;   // Explanation of estimated benefit
}

/**
 * Searches the user's data context to spot scheduling, savings, or habit acceleration opportunities.
 */
export async function runOpportunityEngine(
  userQuery: string,
  contextSummary: string
): Promise<OpportunityFactor[]> {
  const prompt = `You are the Piggy AI Opportunity Engine.
Analyze the user query and the current user context to detect proactive opportunities:
1. Free Time / Buffer gaps in schedule
2. Unused Focus Blocks (during peak energy hours)
3. Streak Opportunities (habits close to completing high milestones)
4. Budget Savings (underutilized categories)
5. Goal Acceleration (quick wins to boost goal progression)
6. Learning Opportunities (topics of interest/skills)

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object containing a list of detected opportunities:
{
  "opportunities": [
    {
      "opportunity": "Early Morning Coding",
      "benefit": "Unlocks 2 hours of quiet focus",
      "difficulty": "medium",
      "estimatedBenefit": "Accelerates your Learn React goal by completing tasks in high peak hours"
    }
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Opportunity Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.opportunities)) {
      return result.opportunities;
    }
    return [];
  } catch (error) {
    console.error("[OPPORTUNITY ENGINE] Error checking opportunities:", error);
    return [];
  }
}
