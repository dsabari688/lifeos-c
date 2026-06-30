import React, { useState, useEffect } from "react";
import { 
  Menu, X, Bell, User, LayoutDashboard, Calendar, RefreshCw, Target, 
  LineChart, Cpu, Clock, Settings, ShieldAlert, LogOut, CheckCircle, 
  Terminal, Sparkles, LogIn, ChevronRight, Zap, Info, Wallet
} from "lucide-react";

// Modular page imports
import { DashboardView } from "./components/DashboardView";
import { AIDashboardView } from "./components/AIDashboardView";
import { MissionsView } from "./components/MissionsView";
import { TrackNetView } from "./components/TrackNetView";
import { Scan } from "lucide-react";
import { HabitsView } from "./components/HabitsView";
import { GoalsView } from "./components/GoalsView";
import { AnalyticsView } from "./components/AnalyticsView";
import { PiggyChatView } from "./components/PiggyChatView";
import { FocusModeView } from "./components/FocusModeView";
import { SettingsView } from "./components/SettingsView";
import { ExpensesView } from "./components/ExpensesView";

// Modal and sidebar drawer helpers
import { TaskModal } from "./components/TaskModal";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { DailyReviewModal } from "./components/DailyReviewModal";
import { SmartPlannerModal } from "./components/SmartPlannerModal";
import { WeeklyReviewModal } from "./components/WeeklyReviewModal";
import { LoginView } from "./components/LoginView";

// Redundant type models
import { FullOSData, Task, Habit, ChatMessage, SystemNotification, TaskPriority } from "./types";

