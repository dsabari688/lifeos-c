export interface LongTermProject {
  id: string;
  title: string;
  goalId: string;
  milestones: { id: string; name: string; completed: boolean }[];
  status: 'active' | 'completed' | 'on_hold';
}

/**
 * Initializes and updates user projects linked to strategic goals.
 */
export function updateLongTermGoals(userData: any): void {
  if (!userData.projects) {
    userData.projects = [];
  }

  const goals = userData.goals || [];
  const tasks = userData.tasks || [];

  goals.forEach((goal: any) => {
    let project = userData.projects.find((p: any) => p.goalId === goal.id);

    if (!project) {
      // Create project node linked to goal
      project = {
        id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `${goal.title} Project Roadmap`,
        goalId: goal.id,
        milestones: [
          { id: `ms-1-${Date.now()}`, name: "Setup Phase", completed: false },
          { id: `ms-2-${Date.now()}`, name: "Development Milestone", completed: false },
          { id: `ms-3-${Date.now()}`, name: "Final Release Verification", completed: false }
        ],
        status: goal.status === "completed" ? "completed" : "active"
      };
      userData.projects.push(project);
    }

    // Update project status if goal is completed
    if (goal.status === "completed") {
      project.status = "completed";
      project.milestones.forEach((m: any) => m.completed = true);
    }
  });
}
