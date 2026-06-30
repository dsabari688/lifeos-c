export interface ToolEvaluationResult {
  expectedResult: string;
  actualResult: string;
  difference: string | null;
  qualityScore: number; // 0 to 100
}

/**
 * Evaluates a tool's actual execution result against the expected outcome.
 * Returns a quality score and details of any discrepancies.
 */
export function evaluateToolCall(
  toolName: string,
  args: any,
  expectedResult: string,
  actualResult: any
): ToolEvaluationResult {
  const actualStr = JSON.stringify(actualResult);
  const expectedNormalized = expectedResult.toLowerCase();
  const actualNormalized = actualStr.toLowerCase();

  let difference: string | null = null;
  let qualityScore = 100;

  // Perform specific validations based on the tool executed
  if (toolName === "createTask") {
    const title = args.title ? args.title.toLowerCase() : "";
    if (title && !actualNormalized.includes(title)) {
      difference = `Expected task "${args.title}" to be created, but it was not found in database state.`;
      qualityScore = 0;
    }
  } else if (toolName === "updateTaskStatus") {
    const expectedStatus = args.status ? args.status.toLowerCase() : "";
    if (expectedStatus && !actualNormalized.includes(expectedStatus)) {
      difference = `Expected task status to be updated to "${args.status}", but status was not matched.`;
      qualityScore = 30;
    }
  } else if (toolName === "deleteTask") {
    if (actualResult.deleted === false) {
      difference = `Expected task with ID "${args.id}" to be deleted, but task still exists.`;
      qualityScore = 0;
    }
  } else if (toolName === "createGoal") {
    const title = args.title ? args.title.toLowerCase() : "";
    if (title && !actualNormalized.includes(title)) {
      difference = `Expected goal "${args.title}" to be created, but goal was missing.`;
      qualityScore = 10;
    }
  } else if (toolName === "updateGoalProgress") {
    if (actualResult.progress !== args.progress) {
      difference = `Expected goal progress to be ${args.progress}%, but got ${actualResult.progress}%.`;
      qualityScore = 50;
    }
  } else if (toolName === "createHabit") {
    const name = args.name ? args.name.toLowerCase() : "";
    if (name && !actualNormalized.includes(name)) {
      difference = `Expected habit "${args.name}" to be created, but it was not registered.`;
      qualityScore = 0;
    }
  } else if (toolName === "logHabit") {
    if (!actualResult.logged) {
      difference = `Expected habit logs to include date "${args.date}", but log registration was not found.`;
      qualityScore = 20;
    }
  } else if (toolName === "addExpense") {
    const amount = args.amount;
    if (amount && actualResult.amount !== amount) {
      difference = `Expected expense amount to be ${amount}, but got ${actualResult.amount}.`;
      qualityScore = 40;
    }
  }

  // Generic keyword match check for safety
  if (!difference && expectedNormalized && expectedNormalized !== "any") {
    const expectedWords = expectedNormalized.split(/\s+/).filter(w => w.length > 3);
    if (expectedWords.length > 0) {
      const matchCount = expectedWords.filter(word => actualNormalized.includes(word)).length;
      const ratio = matchCount / expectedWords.length;
      if (ratio < 0.5) {
        difference = `Actual result did not match the expected keywords. Expected: "${expectedResult}"`;
        qualityScore = Math.round(ratio * 100);
      }
    }
  }

  return {
    expectedResult,
    actualResult: actualStr,
    difference,
    qualityScore
  };
}
