import { create } from "zustand";
import { FullOSData, Task, Habit, Goal, Expense, ChatMessage, SystemNotification } from "../types";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onUndo?: () => void;
}

export interface UndoAction {
  description: string;
  execute: () => Promise<void>;
}

export interface StoreState {
  token: string | null;
  isLoggedIn: boolean;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  osData: FullOSData | null;
  isUpdatingDb: boolean;
  activeView: "dashboard" | "missions" | "habits" | "goals" | "analytics" | "ai-core" | "focus-timer" | "settings" | "tracknet" | "expenses" | "ai-dashboard";
  isSidebarOpen: boolean;
  notificationsOpen: boolean;
  toasts: ToastMessage[];
  loginUsername: string;
  loginEmail: string;
  
  selectedTaskId: string | null;
  selectedTaskTitle: string | null;
  selectedHabitId: string | null;
  selectedHabitName: string | null;
  
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  isDailyReviewOpen: boolean;
  isPlannerModalOpen: boolean;
  plannerPlan: any | null;
  isWeeklyReviewOpen: boolean;
  isOffline: boolean;
  
  undoStack: UndoAction[];
  
  // Actions
  setToken: (token: string | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setCurrentUser: (user: StoreState["currentUser"]) => void;
  setActiveView: (view: StoreState["activeView"]) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setNotificationsOpen: (isOpen: boolean) => void;
  setLoginUsername: (name: string) => void;
  setLoginEmail: (email: string) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSelectedTaskTitle: (title: string | null) => void;
  setSelectedHabitId: (id: string | null) => void;
  setSelectedHabitName: (name: string | null) => void;
  setIsTaskModalOpen: (isOpen: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setIsDailyReviewOpen: (isOpen: boolean) => void;
  setIsPlannerModalOpen: (isOpen: boolean) => void;
  setIsWeeklyReviewOpen: (isOpen: boolean) => void;
  setPlannerPlan: (plan: any | null) => void;
  setIsOffline: (isOffline: boolean) => void;
  
  showToast: (message: string, type?: ToastMessage["type"], onUndo?: () => void) => void;
  dismissToast: (id: string) => void;
  
  // API Sync helpers
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  hydrateSystemData: () => Promise<void>;
  
  // Tasks Actions
  toggleTask: (taskId: string) => Promise<void>;
  saveTask: (taskData: {
    id?: string;
    title: string;
    category: Task["category"];
    date: string;
    time: string;
    recurType: Task["recurType"];
    status: Task["status"];
    rescheduledCount?: number;
  }) => Promise<void>;
  rescheduleTask: (taskId: string, newDate: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  // Habits Actions
  toggleHabit: (habitId: string) => Promise<void>;
  addHabit: (name: string, frequency: Habit["frequency"], icon?: string) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  
  // Goals Actions
  addGoal: (title: string, targetDate: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateGoalProgress: (id: string, progress: number) => Promise<void>;
  
  // Profile & System Actions
  saveProfile: (profileData: {
    name: string;
    email: string;
    budgetLimit: number;
    aiPersonality: string;
    dailyPlanningReminderTime: string;
    dailyReviewTime: string;
    listeningMode: string;
    proactiveModeEnabled: boolean;
    maxProactiveNudges: number;
  }) => Promise<void>;
  clearNotifications: () => Promise<void>;
  sendChatMessage: (message: string, activeContext: any) => Promise<any>;
  addExpense: (expenseData: Omit<Expense, "id">) => Promise<void>;
  updateBudget: (category: string, limit: number) => Promise<void>;
  explainExpense: (expenseId: string, explanation: string) => Promise<void>;
  simulatePlanTomorrow: () => Promise<void>;
  
  // Undo support
  pushUndo: (description: string, execute: () => Promise<void>) => void;
  triggerUndo: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => {
  // Setup offline listeners
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      set({ isOffline: false });
      get().showToast("Uplink restored. System online.", "success");
      get().hydrateSystemData();
    });
    window.addEventListener("offline", () => {
      set({ isOffline: true });
      get().showToast("Uplink severed. Running in offline mode.", "warning");
    });
  }

  return {
    token: localStorage.getItem("token") || localStorage.getItem("lifeos_token"),
    isLoggedIn: !!(localStorage.getItem("token") || localStorage.getItem("lifeos_token")),
    currentUser: null,
    osData: null,
    isUpdatingDb: false,
    activeView: "dashboard",
    isSidebarOpen: true,
    notificationsOpen: false,
    toasts: [],
    loginUsername: "Sabarinathan",
    loginEmail: "dsabari688@gmail.com",
    
    selectedTaskId: null,
    selectedTaskTitle: null,
    selectedHabitId: null,
    selectedHabitName: null,
    
    isTaskModalOpen: false,
    editingTask: null,
    isDailyReviewOpen: false,
    isPlannerModalOpen: false,
    plannerPlan: null,
    isWeeklyReviewOpen: false,
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    
    undoStack: [],

    setToken: (token) => {
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("lifeos_token", token);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("lifeos_token");
      }
      set({ token, isLoggedIn: !!token });
    },
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
    setCurrentUser: (currentUser) => set({ currentUser }),
    setActiveView: (activeView) => set({ activeView }),
    setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
    setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
    setLoginUsername: (loginUsername) => set({ loginUsername }),
    setLoginEmail: (loginEmail) => set({ loginEmail }),
    setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
    setSelectedTaskTitle: (selectedTaskTitle) => set({ selectedTaskTitle }),
    setSelectedHabitId: (selectedHabitId) => set({ selectedHabitId }),
    setSelectedHabitName: (selectedHabitName) => set({ selectedHabitName }),
    setIsTaskModalOpen: (isTaskModalOpen) => set({ isTaskModalOpen }),
    setEditingTask: (editingTask) => set({ editingTask }),
    setIsDailyReviewOpen: (isDailyReviewOpen) => set({ isDailyReviewOpen }),
    setIsPlannerModalOpen: (isPlannerModalOpen) => set({ isPlannerModalOpen }),
    setIsWeeklyReviewOpen: (isWeeklyReviewOpen) => set({ isWeeklyReviewOpen }),
    setPlannerPlan: (plannerPlan) => set({ plannerPlan }),
    setIsOffline: (isOffline) => set({ isOffline }),

    showToast: (message, type = "info", onUndo) => {
      const id = Math.random().toString(36).substring(2, 9);
      set((state) => ({
        toasts: [...state.toasts, { id, message, type, onUndo }],
      }));
      setTimeout(() => {
        get().dismissToast(id);
      }, 5000);
    },
    dismissToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    authenticatedFetch: async (url, options = {}) => {
      const { token } = get();
      const headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      
      try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
          // Token expired or invalid
          get().setToken(null);
          get().showToast("Session expired. Please log in again.", "error");
        }
        return response;
      } catch (error) {
        set({ isOffline: true });
        throw error;
      }
    },

