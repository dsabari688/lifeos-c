import { queryGroq } from "./piggyClient.js";

export interface GoalSubtask {
  id: string;
  title: string;
  status: 'pending' | 'completed';
}

/**
 * Automatically maps long-term goals into sub-milestones and tracks their completion
 * status based on completed tasks or conversational signals in the user query.
 */
export async function autoTrackGoalProgress(
  userQuery: string,
  userData: any
): Promise<void> {
  const goals = userData.goals || [];
  const activeGoals = goals.filter((g: any) => g.status === "active");

  if (activeGoals.length === 0) return;

  for (const goal of activeGoals) {
    // 1. Initialize subtask breakdown if not already defined
    if (!goal.subtasks || goal.subtasks.length === 0) {
      console.log(`[GOAL TRACKER] Breaking down new active goal: "${goal.title}"`);
      const breakdownPrompt = `Break down this long-term goal into 4 to 6 specific, actionable milestones or sub-components.
Goal: "${goal.title}"
Description: "${goal.description || ""}"

Return a JSON object containing:
{
  "subtasks": [
    { "title": "Milestone title" }
  ]
}

Format strictly as JSON. Output only the JSON block.`;

      try {
        const rawBreakdown = await queryGroq([
          { role: "system", content: "You are the Piggy AI Goal Breakdown Assistant. Output strictly JSON." },
          { role: "user", content: breakdownPrompt }
        ], 0.1, true);

        const parsed = JSON.parse(rawBreakdown);
        if (parsed && Array.isArray(parsed.subtasks)) {
          goal.subtasks = parsed.subtasks.map((st: any, idx: number) => ({
            id: `st-${Date.now()}-${idx}`,
            title: st.title,
            status: 'pending'
          }));
        }
      } catch (err) {
        console.error(`[GOAL TRACKER] Error breaking down goal "${goal.title}":`, err);
        continue;
      }
    }

    // 2. Scan completed tasks in checklist to find matches
    const completedTasks = (userData.tasks || []).filter((t: any) => t.status === "completed");
    let progressChanged = false;

    if (goal.subtasks && goal.subtasks.length > 0) {
      for (const subtask of goal.subtasks) {
        if (subtask.status === "pending") {
          const matchedTask = completedTasks.find((t: any) => 
            t.title.toLowerCase().includes(subtask.title.toLowerCase()) ||
            subtask.title.toLowerCase().includes(t.title.toLowerCase())
          );

          if (matchedTask) {
            subtask.status = "completed";
            progressChanged = true;
            console.log(`[GOAL TRACKER] Subtask marked completed via task match: "${subtask.title}"`);
          }
        }
      }
    }

    // 3. Perform semantic lookup on the user query to detect completions
    if (!progressChanged && userQuery && goal.subtasks && goal.subtasks.length > 0) {
      const semanticCheckPrompt = `Check if the user claims to have completed any of these goal subtasks.
Goal: "${goal.title}"
User Message: "${userQuery}"
Subtasks Checklist:
${goal.subtasks.map((st: any) => `- [${st.status}] ${st.title} (ID: ${st.id})`).join("\n")}

If any subtasks were completed, list their IDs in the array. If none, return an empty array.
Return a JSON object containing:
{
  "completedSubtaskIds": ["st-id-1"]
}

Format strictly as JSON. Output only the JSON block.`;

      try {
        const checkRaw = await queryGroq([
          { role: "system", content: "You are the Piggy AI Semantic Goal Tracker. Output strictly JSON." },
          { role: "user", content: semanticCheckPrompt }
        ], 0.1, true);

        const checkRes = JSON.parse(checkRaw);
        if (checkRes && Array.isArray(checkRes.completedSubtaskIds)) {
          for (const id of checkRes.completedSubtaskIds) {
            const sub = goal.subtasks.find((st: any) => st.id === id);
            if (sub && sub.status === "pending") {
              sub.status = "completed";
              progressChanged = true;
              console.log(`[GOAL TRACKER] Subtask marked completed semantically: "${sub.title}"`);
            }
          }
        }
      } catch (err) {
        console.error(`[GOAL TRACKER] Semantic check error for goal "${goal.title}":`, err);
      }
    }

    // 4. Update the goal progress rate
    if (goal.subtasks && goal.subtasks.length > 0) {
      const total = goal.subtasks.length;
      const completed = goal.subtasks.filter((st: any) => st.status === "completed").length;
      const calculatedProgress = Math.round((completed / total) * 100);

      if (goal.progress !== calculatedProgress) {
        goal.progress = calculatedProgress;
        if (calculatedProgress >= 100) {
          goal.status = "completed";
        }
        console.log(`[GOAL TRACKER] Progress for goal "${goal.title}" set to ${calculatedProgress}%`);
      }
    }
  }
}
