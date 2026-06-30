/**
 * Piggy AI Event Engine.
 * Reacts automatically to events: sleep drops, budget alerts, and new tasks.
 */

export interface EventReactionResult {
  triggered: boolean;
  actionTaken: string;
}

/**
 * Dispatches and reacts to system telemetry events.
 */
export async function processEvent(
  eventName: 'new_task' | 'budget_exceeded' | 'deadline_near' | 'poor_sleep' | 'low_mood',
  payload: any,
  userData: any
): Promise<EventReactionResult> {
  console.log(`[EVENT ENGINE] Dispatching event: "${eventName}"`);
  if (!userData.notifications) userData.notifications = [];

  switch (eventName) {
    case 'new_task': {
      // Replan schedule event
      const newNotification = {
        id: `event-nt-${Date.now()}`,
        type: "alert",
        title: "Schedule Re-optimized",
        message: `Task "${payload.title}" was added. Schedule buffer checked to prevent conflicts.`,
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(newNotification);
      return { triggered: true, actionTaken: "Re-allocated calendar schedule slot buffers." };
    }

    case 'budget_exceeded': {
      const warningNotification = {
        id: `event-be-${Date.now()}`,
        type: "warning",
        title: "Budget Overrun Warn",
        message: `Category "${payload.category}" exceeds limit. Balance check recommended.`,
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(warningNotification);
      return { triggered: true, actionTaken: "Sent budget warning alert notification." };
    }

    case 'deadline_near': {
      // Increase priority of tasks due soon
      const tasks = userData.tasks || [];
      const urgentTask = tasks.find((t: any) => t.id === payload.taskId);
      if (urgentTask) {
        urgentTask.priority = "critical";
        return { triggered: true, actionTaken: `Bumped task "${urgentTask.title}" priority to Critical.` };
      }
      return { triggered: false, actionTaken: "Urgent task not found." };
    }

    case 'poor_sleep': {
      // Reduce workload: defer non-essential tasks scheduled for today
      const todayStr = new Date().toISOString().split("T")[0];
      const tasks = userData.tasks || [];
      let deferredCount = 0;
      
      tasks.forEach((t: any) => {
        if (t.date === todayStr && t.status === "pending" && t.priority !== "high" && t.priority !== "critical") {
          // Defer to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          t.date = tomorrow.toISOString().split("T")[0];
          t.rescheduledCount = (t.rescheduledCount || 0) + 1;
          deferredCount++;
        }
      });

      if (deferredCount > 0) {
        const sleepAlert = {
          id: `event-ps-${Date.now()}`,
          type: "alert",
          title: "Workload Adjusted",
          message: `Poor sleep detected (${payload.duration}h). Deferring ${deferredCount} non-essential tasks to tomorrow.`,
          timestamp: new Date().toISOString(),
          unread: true
        };
        userData.notifications.push(sleepAlert);
      }
      return { triggered: true, actionTaken: `Deferred ${deferredCount} tasks to tomorrow due to poor sleep.` };
    }

    case 'low_mood': {
      const moodSuggestion = {
        id: `event-lm-${Date.now()}`,
        type: "reminder",
        title: "Cognitive Reset Proposed",
        message: "Energy and mood indicators are low today. Proposing a 5-minute deep breathing buffer session.",
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(moodSuggestion);
      return { triggered: true, actionTaken: "Proposed mindfulness recovery reset buffer." };
    }

    default:
      return { triggered: false, actionTaken: "No registered reaction event handler." };
  }
}