type ViewState = "dashboard" | "missions" | "habits" | "goals" | "analytics" | "ai-core" | "focus-timer" | "settings" | "tracknet" | "expenses" | "ai-dashboard";
export default function App() {
  // Navigation & Frame layouts 
  const [activeView, setActiveView] = useState<ViewState>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  

  // Splash Screen & Login Multi-stage indicators
  const [splashStep, setSplashStep] = useState(0);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Authentication token & logged-in profile context
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      "Authorization": `Bearer ${token}`
    };
    return fetch(url, { ...options, headers });
  };

  // Custom Login profile identifiers
  const [loginUsername, setLoginUsername] = useState("Sabarinathan");
  const [loginEmail, setLoginEmail] = useState("dsabari688@gmail.com");

  // Global Hydration state
  const [osData, setOsData] = useState<FullOSData | null>(null);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  // J.A.R.V.I.S Active Segment Focus context bounds
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedHabitName, setSelectedHabitName] = useState<string | null>(null);

  // Task Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Daily Review Dialog triggers
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState(false);

  // Smart Planner states
  const [plannerPlan, setPlannerPlan] = useState<any>(null);
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);

  // Weekly Review states
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);

  // 1. Splash Screen sequence interval
  const splashMessages = [
    "Calibrating system parameters...",
    "Synchronizing diagnostic telemetry logs...",
    "Hydrating local command matrices...",
    "Rebalancing financial allocations threshold...",
    "Piggy online. Uplink success, Sir."
  ];

  useEffect(() => {
    if (!isSplashDone) {
      const interval = setInterval(() => {
        setSplashStep((prev) => {
          if (prev >= splashMessages.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              setIsSplashDone(true);
            }, 600);
            return prev;
          }
          return prev + 1;
        });
      }, 700);

      return () => clearInterval(interval);
    }
  }, [isSplashDone]);

  // 2. Fetch full system state on mount or login
  const hydrateSystemData = async () => {
    if (!token) return;
    try {
      const res = await authenticatedFetch("/api/data");
      if (res.ok) {
        const payload: FullOSData = await res.json();
        setOsData(payload);
        
        // Populate names from seed to sync settings input text
        if (payload.profile) {
          setLoginUsername(payload.profile.name);
          setLoginEmail(payload.profile.email);
        }
      }
    } catch (err) {
      console.error("Failure hydrating LifeOS state:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn && token) {
      hydrateSystemData();
    }
  }, [isLoggedIn, token]);

  // 5-minute polling interval for system telemetry and warning notifications
  useEffect(() => {
    if (!token || !isLoggedIn) return;
    const intervalId = setInterval(() => {
      hydrateSystemData();
    }, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [token, isLoggedIn]);

  // Backbeat daemon monitoring clock parameters to trigger the Nightly Cognitive Review
  useEffect(() => {
    if (!osData || !isLoggedIn) return;
    
    const checkInterval = setInterval(() => {
      const now = new Date();
      const HH = now.getHours().toString().padStart(2, "0");
      const MM = now.getMinutes().toString().padStart(2, "0");
      const currentStamp = `${HH}:${MM}`;
      
      const targetReviewTime = osData.profile.dailyReviewTime || "21:30";
      const todayStr = now.toISOString().split("T")[0];
      const hasFiredReview = sessionStorage.getItem(`review_fired_${todayStr}`);
      
      if (currentStamp === targetReviewTime && !hasFiredReview) {
        sessionStorage.setItem(`review_fired_${todayStr}`, "true");
        setIsDailyReviewOpen(true);
        try {
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const speech = new SpeechSynthesisUtterance("Excuse me, Sir. It is 9:30 PM. Daily review parameters are ready for compilation.");
            speech.pitch = 0.95;
            speech.rate = 1.05;
            window.speechSynthesis.speak(speech);
          }
        } catch (e) {
          console.warn("Speech Synthesis failed", e);
        }
      }
    }, 45000); // Check every 45 seconds

    return () => clearInterval(checkInterval);
  }, [osData, isLoggedIn]);

  // --- ACTIONS WITH BACKEND API ---

  // Tasks updates
  const handleToggleTask = async (taskId: string) => {
    if (!osData) return;
    const task = osData.tasks.find(t => t.id === taskId);
    if (!task) return;

    const nextStatus = task.status === "completed" ? "pending" : "completed";
    setIsUpdatingDb(true);

    try {
      const res = await authenticatedFetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Error toggling task block:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleSaveTask = async (taskData: {
    title: string;
    category: TaskPriority;
    date: string;
    time: string;
    recurType: 'none' | 'daily' | 'weekly';
  }) => {
    setIsUpdatingDb(true);
    try {
      let url = "/api/tasks";
      let method = "POST";

      if (editingTask) {
        url = `/api/tasks/${editingTask.id}`;
        method = "PUT";
      }

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });

      if (res.ok) {
        await hydrateSystemData();
        setEditingTask(null);
      }
    } catch (err) {
      console.error("Save Task Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleEditTaskTrigger = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleRescheduleTaskSubmit = async (taskId: string, newDate: string) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending",
          newDate: newDate,
          rescheduled: true
        })
      });
      if (res.ok) {
        await hydrateSystemData();
        alert("Sir, tactical deferral processed. Anti-abandonment logged.");
      }
    } catch (err) {
      console.error("Reschedule Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to decommission this strategic task module?")) return;
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Delete Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Habits updating
  const handleToggleHabit = async (habitId: string) => {
    setIsUpdatingDb(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await authenticatedFetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr })
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Habit Toggle Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleAddHabit = async (name: string, frequency: "daily" | "weekly", icon?: string) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, frequency, icon })
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Add Habit Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm("Decommission this conformance habit structure?")) return;
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Delete habit Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

    // Goals logic
  const handleAddGoal = async (title: string, targetDate: string) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, targetDate, progress: 0, status: "active" })
      });
      if (res.ok) await hydrateSystemData();
    } catch (err) {
      console.error("Goal Add Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleUpdateGoalProgress = async (id: string, progress: number) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress })
      });
      if (res.ok) await hydrateSystemData();
    } catch (err) {
      console.error("Goal Update Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Decommission this strategic goal?")) return;
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch(`/api/goals/${id}`, { method: "DELETE" });
      if (res.ok) await hydrateSystemData();
    } catch (err) {
      console.error("Goal Delete Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Profile saves
  const handleSaveProfile = async (profileData: {
    name: string;
    email: string;
    aiPersonality: 'Calm' | 'Energetic' | 'Cynical' | 'Logical';
  }) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Profile Save Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Notifications clear
  const handleClearNotifications = async () => {
    try {
      const res = await authenticatedFetch("/api/notifications/clear-unread", { method: "POST" });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Notification Clear Err:", err);
    }
  };

  // chatbot transmission
  const handleSendChatMessage = async (text: string) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/jarvis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          activeContext: {
            selectedTaskId,
            selectedTaskTitle,
            selectedHabitId,
            selectedHabitName
          }
        })
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Chat Post Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Expenses handlers
  const handleAddExpense = async (expenseData: {
    amount: number;
    category: string;
    note: string;
    date: string;
    isImpulsive?: boolean;
  }) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData)
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Add Expense Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleUpdateBudget = async (category: string, limit: number) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit })
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Update Budget Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleExplainExpense = async (expenseId: string, explanation: string) => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch(`/api/expenses/${expenseId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explanation })
      });
      if (res.ok) {
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Explain Expense Err:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Plan tomorrow quick action simulation
  const handleSimulatePlanTomorrow = async () => {
    setIsUpdatingDb(true);
    try {
      const res = await authenticatedFetch("/api/smart-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workHours: "09:00 to 17:30",
          sleepHours: "8 hours",
          personalPriorities: "Deep space design, clean files",
          exercisePreference: "Routine cardio"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.plan) {
          setPlannerPlan(data.plan);
          setIsPlannerModalOpen(true);
        } else {
          alert("Plan Tomorrow synchronized, Sir! Check your J.A.R.V.I.S briefing details.");
        }
        await hydrateSystemData();
      }
    } catch (err) {
      console.error("Planner action error:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Render Splash Loading Page
  if (!isSplashDone) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full space-y-6 relative">
          
          {/* Pulse ring visual */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-amber-500/[0.02] border border-amber-500/[0.04] animate-ping duration-3000 pointer-events-none" />

          {/* Breathing Orb */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-jarvis-breath mx-auto flex items-center justify-center">
            <Cpu className="w-10 h-10 text-slate-900" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-3xl tracking-widest text-amber-500 uppercase glow-text-amber">
              LIFE OS
            </h1>
            <p className="text-slate-500 font-mono text-[10px] tracking-widest">PERSONAL COMMAND COCKPIT</p>
          </div>

          {/* Dynamic loading messages sequence */}
          <div className="pt-6 font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{splashMessages[splashStep]}</span>
            </div>
            
            {/* Visual Progress percentage */}
            <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-300 rounded-full" 
                style={{ width: `${((splashStep + 1) / splashMessages.length) * 100}%` }}
              />
            </div>
          </div>

          <p className="border-t border-white/5 pt-4 text-[9px] text-slate-600 font-mono tracking-wider">
            PREVIEW ENGINE COGNITION BUILD VER 4.2.1
          </p>
        </div>
      </div>
    );
  }

  // Render Login authentication screen
  if (!isLoggedIn || !token) {
    return (
      <LoginView
        onLoginSuccess={(authToken, user) => {
          setToken(authToken);
          setCurrentUser(user);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  // Ensure data exists before compiling view assemblies
  if (!osData) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center text-slate-400 font-mono text-xs">
        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping mr-2" />
        Synchronizing databases files...
      </div>
    );
  }

  const unreadCount = osData.notifications.filter(n => !n.read).length;
  
  // Dynamically calculate the real productivity score for the Daily Review
  const todayStrForScore = new Date().toISOString().split("T")[0];
  const taskScore = osData.tasks.length ? (osData.tasks.filter(t => t.status === "completed").length / osData.tasks.length) * 60 : 0;
  const habitScore = osData.habits.length ? (osData.habits.filter(h => h.logs.includes(todayStrForScore)).length / osData.habits.length) * 40 : 0;
  const realProductivityScore = Math.round(taskScore + habitScore);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-650 flex font-sans">
      
      {/* Sidebar - Fixed Left Rail (220px on Desktop) */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 z-30 ${
          isSidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand top area */}
          <div className="h-16 border-b border-white/5 flex items-center justify-between px-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-jarvis-breath flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              </div>
              {isSidebarOpen && (
                <span className="font-display font-black text-sm tracking-widest text-amber-500 uppercase shrink-0 glow-text-amber">
                  Life OS
                </span>
              )}
            </div>
            
            {/* Collapse toggle (only desktop triggers) */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
{/* Nav List links */}
          <nav className="p-3 space-y-1 font-display">
            {[
              { key: "dashboard", label: "Mission Control", icon: LayoutDashboard },
              { key: "ai-dashboard", label: "AI Coach Dashboard", icon: Sparkles },
              { key: "missions", label: "Tactical Missions", icon: Calendar },
              { key: "habits", label: "Habit Conformance", icon: RefreshCw },
              { key: "goals", label: "Strategic Vault", icon: Target },
              { key: "analytics", label: "Analytics Cockpit", icon: LineChart },
              { key: "expenses", label: "Financial Cockpit", icon: Wallet },
              { key: "ai-core", label: "AI Core Hub", icon: Cpu },
              { key: "focus-timer", label: "Focus Chronometer", icon: Clock },
              { key: "settings", label: "Systems Settings", icon: Settings },
            ].map((menu) => {
              const IconComp = menu.icon;
              const isActive = activeView === menu.key;
              return (
                <button
                  key={menu.key}
                  onClick={() => setActiveView(menu.key as ViewState)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all text-xs font-bold uppercase tracking-wider relative group cursor-pointer ${
                    isActive 
                      ? "bg-amber-500 text-slate-950 font-black scale-[1.01]" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <IconComp className="w-4.5 h-4.5 shrink-0" />
                  {isSidebarOpen && <span className="truncate">{menu.label}</span>}
                  
                  {!isSidebarOpen && (
                    <span className="absolute left-14 scale-0 group-hover:scale-100 bg-slate-950 text-white text-[10px] font-mono px-2 py-1 rounded shadow-md z-50 whitespace-nowrap uppercase tracking-wider">
                      {menu.label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* TrackNet Integration - Placed correctly outside the map loop */}
            <button
              onClick={() => setActiveView("tracknet")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all text-xs font-bold uppercase tracking-wider cursor-pointer ${
                activeView === "tracknet" 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Scan className="w-4.5 h-4.5 shrink-0" />
              {isSidebarOpen && <span className="truncate">TrackNet Cortex</span>}
            </button>
          </nav>
        </div>

        {/* Profile drawer/logout at bottom */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {isSidebarOpen && (
            <div className="flex items-center gap-2.5 px-2 bg-white/5 py-2.5 rounded-xl border border-white/5">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-amber-500"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-display font-black text-sm uppercase shrink-0">
                  {currentUser?.name?.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-200 block truncate">{currentUser?.name}</span>
                <span className="text-[10px] text-slate-500 block font-mono truncate uppercase">{osData.profile.aiPersonality} profile</span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setToken(null);
              setCurrentUser(null);
              setIsLoggedIn(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {isSidebarOpen && <span>Sign Out Node</span>}
          </button>
        </div>
      </aside>

      {/* Main body wrapper layout (shifts left margin to hold sidebar) */}
      <div 
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: isSidebarOpen ? "256px" : "64px" }}
      >
        {/* Dynamic High Header Port */}
        <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 sticky top-0 z-20">
          
          {/* Welcome Greeting heading context */}
          <div className="flex items-center gap-3">
            {/* Quick Mobile Sidebar Trigger */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-display font-black text-slate-800 text-sm md:text-base leading-tight">
                Good {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Morning';
                  if (hour < 17) return 'Afternoon';
                  return 'Evening';
                })()}, {currentUser?.name} 👋
              </h2>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                COCKPIT CALIBRATION: OPTIMAL &bull; {new Date().toISOString().split("T")[0]}
              </p>
            </div>
          </div>

          {/* Action and notifications */}
          <div className="flex items-center gap-3">
            
            {/* Notification triggers Bell */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
              )}
            </button>

            <span className="h-8 w-px bg-slate-100 hidden sm:block" />

            {/* Quick avatar click triggers profile settings */}
            <button 
              onClick={() => setActiveView("settings")}
              className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 hidden sm:block cursor-pointer hover:border-amber-500 transition-colors"
            >
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase">
                  {currentUser?.name?.charAt(0)}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Primary Page content stage viewport */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {activeView === "dashboard" && (
            <DashboardView
              data={osData}
              token={token}
              onToggleTask={handleToggleTask}
              onEditTask={handleEditTaskTrigger}
              onRescheduleTaskSubmit={handleRescheduleTaskSubmit}
              onNavigateToView={(view) => setActiveView(view as ViewState)}
              onOpenCreateTaskModal={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              onTriggerDailyReview={() => setIsDailyReviewOpen(true)}
              onTriggerWeeklyReview={() => setIsWeeklyReviewOpen(true)}
              selectedTaskId={selectedTaskId}
              onFocusTask={(id, title) => {
                setSelectedTaskId(id);
                setSelectedTaskTitle(title);
              }}
              onNudgeTriggered={hydrateSystemData}
            />
          )}

          {activeView === "missions" && (
            <MissionsView
              tasks={osData.tasks}
              onToggleTask={handleToggleTask}
              onEditTask={handleEditTaskTrigger}
              onDeleteTask={handleDeleteTask}
              onOpenCreateModal={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              onRescheduleTaskSubmit={handleRescheduleTaskSubmit}
              selectedTaskId={selectedTaskId}
              onFocusTask={(id, title) => {
                setSelectedTaskId(id);
                setSelectedTaskTitle(title);
              }}
            />
          )}

          {activeView === "habits" && (
            <HabitsView
              habits={osData.habits}
              onToggleHabit={handleToggleHabit}
              onAddHabit={handleAddHabit}
              onDeleteHabit={handleDeleteHabit}
              selectedHabitId={selectedHabitId}
              onFocusHabit={(id, name) => {
                setSelectedHabitId(id);
                setSelectedHabitName(name);
              }}
            />
          )}

          {activeView === "goals" && (
            <GoalsView 
              goals={osData.goals || []}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
              onUpdateProgress={handleUpdateGoalProgress}
            />
          )}

          {activeView === "analytics" && (
            <AnalyticsView 
            tasks={osData.tasks} 
            habits={osData.habits} 
            profileName={osData.profile.name} 
          />
          )}

          {activeView === "ai-dashboard" && (
            <AIDashboardView token={token} profileName={osData.profile.name} />
          )}
          {activeView === "ai-core" && (
            <PiggyChatView
              chatHistory={osData.chatHistory}
              onSendMessage={handleSendChatMessage}
              isLoading={isUpdatingDb}
              token={token}
            />
          )}

          {activeView === "focus-timer" && (
            <FocusModeView defaultTaskTitle={selectedTaskTitle || undefined} token={token} />
          )}

          {activeView === "settings" && (
            <SettingsView
              initialProfile={osData.profile}
              onSaveProfile={handleSaveProfile}
            />
          )}
          {activeView === "expenses" && (
            <ExpensesView
              expenses={osData.expenses || []}
              budgets={osData.budgets || []}
              token={token}
              onAddExpense={handleAddExpense}
              onUpdateBudget={handleUpdateBudget}
              onExplainExpense={handleExplainExpense}
            />
          )}
          
          {/* PASTE THE TRACKNET BLOCK HERE */}
          {activeView === "tracknet" && (
            <TrackNetView />
          )}
        </main>
      </div>

      {/* --- MODAL DIALOGS GATEWAYS --- */}

      {/* 1. Create/Edit Task dialog modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />

      {/* 2. Sliding Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={osData.notifications}
        onClearRead={handleClearNotifications}
        userName={currentUser?.name}
      />

      {/* 3. Daily Night Review simulation modal */}
      <DailyReviewModal
        isOpen={isDailyReviewOpen}
        onClose={() => setIsDailyReviewOpen(false)}
        tasksCompleted={osData.tasks.filter(t => t.status === "completed").length}
        totalTasks={osData.tasks.length}
        habitsCompleted={osData.habits.filter(h => h.logs.includes(new Date().toISOString().split("T")[0])).length}
        totalHabits={osData.habits.length}
        activeStreak={osData.habits.length > 0 ? Math.max(...osData.habits.map(h => h.streak)) : 0}
        productivityScore={realProductivityScore} // Consolidated Score matching cockpit index
        onPlanTomorrow={handleSimulatePlanTomorrow}
      />

      {/* 4. Smart Planner Result Modal */}
      <SmartPlannerModal
        isOpen={isPlannerModalOpen}
        onClose={() => setIsPlannerModalOpen(false)}
        plan={plannerPlan}
      />

      {/* 5. Weekly Review Modal */}
      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        token={token}
      />

      {/* Persistent floating J.A.R.V.I.S cognitive companion orb */}
      {activeView !== "ai-core" && (
        <button
          onClick={() => setActiveView("ai-core")}
          className={`fixed bottom-6 right-6 rounded-full bg-slate-950 text-white shadow-2xl border border-amber-500/30 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-[0.98] cursor-pointer group z-40 ${
            activeView === "focus-timer" ? "w-[36px] h-[36px]" : "w-[52px] h-[52px]"
          }`}
          title="Synchronize intelligence transceiver"
        >
          {/* Pulsing Concentric Aura */}
          <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping duration-3000 pointer-events-none" />
          <span className="absolute inset-0.5 rounded-full bg-amber-500/5 animate-jarvis-pulse-ring pointer-events-none" />
          
          <div className={`rounded-full bg-radial from-amber-400 to-amber-600 flex items-center justify-center relative transition-all duration-300 ${
            activeView === "focus-timer" ? "w-6 h-6 animate-none" : "w-10 h-10 animate-jarvis-breath"
          }`}>
            <Cpu className={`text-slate-950 font-black shrink-0 transition-all ${activeView === "focus-timer" ? "w-3 h-3" : "w-4.5 h-4.5"}`} />
            
            {/* Online mini indicator beacon */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
        </button>
      )}

    </div>
  );
}



