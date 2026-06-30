import { runAutonomousAgentLoop } from "./piggyAutonomy.js";
import { generateMorningBriefing, generateEveningReview, generateWeeklyReport } from "../conversation/piggyConversationManager.js";

/**
 * Piggy Agent main class orchestrator.
 * Encapsulates the agent's capabilities to run loop cycles, generate briefs, and review telemetry.
 */
export class PiggyAgent {
  /**
   * Triggers the Observe-Think-Reason-Plan-Execute autonomous loop.
   */
  public async executeCycle(userData: any): Promise<any> {
    return await runAutonomousAgentLoop(userData);
  }

  /**
   * Proactively triggers morning briefing text generation.
   */
  public async getMorningBrief(userData: any): Promise<string> {
    return await generateMorningBriefing(userData);
  }

  /**
   * Proactively triggers evening review summary text generation.
   */
  public async getEveningReview(userData: any): Promise<string> {
    return await generateEveningReview(userData);
  }

  /**
   * Proactively triggers weekly report text generation.
   */
  public async getWeeklyReport(userData: any): Promise<string> {
    return await generateWeeklyReport(userData);
  }
}

export const piggyAgentInstance = new PiggyAgent();
