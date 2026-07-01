import React, { useState, useEffect, Suspense, lazy } from "react";
import { 
  Menu, X, Bell, User, LayoutDashboard, Calendar, RefreshCw, Target, 
  LineChart, Cpu, Clock, Settings, ShieldAlert, LogOut, CheckCircle, 
  Terminal, Sparkles, LogIn, ChevronRight, Zap, Info, Wallet, Scan,
  Sun, Moon
} from "lucide-react";

import { useStore } from "./store/useStore";
import { Task, Habit, Goal } from "./types";

// Modals and sidebars
import { TaskModal } from "./components/TaskModal";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { DailyReviewModal } from "./components/DailyReviewModal";
import { SmartPlannerModal } from "./components/SmartPlannerModal";
import { WeeklyReviewModal } from "./components/WeeklyReviewModal";
import { LoginView } from "./components/LoginView";
import { OnboardingTour } from "./components/OnboardingTour";

// Lazy views split
const DashboardView = lazy(() => import("./components/DashboardView").then(m => ({ default: m.DashboardView })));
const AIDashboardView = lazy(() => import("./components/AIDashboardView").then(m => ({ default: m.AIDashboardView })));
const MissionsView = lazy(() => import("./components/MissionsView").then(m => ({ default: m.MissionsView })));
const TrackNetView = lazy(() => import("./components/TrackNetView").then(m => ({ default: m.TrackNetView })));
const HabitsView = lazy(() => import("./components/HabitsView").then(m => ({ default: m.HabitsView })));
const GoalsView = lazy(() => import("./components/GoalsView").then(m => ({ default: m.GoalsView })));
const AnalyticsView = lazy(() => import("./components/AnalyticsView").then(m => ({ default: m.AnalyticsView })));
const PiggyChatView = lazy(() => import("./components/PiggyChatView").then(m => ({ default: m.PiggyChatView })));
const FocusModeView = lazy(() => import("./components/FocusModeView").then(m => ({ default: m.FocusModeView })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const ExpensesView = lazy(() => import("./components/ExpensesView").then(m => ({ default: m.ExpensesView })));

export default function App() {
  const {
    token,
    isLoggedIn,
    osData,
    isUpdatingDb,
    activeView,
    isSidebarOpen,
    notificationsOpen,
    toasts,
    loginUsername,
    loginEmail,
    selectedTaskId,
    selectedTaskTitle,
    selectedHabitId,
    selectedHabitName,
    isTaskModalOpen,
    editingTask,
    isDailyReviewOpen,
    isPlannerModalOpen,
    plannerPlan,
    isWeeklyReviewOpen,
    isOffline,
    setToken,
    setIsLoggedIn,
    setCurrentUser,
    setActiveView,
    setIsSidebarOpen,
    setNotificationsOpen,
    setSelectedTaskId,
    setSelectedTaskTitle,
    setSelectedHabitId,
    setSelectedHabitName,
    setIsTaskModalOpen,
    setEditingTask,
    setIsDailyReviewOpen,
    setIsPlannerModalOpen,
    setIsWeeklyReviewOpen,
    setPlannerPlan,
    showToast,
    dismissToast,
    hydrateSystemData,
    toggleTask,
    saveTask,
    rescheduleTask,
    deleteTask,
    toggleHabit,
    addHabit,
    deleteHabit,
    addGoal,
    deleteGoal,
    updateGoalProgress,
    saveProfile,
    clearNotifications,
    sendChatMessage,
    addExpense,
    updateBudget,
    explainExpense,
    simulatePlanTomorrow
  } = useStore();

  const handleSendMessage = async (text: string) => {
    await sendChatMessage(text, {});
  };

  const handleSaveProfile = async (profile: any) => {
    if (!osData) return;
    await saveProfile({
      name: profile.name,
      email: profile.email,
      budgetLimit: osData.profile.budgetLimit || 1000,
      aiPersonality: profile.aiPersonality,
      dailyPlanningReminderTime: osData.profile.dailyPlanningReminderTime || "08:00",
      dailyReviewTime: profile.dailyReviewTime || "21:30",
      listeningMode: profile.listeningMode || "push-to-talk",
      proactiveModeEnabled: profile.proactiveModeEnabled ?? true,
      maxProactiveNudges: profile.maxProactiveNudges ?? 2
    });
  };

  // Dark / Light Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Splash Screen States
  const [splashStep, setSplashStep] = useState(0);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

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
            }, 650);
            return prev;
          }
          return prev + 1;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isSplashDone]);

  // Fetch full system state on mount or login
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

  // Welcome tour auto-trigger
  useEffect(() => {
    if (isLoggedIn && osData) {
      const shown = localStorage.getItem(`onboarding_shown_${osData.profile.email}`);
      if (!shown) {
        setOnboardingOpen(true);
        localStorage.setItem(`onboarding_shown_${osData.profile.email}`, "true");
      }
    }
  }, [isLoggedIn, osData]);

  // Backbeat daemon monitoring clock to trigger the Nightly Review
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
    }, 45000);

    return () => clearInterval(checkInterval);
  }, [osData, isLoggedIn]);

  const unreadCount = React.useMemo(() => {
    if (!osData) return 0;
    return osData.notifications.filter(n => !n.read).length;
  }, [osData]);
  
  const realProductivityScore = React.useMemo(() => {
    if (!osData) return 0;
    const todayStrForScore = new Date().toISOString().split("T")[0];
    const taskScore = osData.tasks.length ? (osData.tasks.filter(t => t.status === "completed").length / osData.tasks.length) * 60 : 0;
    const habitScore = osData.habits.length ? (osData.habits.filter(h => h.logs.includes(todayStrForScore)).length / osData.habits.length) * 40 : 0;
    return Math.round(taskScore + habitScore);
  }, [osData]);

  const handleEditTaskTrigger = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleEditGoalTrigger = (id: string, progress: number) => {
    updateGoalProgress(id, progress);
  };

  // Render Splash Loading Page
  if (!isSplashDone) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full space-y-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-amber-500/[0.02] border border-amber-500/[0.04] animate-ping duration-3000 pointer-events-none" />

          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-jarvis-breath mx-auto flex items-center justify-center">
            <Cpu className="w-10 h-10 text-slate-900" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-3xl tracking-widest text-amber-500 uppercase glow-text-amber">
              LIFE OS
            </h1>
            <p className="text-slate-500 font-mono text-[10px] tracking-widest">PERSONAL COMMAND COCKPIT</p>
          </div>

          <div className="pt-6 font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{splashMessages[splashStep]}</span>
            </div>
            
            <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-300 rounded-full" 
                style={{ width: `${((splashStep + 1) / splashMessages.length) * 100}%` }}
              />
            </div>
          </div>

          <p className="border-t border-white/5 pt-4 text-[9px] text-slate-600 font-mono tracking-wider">
            PREVIEW ENGINE COGNITION BUILD VER 4.3.0
          </p>
        </div>
      </div>
    );
  }

  // Render Login Screen
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

  // Ensure database sync is finished
  if (!osData) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping mr-2" />
        Synchronizing databases files...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 flex font-sans transition-colors duration-200">
      
      {/* Onboarding Tour */}
      <OnboardingTour 
        isOpen={onboardingOpen} 
        onClose={() => setOnboardingOpen(false)} 
        userName={osData.profile.name} 
      />

      {/* Sidebar Rail */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-slate-900 dark:bg-slate-950 text-white flex flex-col justify-between transition-all duration-300 z-30 ${
          isSidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        }`}
      >
        <div className="flex flex-col">
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
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1 font-display">
            {[
              { key: "dashboard", label: "Mission Control", icon: LayoutDashboard },
              { key: "ai-dashboard", label: "Piggy AI Cockpit", icon: Sparkles },
              { key: "ai-core", label: "Direct Comms", icon: Terminal },
              { key: "missions", label: "Tactical Missions", icon: CheckCircle },
              { key: "habits", label: "Habit Routines", icon: RefreshCw },
              { key: "goals", label: "Strategic Vault", icon: Target },
              { key: "tracknet", label: "TrackNet Vision", icon: Scan },
              { key: "expenses", label: "Budget Allocations", icon: Wallet },
              { key: "analytics", label: "Diagnostic Logs", icon: LineChart },
              { key: "focus-timer", label: "Focus Timer", icon: Clock },
              { key: "settings", label: "System Config", icon: Settings }
            ].map((menu) => {
              const Icon = menu.icon;
              const isActive = activeView === menu.key;
              return (
                <button
                  key={menu.key}
                  onClick={() => setActiveView(menu.key as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span className="truncate">{menu.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {/* Light/Dark Toggle */}
          <button 
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all cursor-pointer"
          >
            {theme === "light" ? (
              <>
                <Moon className="w-4 h-4" />
                {isSidebarOpen && <span>Dark Theme</span>}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                {isSidebarOpen && <span>Light Theme</span>}
              </>
            )}
          </button>

          <button 
            onClick={() => setToken(null)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>De-authenticate</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "pl-0 md:pl-64" : "pl-0 md:pl-16"}`}>
        
        {/* Top Header navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg uppercase">
                Node ID: L_OS_01
              </span>
              {isOffline && (
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg uppercase animate-pulse flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Offline Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Onboarding tour link */}
            <button
              onClick={() => setOnboardingOpen(true)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer font-mono"
            >
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              SYSTEM TOUR
            </button>

            {/* Notification triggers */}
            <button 
              onClick={() => setNotificationsOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-950 font-mono text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown info */}
            <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-4">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                <img 
                  src={osData.profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{osData.profile.name}</p>
                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{osData.profile.aiPersonality} Coach Mode</p>
              </div>
            </div>
          </div>
        </header>

        {/* Global loading telemetry indicator */}
        {isUpdatingDb && (
          <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            <div className="h-full bg-amber-500 w-1/3 animate-progress-telemetry rounded-full" />
          </div>
        )}

        {/* Render Views split bundle */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-400 font-display text-sm tracking-widest uppercase">Calibrating system parameters...</p>
            </div>
          }>
            {activeView === "dashboard" && (
              <DashboardView
                data={osData}
                token={token}
                onToggleTask={toggleTask}
                onEditTask={handleEditTaskTrigger}
                onRescheduleTaskSubmit={rescheduleTask}
                onNavigateToView={(view) => setActiveView(view as any)}
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
                onToggleTask={toggleTask}
                onEditTask={handleEditTaskTrigger}
                onDeleteTask={deleteTask}
                onOpenCreateModal={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                onRescheduleTaskSubmit={rescheduleTask}
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
                onToggleHabit={toggleHabit}
                onAddHabit={addHabit}
                onDeleteHabit={deleteHabit}
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
                onAddGoal={addGoal}
                onDeleteGoal={deleteGoal}
                onUpdateProgress={handleEditGoalTrigger}
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
                onSendMessage={handleSendMessage}
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
                onAddExpense={addExpense}
                onUpdateBudget={updateBudget}
                onExplainExpense={explainExpense}
              />
            )}
            
            {activeView === "tracknet" && (
              <TrackNetView />
            )}
          </Suspense>
        </main>
      </div>

      {/* Slide-out Notification panel drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={osData.notifications}
        onClearRead={clearNotifications}
      />

      {/* Task Modal editing window */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={saveTask}
        initialTask={editingTask || undefined}
      />

      {/* Daily Review Assessment popup modal */}
      <DailyReviewModal
        isOpen={isDailyReviewOpen}
        onClose={() => setIsDailyReviewOpen(false)}
        tasksCompleted={osData.tasks.filter(t => t.status === "completed").length}
        totalTasks={osData.tasks.length}
        habitsCompleted={osData.habits.filter(h => h.logs.includes(new Date().toISOString().split("T")[0])).length}
        totalHabits={osData.habits.length}
        activeStreak={osData.habits.length > 0 ? Math.max(...osData.habits.map(h => h.streak), 0) : 0}
        productivityScore={realProductivityScore}
        onPlanTomorrow={async () => {
          setIsDailyReviewOpen(false);
          await simulatePlanTomorrow();
          setIsPlannerModalOpen(true);
        }}
      />

      {/* Smart scheduling results dashboard */}
      <SmartPlannerModal
        isOpen={isPlannerModalOpen}
        onClose={() => setIsPlannerModalOpen(false)}
        plan={plannerPlan}
      />

      {/* Weekly review logs modal */}
      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        token={token}
      />

      {/* Toast Alert HUD overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md pointer-events-auto animate-in slide-in-from-right duration-300 font-display ${
              toast.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-300"
                : toast.type === "error"
                ? "bg-rose-950/80 border-rose-500/20 text-rose-300"
                : toast.type === "warning"
                ? "bg-amber-950/80 border-amber-500/20 text-amber-300"
                : "bg-slate-900/80 border-slate-700/30 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold leading-tight">{toast.message}</span>
            </div>
            {toast.onUndo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.onUndo?.();
                  dismissToast(toast.id);
                }}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-[9px] rounded-lg cursor-pointer transition-all"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
