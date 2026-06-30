import { processEvent } from "./piggyEventEngine.js";
import { ObservationSummary } from "./piggyObservation.js";

/**
 * Reviews compiled observations and fires corresponding automated reactions.
 */
export async function evaluateObservationsAndAct(
  userData: any,
  observation: ObservationSummary
): Promise<void> {
  console.log("[DECISION LOOP] Scanning observations for reactive event triggers...");

  // 1. React to high burnout risk
  if (observation.burnoutProbability > 75) {
    await processEvent("poor_sleep", { duration: 5.5 }, userData);
  }

  // 2. React to budget risks
  if (observation.budgetOverflowProbability > 80) {
    await processEvent("budget_exceeded", { category: "general" }, userData);
  }

  // 3. React to low mood/energy
  if (userData.moods && userData.moods.length > 0) {
    const lastMood = userData.moods[userData.moods.length - 1];
    if (lastMood.mood === "stressed" || lastMood.mood === "😞") {
      await processEvent("low_mood", {}, userData);
    }
  }

  console.log("[DECISION LOOP] Finished processing observations reaction rules.");
}
