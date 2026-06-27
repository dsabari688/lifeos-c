import React from "react";
import MoodTracker from "./MoodTracker";
import { CheckCircle2, Circle, Flame, Target, Sparkles, Plus, Play, Calendar, UserCheck, MessageSquare } from "lucide-react";
import { Task, Habit, FullOSData, TaskPriority } from "../types";

interface DashboardViewProps {
  data: FullOSData;
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onRescheduleTaskSubmit: (taskId: string, newDate: string) => void;
  onNavigateToView: (view: string) => void;
  onOpenCreateTaskModal: () => void;
  onOpenAddHabitModal?: () => void;
  onOpenCreateGoalModal?: () => void;
  onTriggerDailyReview: () => void;
  selectedTaskId?: string | null;
  onFocusTask?: (id: string, title: string) => void;
  token?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onToggleTask,
  onEditTask,
  onRescheduleTaskSubmit,
  onNavigateToView,
  onOpenCreateTaskModal,
  onOpenAddHabitModal,
  onOpenCreateGoalModal,
  onTriggerDailyReview,
  selectedTaskId,
  onFocusTask,
  token
}) => {
  const { tasks, habits, expenses, profile, chatHistory } = data;

  const [dailyBrief, setDailyBrief] = React.useState<string[]>([]);
  const [morningBriefText, setMorningBriefText] = React.useState<string | null>(null);
  const [showMorningBrief, setShowMorningBrief] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    const headers = { "Authorization": `Bearer ${token}` };

    // Fetch daily brief warnings and updates
    fetch("/api/jarvis/daily-brief", { headers })
      .then(res => res.json())
      .then(data => {
        if (data.insights) setDailyBrief(data.insights);
      })
      .catch(err => console.error("Error fetching daily brief:", err));

    // Fetch morning brief greeting
    fetch("/api/jarvis/morning-brief", { headers })
      .then(res => res.json())
      .then(data => {
        if (data.briefText) {
          setMorningBriefText(data.briefText);
          
          // Auto-show morning brief popup if it is morning hours (6:00 - 11:59)
          const hour = new Date().getHours();
          if (hour >= 6 && hour < 12) {
            setShowMorningBrief(true);
          }
        }
      })
      .catch(err => console.error("Error fetching morning brief:", err));
  }, [token]);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const totalHabitsCount = habits.length;
  const loggedHabitsCount = habits.filter(h => h.logs.includes(todayStr)).length;
  const habitCompletionRate = totalHabitsCount > 0 ? Math.round((loggedHabitsCount / totalHabitsCount) * 100) : 0;

  const highestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  // Synthesize dynamic Life Score
  const goalsCompletedRate = 0; // Set to 0 until the Goals API module is fully built!
  const lifeScore = Math.round((taskCompletionRate * 0.4) + (habitCompletionRate * 0.4) + (goalsCompletedRate * 0.2));

  // Get next pending tasks
  const sortedTasks = [...tasks]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 6);

  // Get today's actual sequence progress
  const todayTasks = tasks.filter(t => t.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 4);
  const todayDone = todayTasks.filter(t => t.status === 'completed').length;
  const todayProgress = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;

  // Get Piggy's last real message
  const latestAssistantMsg = [...(chatHistory || [])]
    .reverse()
    .find(m => m.role === 'assistant');

  // Quick Action buttons
  const actions = [
    { label: "Create Task", icon: Plus, color: "hover:border-amber-500 hover:bg-amber-50/30", onClick: onOpenCreateTaskModal },
    { label: "Add Habit", icon: Calendar, color: "hover:border-emerald-500 hover:bg-emerald-50/30", onClick: () => onOpenAddHabitModal ? onOpenAddHabitModal() : onNavigateToView("habits") },
    { label: "Create Goal", icon: Target, color: "hover:border-purple-500 hover:bg-purple-50/30", onClick: () => onOpenCreateGoalModal ? onOpenCreateGoalModal() : onNavigateToView("goals") },
    { label: "Talk to Piggy", icon: MessageSquare, color: "hover:border-blue-500 hover:bg-blue-50/30", onClick: () => onNavigateToView("ai-core") }
  ];

  return (
    <div className="space-y-6">
      
      <MoodTracker />

      {/* Morning daily brief popup */}
      {showMorningBrief && morningBriefText && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Morning Daily Brief</span>
              </div>
              <button 
                onClick={() => setShowMorningBrief(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close Port
              </button>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed font-sans italic">
              "{morningBriefText}"
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowMorningBrief(false);
                  onNavigateToView("ai-core");
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Launch Cockpit Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proactive insights panel */}
      {dailyBrief.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-650 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            <span>Piggy Coherence Insights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 font-medium">
            {dailyBrief.map((insight, idx) => (
              <div key={idx} className="flex gap-2.5 items-start bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                <span className="shrink-0">{insight.split(" ")[0]}</span>
                <span>{insight.substring(insight.indexOf(" ") + 1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upper Content - Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Life Score Card (Occupies 2 cols on Large screens) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-6 justify-between transition-all hover:shadow-md">
          
          {/* Circular SVG Ring Container */}
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="56" cy="56" r="48" 
                  className="stroke-slate-100 fill-none" 
                  strokeWidth="8"
                />
                <circle 
                  cx="56" cy="56" r="48" 
                  className="stroke-amber-500 fill-none transition-all duration-1000 ease-out" 
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - lifeScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <span className="font-display font-black text-3xl text-slate-900">{lifeScore}</span>
                <p className="text-[9px] font-mono font-bold text-amber-600 tracking-wider block uppercase">Life Score</p>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-800">System Performance Index</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-sans">
                {profile.name.split(" ")[0]}, your aggregated parameters show a highly synced mental focus. Keep committing tasks to maintain status levels.
              </p>
            </div>
          </div>

          {/* Sub bars detail */}
          <div className="w-full md:w-56 space-y-3 shrink-0 font-display">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                <span>Task Execution</span>
                <span className="font-mono text-slate-700">{taskCompletionRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                <span>Habit Conformance</span>
                <span className="font-mono text-slate-700">{habitCompletionRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${habitCompletionRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                <span>Milestone Goals</span>
                <span className="font-mono text-slate-700">{goalsCompletedRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${goalsCompletedRate}%` }} />
              </div>
            </div>
          </div>

        </div>

        {/* Piggy AI Widget (Charcoal Card) */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:scale-[1.01]">
          {/* Background visuals and rings */}
          <div className="absolute top-1/2 left-12 w-24 h-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-jarvis-pulse-ring shrink-0" />
              <span className="font-mono text-[9px] font-bold uppercase text-amber-400 tracking-widest">Piggy: active</span>
            </div>
            
            {/* Visual Orb Container */}
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-full bg-amber-500/80 animate-jarvis-breath" />
            </div>
          </div>

          <div className="my-4 border-l-2 border-amber-500/40 pl-3">
            <p className="text-xs text-slate-300 italic leading-relaxed font-sans">
              "{latestAssistantMsg?.content || `${profile.name.split(" ")[0]}, systems are optimal. Awaiting your next command.`}"
            </p>
          </div>

          <div className="flex gap-2 font-display">
            <button 
              onClick={() => onNavigateToView("ai-core")}
              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Open Chat
            </button>
            <button 
              onClick={() => onNavigateToView("focus-timer")}
              className="px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3 fill-slate-300 text-slate-300" />
              Focus
            </button>
          </div>
        </div>

      </div>

      {/* Stats Quick Readout Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Total Tasks</span>
          <span className="font-display font-extrabold text-2xl text-slate-800 mt-1 block">{totalTasks}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Completed</span>
          <span className="font-display font-extrabold text-2xl text-emerald-600 mt-1 block">{completedTasks}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Pending</span>
          <span className="font-display font-extrabold text-2xl text-amber-500 mt-1 block">{pendingTasks}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Max Streak</span>
            <span className="font-display font-extrabold text-2xl text-slate-800 mt-1 block">{highestStreak}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <Flame className="w-4 h-4 fill-amber-500" />
          </div>
        </div>

      </div>

      {/* Main Bottom Section - Tasks & Quick Commands Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's tactical tasks list (occupies 2 span) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-slate-900">Missions Underway</h3>
            <button 
              onClick={() => onNavigateToView("missions")}
              className="text-xs font-mono font-bold text-amber-600 hover:text-amber-700 tracking-wider"
            >
              See All Missions &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto pr-1">
            {sortedTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                An empty tactical board. Assign a mission now!
              </div>
            ) : (
              sortedTasks.map((task) => {
                const isCompleted = task.status === "completed";
                const isCritical = task.category === "urgent-important";
                const isImportant = task.category === "important-not-urgent";
                const isUrgentMinor = task.category === "urgent-not-important";

                let priorityLabel = "Low";
                let priorityColor = "bg-slate-50 text-slate-500 border-slate-100";

                if (isCritical) {
                  priorityLabel = "Critical";
                  priorityColor = "bg-rose-50 text-rose-600 border-rose-100";
                } else if (isImportant) {
                  priorityLabel = "High";
                  priorityColor = "bg-amber-50 text-amber-600 border-amber-100";
                } else if (isUrgentMinor) {
                  priorityLabel = "Medium";
                  priorityColor = "bg-purple-50 text-purple-600 border-purple-100";
                }

                const isSelected = selectedTaskId === task.id;

                return (
                  <div 
                    key={task.id} 
                    onClick={() => onFocusTask?.(task.id, task.title)}
                    className={`group py-3.5 flex items-center justify-between gap-3 transition-all px-2 rounded-xl cursor-pointer ${
                      isSelected 
                        ? "border-l-4 border-l-amber-500 bg-amber-500/[0.03] shadow-[0_0_12px_rgba(245,166,35,0.08)] px-3" 
                        : "hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTask(task.id);
                        }}
                        className="text-slate-400 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle className="w-5 h-5 hover:scale-105 transition-transform" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span className={`text-xs font-semibold block leading-tight ${isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-mono text-[9px] text-slate-400 shrink-0">{task.time} block</span>
                          {task.rescheduledCount > 0 && (
                            <span className="font-mono text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded-sm border border-amber-100">
                              Rescheduled #{task.rescheduledCount}
                            </span>
                          )}
                          {isSelected && (
                            <span className="font-mono text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200 uppercase tracking-widest animate-pulse">
                              &bull; FOCUSED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${priorityColor} shrink-0`}>
                        {priorityLabel}
                      </span>
                      
                       {/* Interactive Hover Actions */}
                       <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             onEditTask(task);
                           }}
                           className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 text-[10px] font-mono cursor-pointer"
                         >
                           Edit
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             const future = new Date();
                             future.setDate(future.getDate() + 1);
                             const tString = future.toISOString().split("T")[0];
                             onRescheduleTaskSubmit(task.id, tString);
                           }}
                           className="p-1 hover:bg-amber-50 rounded text-amber-600 text-[10px] font-mono cursor-pointer"
                         >
                           Defer
                         </button>
                       </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Mini commands and progress (occupies 1 span) */}
        <div className="space-y-6">
          
          {/* Quick Commands Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">Quick Commands</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {actions.map((act) => {
                const IconComp = act.icon;
                return (
                  <button
                    key={act.label}
                    onClick={act.onClick}
                    className={`p-3 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer ${act.color}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-transparent group-hover:text-inherit transition-all">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="font-display font-semibold text-[11px] text-slate-700 group-hover:text-amber-800">
                      {act.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Progress */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-base text-slate-900">Sequence Progress</h3>
              <p className="font-mono text-xs text-amber-600">{todayProgress}%</p>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-radial from-amber-400 to-amber-500 rounded-full transition-all duration-500" 
                style={{ width: `${todayProgress}%` }}
              />
            </div>

            <div className="space-y-3 font-display">
              {todayTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2 font-sans italic">No sequences logged for today.</p>
              ) : (
                todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className={`font-medium ${task.status === 'completed' ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                      {task.title.length > 22 ? task.title.substring(0, 22) + "..." : task.title}
                    </span>
                    <span className={`ml-auto font-mono text-[10px] ${task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {task.status === 'completed' ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Custom Bottom Button to trigger Daily Review */}
            <button
              onClick={onTriggerDailyReview}
              className="w-full py-2 bg-slate-50 hover:bg-amber-50 border border-slate-150 text-slate-700 hover:text-amber-800 text-[11px] font-semibold rounded-xl text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-display mt-4"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
              Simulate Nightly Review
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};






