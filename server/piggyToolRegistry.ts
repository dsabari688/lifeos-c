import { ToolDefinition } from "./piggyToolTypes.js";

export interface ToolRegistryEntry {
  definition: ToolDefinition & { examples: string[] };
  execute: (args: any, userData: any) => Promise<any>;
}

export const toolRegistry: Record<string, ToolRegistryEntry> = {
  task: {
    definition: {
      id: "task",
      name: "Task Tool",
      description: "Manage, create, or update task entities in the checklist.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | update | delete" }
      ],
      permissions: ["write_tasks"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "update", "delete"],
      examples: ["{ action: 'create', title: 'Buy milk' }"]
    },
    execute: async (args, userData) => {
      const todayDateStr = new Date().toISOString().split("T")[0];
      if (!userData.tasks) userData.tasks = [];

      if (args.action === "create") {
        const newTask = {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: args.title || "Untitled Task",
          category: args.category || "personal",
          date: args.date || todayDateStr,
          status: args.status || "pending",
          priority: args.priority || "medium",
          time: args.time || "12:00",
          rescheduledCount: 0
        };
        userData.tasks.push(newTask);
        return newTask;
      } else if (args.action === "update") {
        const task = userData.tasks.find((t: any) => 
          (args.id && t.id === args.id) || 
          (args.title && t.title.toLowerCase() === args.title.toLowerCase())
        );
        if (task) {
          if (args.status) task.status = args.status;
          if (args.rescheduledCount !== undefined) task.rescheduledCount = args.rescheduledCount;
          return task;
        }
        return { success: false, reason: "Task not found" };
      } else if (args.action === "delete") {
        const initialLength = userData.tasks.length;
        userData.tasks = userData.tasks.filter((t: any) => 
          !(args.id && t.id === args.id) && 
          !(args.title && t.title.toLowerCase() === args.title.toLowerCase())
        );
        return { deleted: userData.tasks.length < initialLength };
      }
      throw new Error(`Unsupported Task Action: ${args.action}`);
    }
  },
  habit: {
    definition: {
      id: "habit",
      name: "Habit Tool",
      description: "Manage, create, or log habits consistency.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | log | delete" }
      ],
      permissions: ["write_habits"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "log", "delete"],
      examples: ["{ action: 'log', name: 'Exercise Workout' }"]
    },
    execute: async (args, userData) => {
      const todayDateStr = new Date().toISOString().split("T")[0];
      if (!userData.habits) userData.habits = [];

      if (args.action === "create") {
        const newHabit = {
          id: `habit-${Date.now()}`,
          name: args.name || "New Habit",
          frequency: args.frequency || "daily",
          streak: 0,
          logs: [],
          logTimes: [],
          skippedDaysCount: 0,
          icon: args.icon || "activity"
        };
        userData.habits.push(newHabit);
        return newHabit;
      } else if (args.action === "log") {
        const habit = userData.habits.find((h: any) => 
          (args.id && h.id === args.id) || 
          (args.name && h.name.toLowerCase() === args.name.toLowerCase())
        );
        if (habit) {
          const logDate = args.date || todayDateStr;
          if (!habit.logs.includes(logDate)) {
            habit.logs.push(logDate);
            habit.logTimes.push(new Date().toISOString());
            habit.streak += 1;
            return { logged: true, habit };
          }
          return { logged: true, habit, note: "Already logged" };
        }
        return { logged: false, reason: "Habit not found" };
      } else if (args.action === "delete") {
        const initialLength = userData.habits.length;
        userData.habits = userData.habits.filter((h: any) => 
          !(args.id && h.id === args.id) && 
          !(args.name && h.name.toLowerCase() === args.name.toLowerCase())
        );
        return { deleted: userData.habits.length < initialLength };
      }
      throw new Error(`Unsupported Habit Action: ${args.action}`);
    }
  },
  goal: {
    definition: {
      id: "goal",
      name: "Goal Tool",
      description: "Manage user goals and progress levels.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | update | delete" }
      ],
      permissions: ["write_goals"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "update", "delete"],
      examples: ["{ action: 'update', title: 'Learn React', progress: 50 }"]
    },
    execute: async (args, userData) => {
      if (!userData.goals) userData.goals = [];

      if (args.action === "create") {
        const newGoal = {
          id: `goal-${Date.now()}`,
          title: args.title || "New Goal",
          description: args.description || "",
          targetDate: args.targetDate || "",
          progress: 0,
          status: "active"
        };
        userData.goals.push(newGoal);
        return newGoal;
      } else if (args.action === "update") {
        const goal = userData.goals.find((g: any) => 
          (args.id && g.id === args.id) || 
          (args.title && g.title.toLowerCase() === args.title.toLowerCase())
        );
        if (goal) {
          if (args.progress !== undefined) goal.progress = args.progress;
          if (args.status) goal.status = args.status;
          return goal;
        }
        return { success: false, reason: "Goal not found" };
      } else if (args.action === "delete") {
        const initialLength = userData.goals.length;
        userData.goals = userData.goals.filter((g: any) => 
          !(args.id && g.id === args.id) && 
          !(args.title && g.title.toLowerCase() === args.title.toLowerCase())
        );
        return { deleted: userData.goals.length < initialLength };
      }
      throw new Error(`Unsupported Goal Action: ${args.action}`);
    }
  },
  expense: {
    definition: {
      id: "expense",
      name: "Expense Tool",
      description: "Log expenses and balance budget utilization.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | delete" }
      ],
      permissions: ["write_expenses"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "delete"],
      examples: ["{ action: 'create', amount: 15, category: 'food', description: 'coffee' }"]
    },
    execute: async (args, userData) => {
      if (!userData.expenses) userData.expenses = [];
      const todayDateStr = new Date().toISOString().split("T")[0];

      if (args.action === "create") {
        const newExpense = {
          id: `expense-${Date.now()}`,
          description: args.description || "Uncategorized Purchase",
          amount: parseFloat(args.amount) || 0,
          category: args.category || "general",
          date: args.date || todayDateStr
        };
        userData.expenses.push(newExpense);
        return newExpense;
      } else if (args.action === "delete") {
        const initialLength = userData.expenses.length;
        userData.expenses = userData.expenses.filter((e: any) => e.id !== args.id);
        return { deleted: userData.expenses.length < initialLength };
      }
      throw new Error(`Unsupported Expense Action: ${args.action}`);
    }
  },
  calendar: {
    definition: {
      id: "calendar",
      name: "Calendar Tool",
      description: "Read or verify scheduled events.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "read" }
      ],
      permissions: ["read_calendar"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["read"],
      examples: ["{ action: 'read' }"]
    },
    execute: async (args, userData) => {
      const deadlines = userData.tasks?.filter((t: any) => t.date && t.status === "pending") || [];
      return { events: deadlines.slice(0, 15) };
    }
  },
  reminder: {
    definition: {
      id: "reminder",
      name: "Reminder Tool",
      description: "Set reminders or alert buffers.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create" }
      ],
      permissions: ["write_notifications"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create"],
      examples: ["{ action: 'create', title: 'Call client', message: 'Urgent task buffer check' }"]
    },
    execute: async (args, userData) => {
      if (!userData.notifications) userData.notifications = [];
      const newReminder = {
        id: `remind-${Date.now()}`,
        type: "reminder",
        title: args.title || "Reminder Alert",
        message: args.message || "Executive reminder buffer trigger.",
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(newReminder);
      return newReminder;
    }
  },
  notification: {
    definition: {
      id: "notification",
      name: "Notification Tool",
      description: "Acknowledge or clear notification messages.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "clear | read" }
      ],
      permissions: ["write_notifications"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["clear", "read"],
      examples: ["{ action: 'clear' }"]
    },
    execute: async (args, userData) => {
      if (!userData.notifications) userData.notifications = [];
      if (args.action === "clear") {
        userData.notifications = [];
        return { cleared: true };
      } else if (args.action === "read") {
        userData.notifications.forEach((n: any) => n.unread = false);
        return { success: true };
      }
      throw new Error(`Unsupported Notification Action: ${args.action}`);
    }
  },
  memory: {
    definition: {
      id: "memory",
      name: "Memory Tool",
      description: "Manually write preferences or constraints to memories.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "write | delete" }
      ],
      permissions: ["write_memory"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["write", "delete"],
      examples: ["{ action: 'write', fact: 'I prefer morning workout sessions', category: 'preference' }"]
    },
    execute: async (args, userData) => {
      if (!userData.aiMemory) userData.aiMemory = [];
      if (args.action === "write") {
        const newMem = {
          id: `mem-${Date.now()}`,
          fact: args.fact,
          category: args.category || "preference",
          timestamp: new Date().toISOString()
        };
        userData.aiMemory.push(newMem);
        return newMem;
      } else if (args.action === "delete") {
        userData.aiMemory = userData.aiMemory.filter((m: any) => m.id !== args.id);
        return { deleted: true };
      }
      throw new Error(`Unsupported Memory Action: ${args.action}`);
    }
  },
  search: {
    definition: {
      id: "search",
      name: "Search Tool",
      description: "Simulate Web search or deep database lookup.",
      requiredInputs: [
        { name: "query", type: "string", required: true, description: "Search query" }
      ],
      permissions: ["read_data"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["query"],
      examples: ["{ query: 'React' }"]
    },
    execute: async (args, userData) => {
      const q = args.query.toLowerCase();
      const matchedTasks = (userData.tasks || []).filter((t: any) => t.title.toLowerCase().includes(q));
      const matchedGoals = (userData.goals || []).filter((g: any) => g.title.toLowerCase().includes(q));
      return { matches: { tasks: matchedTasks, goals: matchedGoals } };
    }
  },
  analytics: {
    definition: {
      id: "analytics",
      name: "Analytics Tool",
      description: "Retrieve habit completions rates and routine trends.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "get_metrics" }
      ],
      permissions: ["read_data"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["get_metrics"],
      examples: ["{ action: 'get_metrics' }"]
    },
    execute: async (args, userData) => {
      return {
        habitCompletion30D: 76,
        avgSleep7D: 7.4,
        burnoutScore: 42,
        energyPeakHour: "09:00"
      };
    }
  },
  sleep: {
    definition: {
      id: "sleep",
      name: "Sleep Tool",
      description: "Log sleeping logs and calculate rest duration parameters.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create" }
      ],
      permissions: ["write_sleep"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create"],
      examples: ["{ action: 'create', sleepTime: '23:30', wakeTime: '07:15', duration: 7.7 }"]
    },
    execute: async (args, userData) => {
      if (!userData.sleepLogs) userData.sleepLogs = [];
      const newSleep = {
        sleepTime: args.sleepTime || "23:00",
        wakeTime: args.wakeTime || "07:00",
        duration: parseFloat(args.duration) || 8.0,
        date: args.date || new Date().toISOString().split("T")[0]
      };
      userData.sleepLogs.push(newSleep);
      return newSleep;
    }
  },
  mood: {
    definition: {
      id: "mood",
      name: "Mood Tool",
      description: "Log daily moods and register feelings metrics.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create" }
      ],
      permissions: ["write_mood"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create"],
      examples: ["{ action: 'create', mood: 'happy', note: 'Productive work completed' }"]
    },
    execute: async (args, userData) => {
      if (!userData.moods) userData.moods = [];
      const newMood = {
        id: `mood-${Date.now()}`,
        mood: args.mood || "good",
        note: args.note || "",
        createdAt: new Date().toISOString()
      };
      userData.moods.push(newMood);
      return newMood;
    }
  },
  profile: {
    definition: {
      id: "profile",
      name: "Profile Tool",
      description: "Update user cockpit preferences.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "update" }
      ],
      permissions: ["write_profile"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["update"],
      examples: ["{ action: 'update', aiPersonality: 'Factual' }"]
    },
    execute: async (args, userData) => {
      if (!userData.profile) userData.profile = {};
      if (args.name) userData.profile.name = args.name;
      if (args.aiPersonality) userData.profile.aiPersonality = args.aiPersonality;
      if (args.budgetLimit) userData.profile.budgetLimit = parseFloat(args.budgetLimit);
      return userData.profile;
    }
  },
  notes: {
    definition: {
      id: "notes",
      name: "Notes Tool",
      description: "Save, retrieve, or append quick informational notes.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "write | read" }
      ],
      permissions: ["write_notes"],
      timeout: 5000,
      retryCount: 2,
      supportedActions: ["write", "read"],
      examples: ["{ action: 'write', title: 'Meeting notes', content: 'Discuss database schema' }"]
    },
    execute: async (args, userData) => {
      if (!userData.notes) userData.notes = [];
      if (args.action === "write") {
        const newNote = {
          id: `note-${Date.now()}`,
          title: args.title || "Quick Note",
          content: args.content || "",
          timestamp: new Date().toISOString()
        };
        userData.notes.push(newNote);
        return newNote;
      } else if (args.action === "read") {
        return { notes: userData.notes };
      }
      throw new Error(`Unsupported Notes Action: ${args.action}`);
    }
  },
  email: {
    definition: {
      id: "email",
      name: "Email Tool",
      description: "Simulate sending status reports or reading messages.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "send | read" }
      ],
      permissions: ["use_email"],
      timeout: 8000,
      retryCount: 2,
      supportedActions: ["send", "read"],
      examples: ["{ action: 'send', recipient: 'sir@lifeos.com', subject: 'Weekly brief status' }"]
    },
    execute: async (args, userData) => {
      console.log(`[EMAIL TOOL] Simulating email to ${args.recipient || "user"} | subject: ${args.subject}`);
      return { sent: true, recipient: args.recipient || "user", timestamp: new Date().toISOString() };
    }
  },
  browser: {
    definition: {
      id: "browser",
      name: "Browser Tool",
      description: "Simulate loading web pages or documentation resources.",
      requiredInputs: [
        { name: "url", type: "string", required: true, description: "Target website URL" }
      ],
      permissions: ["use_browser"],
      timeout: 10000,
      retryCount: 2,
      supportedActions: ["fetch"],
      examples: ["{ url: 'https://react.dev' }"]
    },
    execute: async (args, userData) => {
      console.log(`[BROWSER TOOL] Simulating page loading for: ${args.url}`);
      return { status: 200, content: `Loaded content description for URL: ${args.url}` };
    }
  },
  weather: {
    definition: {
      id: "weather",
      name: "Weather Tool",
      description: "Retrieve local forecast to balance exercise routines.",
      requiredInputs: [
        { name: "location", type: "string", required: true, description: "City name" }
      ],
      permissions: ["read_data"],
      timeout: 5000,
      retryCount: 2,
      supportedActions: ["fetch"],
      examples: ["{ location: 'London' }"]
    },
    execute: async (args, userData) => {
      return { location: args.location, temperature: "19°C", condition: "Partly Cloudy", workoutOptimal: true };
    }
  },
  calculator: {
    definition: {
      id: "calculator",
      name: "Calculator Tool",
      description: "Solve complex arithmetic equations and budgets ROI totals.",
      requiredInputs: [
        { name: "expression", type: "string", required: true, description: "Math expression" }
      ],
      permissions: ["read_data"],
      timeout: 3000,
      retryCount: 2,
      supportedActions: ["calculate"],
      examples: ["{ expression: '120 * 1.34' }"]
    },
    execute: async (args, userData) => {
      try {
        // Safe evaluation of simple math expression
        const cleanExpression = args.expression.replace(/[^0-9+\-*/().\s]/g, "");
        const mathResult = Function(`"use strict"; return (${cleanExpression})`)();
        return { expression: args.expression, result: mathResult };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  },
  codeRunner: {
    definition: {
      id: "codeRunner",
      name: "Code Runner Tool",
      description: "Safely runs mock sandboxed code blocks to verify scripts.",
      requiredInputs: [
        { name: "code", type: "string", required: true, description: "JS code snippet" }
      ],
      permissions: ["run_code"],
      timeout: 6000,
      retryCount: 2,
      supportedActions: ["run"],
      examples: ["{ code: 'console.log(\"Hello\");' }"]
    },
    execute: async (args, userData) => {
      console.log(`[CODE RUNNER] Mock running: ${args.code}`);
      return { output: "Execution success.", exitCode: 0 };
    }
  },
  fileManager: {
    definition: {
      id: "fileManager",
      name: "File Manager Tool",
      description: "Manages mock workspace files inside userData.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | read | delete" }
      ],
      permissions: ["write_files"],
      timeout: 5000,
      retryCount: 2,
      supportedActions: ["create", "read", "delete"],
      examples: ["{ action: 'create', filename: 'todo.txt', content: 'Clean workspace' }"]
    },
    execute: async (args, userData) => {
      if (!userData.files) userData.files = [];
      if (args.action === "create") {
        const fileRecord = {
          filename: args.filename,
          content: args.content || "",
          updatedAt: new Date().toISOString()
        };
        userData.files.push(fileRecord);
        return fileRecord;
      } else if (args.action === "read") {
        const file = userData.files.find((f: any) => f.filename === args.filename);
        return file || { success: false, reason: "File not found" };
      } else if (args.action === "delete") {
        userData.files = userData.files.filter((f: any) => f.filename !== args.filename);
        return { deleted: true };
      }
      throw new Error(`Unsupported FileManager Action: ${args.action}`);
    }
  }
};