    hydrateSystemData: async () => {
      if (!get().token) return;
      try {
        const res = await get().authenticatedFetch("/api/data");
        if (res.ok) {
          const payload: FullOSData = await res.json();
          set({ osData: payload });
          if (payload.profile) {
            set({
              loginUsername: payload.profile.name,
              loginEmail: payload.profile.email,
            });
          }
        }
      } catch (err) {
        console.error("Failure hydrating LifeOS state:", err);
      }
    },

    // Pushes an undo action onto the stack (limit 15 entries)
    pushUndo: (description, execute) => {
      set((state) => ({
        undoStack: [{ description, execute }, ...state.undoStack].slice(0, 15),
      }));
    },

    // Triggers execution of the top undo item
    triggerUndo: async () => {
      const { undoStack } = get();
      if (undoStack.length === 0) return;
      
      const [top, ...rest] = undoStack;
      set({ undoStack: rest, isUpdatingDb: true });
      
      try {
        await top.execute();
        get().showToast(`Undone: ${top.description}`, "success");
      } catch (err: any) {
        get().showToast(`Failed to undo action: ${err.message}`, "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    // Task Actions
    toggleTask: async (taskId) => {
      const task = get().osData?.tasks.find((t) => t.id === taskId);
      if (!task) return;
      
      const newStatus: Task["status"] = task.status === "completed" ? "pending" : "completed";
      
      // Save revert path
      get().pushUndo(`Task toggle completion`, async () => {
        await get().saveTask({ ...task, status: task.status });
      });

      // Optimistic Update
      set((state) => {
        if (!state.osData) return state;
        return {
          osData: {
            ...state.osData,
            tasks: state.osData.tasks.map((t) =>
              t.id === taskId ? { ...t, status: newStatus } : t
            ),
          },
        };
      });

      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          get().showToast(`Task status adjusted.`, "success", () => get().triggerUndo());
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Network failure. Reverted.", "error");
        get().hydrateSystemData();
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    saveTask: async (taskData) => {
      const isNew = !taskData.id;
      const originalTask = taskData.id ? get().osData?.tasks.find((t) => t.id === taskData.id) : null;
      
      // Setup undo action
      if (!isNew && originalTask) {
        get().pushUndo(`Edit Task "${taskData.title}"`, async () => {
          await get().saveTask(originalTask);
        });
      }

      set({ isUpdatingDb: true });
      try {
        const url = isNew ? "/api/tasks" : `/api/tasks/${taskData.id}`;
        const method = isNew ? "POST" : "PUT";
        
        const res = await get().authenticatedFetch(url, {
          method,
          body: JSON.stringify(taskData),
        });
        if (res.ok) {
          get().showToast(
            isNew ? `New tactical mission logged.` : `Tactical mission parameters modified.`,
            "success",
            !isNew ? () => get().triggerUndo() : undefined
          );
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Mission log failure.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    rescheduleTask: async (taskId, newDate) => {
      const task = get().osData?.tasks.find((t) => t.id === taskId);
      if (!task) return;

      get().pushUndo(`Reschedule Task "${task.title}"`, async () => {
        await get().saveTask(task);
      });

      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/tasks/${taskId}/reschedule`, {
          method: "POST",
          body: JSON.stringify({ date: newDate }),
        });
        if (res.ok) {
          get().showToast("Mission rescheduled.", "success", () => get().triggerUndo());
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Rescheduling failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    deleteTask: async (taskId) => {
      const task = get().osData?.tasks.find((t) => t.id === taskId);
      if (!task) return;

      get().pushUndo(`Delete Task "${task.title}"`, async () => {
        await get().saveTask(task);
      });

      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          get().showToast("Task decommissioned.", "warning", () => get().triggerUndo());
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Decommissioning failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    // Habits Actions
    toggleHabit: async (habitId) => {
      const habit = get().osData?.habits.find((h) => h.id === habitId);
      if (!habit) return;

      get().pushUndo(`Toggle Habit "${habit.name}"`, async () => {
        await get().toggleHabit(habitId);
      });

      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/habits/${habitId}/toggle`, {
          method: "POST",
        });
        if (res.ok) {
          get().showToast("Habit logged successfully.", "success", () => get().triggerUndo());
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Habit log update failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    addHabit: async (name, frequency, icon) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/habits", {
          method: "POST",
          body: JSON.stringify({ name, frequency, icon: icon || "book-open" }),
        });
        if (res.ok) {
          get().showToast("Routine structure installed.", "success");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Routine installation failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    deleteHabit: async (habitId) => {
      const habit = get().osData?.habits.find((h) => h.id === habitId);
      if (!habit) return;

      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/habits/${habitId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          get().showToast("Habit routine structure removed.", "warning");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Habit removal failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    // Goals Actions
    addGoal: async (title, targetDate) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/goals", {
          method: "POST",
          body: JSON.stringify({ title, targetDate, progress: 0, status: "active" }),
        });
        if (res.ok) {
          get().showToast("Strategic milestone goal instituted.", "success");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Goal institution failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    deleteGoal: async (id) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/goals/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          get().showToast("Milestone decommissioned.", "warning");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Milestone decommission failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    updateGoalProgress: async (id, progress) => {
      const goal = get().osData?.goals.find((g) => g.id === id);
      if (!goal) return;

      get().pushUndo(`Update Goal "${goal.title}" progress to ${goal.progress}%`, async () => {
        await get().updateGoalProgress(id, goal.progress);
      });

      // Optimistic Update
      set((state) => {
        if (!state.osData) return state;
        return {
          osData: {
            ...state.osData,
            goals: state.osData.goals.map((g) =>
              g.id === id ? { ...g, progress } : g
            ),
          },
        };
      });

      try {
        const res = await get().authenticatedFetch(`/api/goals/${id}`, {
          method: "PUT",
          body: JSON.stringify({ progress }),
        });
        if (res.ok) {
          get().showToast("Strategic progression recorded.", "success", () => get().triggerUndo());
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Strategic update failed.", "error");
        get().hydrateSystemData();
      }
    },

    // Profile & Financials
    saveProfile: async (profileData) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/profile", {
          method: "POST",
          body: JSON.stringify(profileData),
        });
        if (res.ok) {
          get().showToast("System configurations optimized.", "success");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Configuration sync failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    clearNotifications: async () => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/notifications/clear", {
          method: "POST",
        });
        if (res.ok) {
          get().showToast("Telemetry warnings cleared.", "info");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Clear command failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    sendChatMessage: async (message, activeContext) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/jarvis/chat", {
          method: "POST",
          body: JSON.stringify({ message, activeContext }),
        });
        const data = await res.json();
        if (data.success) {
          await get().hydrateSystemData();
          return data;
        }
        return null;
      } catch (err) {
        get().showToast("Chat pipeline offline.", "error");
        return null;
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    addExpense: async (expenseData) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(expenseData),
        });
        if (res.ok) {
          get().showToast("Financial deduction logged.", "success");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Expense log failure.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    updateBudget: async (category, limit) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/budgets", {
          method: "POST",
          body: JSON.stringify({ category, limit }),
        });
        if (res.ok) {
          get().showToast("Budget allocation updated.", "success");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Allocation failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    explainExpense: async (expenseId, explanation) => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch(`/api/expenses/${expenseId}/explain`, {
          method: "POST",
          body: JSON.stringify({ explanation }),
        });
        if (res.ok) {
          get().showToast("Self-reflection logged.", "success");
          await get().hydrateSystemData();
        }
      } catch (err) {
        get().showToast("Reflection sync failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    simulatePlanTomorrow: async () => {
      set({ isUpdatingDb: true });
      try {
        const res = await get().authenticatedFetch("/api/smart-planner", {
          method: "POST",
          body: JSON.stringify({
            workHours: "9 AM to 5 PM",
            sleepHours: "8 hours",
            exercisePreference: "Morning cardio",
            personalPriorities: get().osData?.goals.map(g => g.title).join(", ") || "TypeScript Coding",
          }),
        });
        const data = await res.json();
        if (data.success) {
          set({ plannerPlan: data.plan });
          get().showToast("Optimal daily path compiled.", "success");
        }
      } catch (err) {
        get().showToast("Planner compilation failed.", "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },
  };
});
