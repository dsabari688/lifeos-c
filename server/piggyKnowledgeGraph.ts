export interface GraphNode {
  id: string;
  type: 'goal' | 'habit' | 'task' | 'memory' | 'deadline' | 'expense' | 'sleep' | 'mood' | 'focus';
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Maps connections between user entities, telemetry logs, and cognitive memories.
 */
export function buildUserKnowledgeGraph(userData: any): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const tasks = userData.tasks || [];
  const habits = userData.habits || [];
  const goals = userData.goals || [];
  const expenses = userData.expenses || [];
  const sleepLogs = userData.sleepLogs || [];
  const moods = userData.moods || [];
  const aiMemory = userData.aiMemory || [];

  // 1. Add Goals Nodes
  goals.forEach((g: any) => {
    nodes.push({ id: g.id, type: 'goal', label: g.title });
  });

  // 2. Add Habits Nodes & Connect to Goals if title matches
  habits.forEach((h: any) => {
    nodes.push({ id: h.id, type: 'habit', label: h.name });
    
    // Connect workout habit to physical goals, etc.
    const isExercise = h.name.toLowerCase().includes("exercise") || h.name.toLowerCase().includes("workout");
    if (isExercise) {
      const targetGoal = goals.find((g: any) => 
        g.title.toLowerCase().includes("fit") || 
        g.title.toLowerCase().includes("weight") || 
        g.title.toLowerCase().includes("health")
      );
      if (targetGoal) {
        edges.push({
          id: `edge-${h.id}-${targetGoal.id}`,
          source: h.id,
          target: targetGoal.id,
          relationship: "supports_goal"
        });
      }
    }
  });

  // 3. Add Tasks Nodes & Connect to Goals/Habits
  tasks.slice(-15).forEach((t: any) => {
    nodes.push({ id: t.id, type: 'task', label: t.title });

    // Connect to Goals if task title matches goal keyword
    goals.forEach((g: any) => {
      const words = g.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
      if (words.some((w: string) => t.title.toLowerCase().includes(w))) {
        edges.push({
          id: `edge-${t.id}-${g.id}`,
          source: t.id,
          target: g.id,
          relationship: "milestone_for"
        });
      }
    });
  });

  // 4. Add Expense Nodes & Check Limits
  expenses.slice(-5).forEach((e: any) => {
    nodes.push({ id: e.id, type: 'expense', label: `${e.description} ($${e.amount})` });
  });

  // 5. Connect sleep and mood correlations
  if (sleepLogs.length > 0 && moods.length > 0) {
    const lastSleep = sleepLogs[sleepLogs.length - 1];
    const lastMood = moods[moods.length - 1];
    
    const sleepNodeId = `sleep-${lastSleep.date}`;
    const moodNodeId = `mood-${lastMood.id}`;

    nodes.push({ id: sleepNodeId, type: 'sleep', label: `${lastSleep.duration}h Sleep` });
    nodes.push({ id: moodNodeId, type: 'mood', label: `Mood: ${lastMood.mood}` });

    if (lastSleep.duration < 6.5 && (lastMood.mood === "stressed" || lastMood.mood === "😞")) {
      edges.push({
        id: `edge-${sleepNodeId}-${moodNodeId}`,
        source: sleepNodeId,
        target: moodNodeId,
        relationship: "depresses_mood"
      });
    }
  }

  // 6. Add Memories Nodes
  aiMemory.slice(-5).forEach((m: any) => {
    nodes.push({ id: m.id, type: 'memory', label: m.fact });
  });

  return {
    nodes,
    edges
  };
}
