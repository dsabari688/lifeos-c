import { queryGroq } from "./piggyClient.js";
import { buildPiggyPrompt } from "./piggyPromptBuilder.js";

/**
 * Proactively generates morning briefings, evening reviews, and weekly audits
 * without waiting for direct user queries.
 */
export async function generateMorningBriefing(
  userData: any
): Promise<string> {
  const contextSummary = buildPiggyPrompt("Requesting morning briefing overview.", userData, {});
  const prompt = `You are Piggy, a sophisticated, factual, and slightly British strategic life executive assistant.
Formulate a morning briefing summary for the user.
Greet them politely, review their top pending task deadlines, habit compliance goals for today, and highlight any risk factors (such as burnout or bad sleep) with suggestions.
Write in plain, conversational English as a brief, cohesive paragraph. Do not use headings or list bullets.

User Context Summary:
${contextSummary}

Output only your final briefing text.`;

  try {
    const briefing = await queryGroq([
      { role: "system", content: "You are Piggy, the strategic executive assistant." },
      { role: "user", content: prompt }
    ], 0.6);
    return briefing;
  } catch (error) {
    console.error("[CONVERSATION MANAGER] Error generating morning briefing:", error);
    return "Good morning, Sir. Indeed, my cognitive sensors are recalibrating. I recommend checking your tasks list directly for today's schedule.";
  }
}

export async function generateEveningReview(
  userData: any
): Promise<string> {
  const contextSummary = buildPiggyPrompt("Requesting evening review summary.", userData, {});
  const prompt = `You are Piggy, a sophisticated and slightly British life executive assistant.
Formulate a supportive evening review for the user.
Acknowledge completed tasks, audit habit logs completed today, note your sleep energy predictions for tonight, and provide a word of coaching motivation.
Write in plain, conversational English as a brief, cohesive paragraph. Do not use headings or list bullets.

User Context Summary:
${contextSummary}

Output only your final evening review text.`;

  try {
    const review = await queryGroq([
      { role: "system", content: "You are Piggy, the strategic executive assistant." },
      { role: "user", content: prompt }
    ], 0.6);
    return review;
  } catch (error) {
    console.error("[CONVERSATION MANAGER] Error generating evening review:", error);
    return "Indeed, Sir. The day is wrapping up. I suggest resting well to recharge your cognitive energy buffers.";
  }
}

export async function generateWeeklyReport(
  userData: any
): Promise<string> {
  const contextSummary = buildPiggyPrompt("Requesting weekly report.", userData, {});
  const prompt = `You are Piggy, a strategic thinking life assistant.
Generate a concise weekly audit report summarizing habit completions, budgeting, and milestone progress.
Explain the WHY behind your observations using data and telemetry.
Write in plain, conversational English as a cohesive coaching paragraph. Do not use headings or list bullets.

User Context Summary:
${contextSummary}

Output only your final weekly report text.`;

  try {
    const report = await queryGroq([
      { role: "system", content: "You are Piggy, the strategic executive assistant." },
      { role: "user", content: prompt }
    ], 0.6);
    return report;
  } catch (error) {
    console.error("[CONVERSATION MANAGER] Error generating weekly report:", error);
    return "Sir, weekly metrics are compiling. The numbers suggest stable routine conformances.";
  }
}
