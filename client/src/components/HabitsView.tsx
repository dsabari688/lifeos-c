import React, { useState } from "react";
import { Plus, Flame, Check, Sparkles, Smile, RefreshCw, Trophy, BookOpen, AlertCircle } from "lucide-react";
import { Habit } from "../types";

interface HabitsViewProps {
  habits: Habit[];
  onToggleHabit: (habitId: string) => void;
  onAddHabit: (name: string, frequency: "daily" | "weekly") => void;
  onDeleteHabit: (habitId: string) => void;
  selectedHabitId?: string | null;
  onFocusHabit?: (id: string, name: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onToggleHabit,
  onAddHabit,
  onDeleteHabit,
  selectedHabitId,
  onFocusHabit
}) => {
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly">("daily");
  const [showAddForm, setShowAddForm] = useState(false);

  // June 2026 has 30 days. Starts on Monday, June 1, 2026.
  // Today's date is Sunday, June 21, 2026.
  const GRID_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName.trim(), newHabitFreq);
    setNewHabitName("");
    setShowAddForm(false);
  };

  const todayStr = new Date().toISOString().split("T")[0];;

  // Assign rich emojis to standard headers
  const getHabitIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("code") || n.includes("program") || n.includes("build")) return "💻";
    if (n.includes("meditat") || n.includes("focus") || n.includes("align") || n.includes("mind")) return "🧘";
    if (n.includes("read") || n.includes("article") || n.includes("paper") || n.includes("book")) return "📚";
    if (n.includes("budget") || n.includes("splurge") || n.includes("financ") || n.includes("spend")) return "💰";
    if (n.includes("gym") || n.includes("workout") || n.includes("resistance") || n.includes("cardio")) return "🏋️";
    return "⚡";
  };

  const getDayColor = (dateStr: string) => {
    if (dateStr > todayStr) return "bg-slate-100 border border-slate-200";
    const habitsForDay = habits.filter(h => h.logs.includes(dateStr));
    if (habitsForDay.length === habits.length && habits.length > 0) return "bg-emerald-500";
    if (habitsForDay.length > 0) return "bg-amber-400";
    return "bg-rose-400";
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Habit Coherence Core</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Build compound behaviors through uninterrupted cycles.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-900 stroke-3" />
          Synchronize Habit
        </button>
      </div>

      {/* Add Habit inline form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-4 duration-200">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Habit Objective Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Read 2 Quantum Research Papers"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="w-full md:w-48 space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Cycle Frequency</label>
            <select
              value={newHabitFreq}
              onChange={(e) => setNewHabitFreq(e.target.value as "daily" | "weekly")}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-amber-500 font-sans cursor-pointer"
            >
              <option value="daily">Daily Cycle</option>
              <option value="weekly">Weekly Cycle</option>
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto font-display">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="w-full md:w-20 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full md:px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all"
            >
              Lock In
            </button>
          </div>
        </form>
      )}

      {/* Active habits display grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {habits.map((item) => {
          const isDoneToday = item.logs.includes(todayStr);
          const iconEmoji = getHabitIcon(item.name);
          
          // Custom color weight indicators based on streaks
          let progressPercent = Math.min(Math.round((item.logs.length / 15) * 100), 100);
          let progressClass = "bg-rose-500";
          if (progressPercent > 75) {
            progressClass = "bg-emerald-500";
          } else if (progressPercent > 45) {
            progressClass = "bg-amber-500";
          }

          const isSelected = selectedHabitId === item.id;

          return (
            <div 
              key={item.id}
              onClick={() => onFocusHabit?.(item.id, item.name)}
              className={`rounded-2xl p-5 border transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected 
                  ? "border-l-4 border-l-amber-500 border-slate-200/50 bg-amber-500/[0.015] shadow-[0_4px_16px_rgba(245,166,35,0.065)]" 
                  : "bg-white border-slate-100 hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span 
                    style={{ fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif' }}
                    className="text-3xl filter drop-shadow hover:scale-110 transition-transform cursor-pointer select-none"
                  >
                    {iconEmoji}
                  </span>

                  {/* Complete Action Circle Trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHabit(item.id);
                    }}
                    className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                      isDoneToday
                        ? "bg-emerald-500 border-transparent text-white"
                        : "border-slate-300 hover:border-amber-500 hover:bg-amber-50/10 text-slate-400"
                    }`}
                  >
                    <Check className={`w-4.5 h-4.5 ${isDoneToday ? "opacity-100 scale-100" : "opacity-0 scale-50"} transition-all`} />
                  </button>
                </div>

                <div className="mt-3">
                  <h4 className="font-display font-black text-sm text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                    {item.name}
                    {isSelected && (
                      <span className="font-mono text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200 uppercase tracking-widest animate-pulse">
                        &bull; FOCUSED
                      </span>
                    )}
                  </h4>
                  
                  <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" />
                      Streak {item.streak} days
                    </span>
                    <span>&middot;</span>
                    <span>Frequency: {item.frequency}</span>
                  </div>
                </div>
              </div>

              {/* Progress Conformance Bar */}
              <div className="mt-5 space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400">
                  <span>CONFORMANCE RATE</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-150 rounded-full overflow-hidden">
                  <div className={`h-full ${progressClass} rounded-full`} style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Tiny utility link to delete */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteHabit(item.id);
                }}
                className="absolute bottom-2.5 right-4 text-[9px] font-mono text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
              >
                decommission
              </button>
            </div>
          );
        })}
      </div>

      {/* 30-Day Heatmap layout */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
          <Trophy className="w-4.5 h-4.5 text-amber-500" />
          <h3 className="font-display font-bold text-slate-800 text-sm">Monthly Consistency Ledger (June 2026)</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-5 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Legend</span>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-emerald-500"/>
            <span className="text-xs text-slate-650">All habits done</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-amber-400"/>
            <span className="text-xs text-slate-650">Partial (some done)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-rose-400"/>
            <span className="text-xs text-slate-650">Missed / Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200"/>
            <span className="text-xs text-slate-650">Future / Upcoming</span>
          </div>
        </div>

        {/* 7-column calendar grid representation */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400 font-mono font-bold mb-2">
          <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {GRID_DAYS.map((day) => {
            const dateStr = `2026-06-${day.toString().padStart(2, "0")}`;
            const targetDate = new Date(dateStr);
            const todayDate = new Date("2026-06-21"); // June 21, 2026 is today in project
            const isToday = day === 21;
            
            let bgClass = "bg-slate-100";
            if (targetDate > todayDate) {
              bgClass = "bg-slate-50/50 text-slate-300 border border-dashed border-slate-150"; // Future
            } else if (habits.length === 0) {
              bgClass = "bg-rose-450 text-white"; // Missed
            } else {
              const completedCount = habits.filter(h => h.logs?.includes(dateStr)).length;
              if (completedCount === 0) {
                bgClass = "bg-rose-400 text-white"; // Missed
              } else if (completedCount === habits.length) {
                bgClass = "bg-emerald-500 text-white"; // All done
              } else {
                bgClass = "bg-amber-400 text-slate-900"; // Partial
              }
            }

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center font-mono text-[10px] font-bold relative transition-transform hover:scale-105 cursor-pointer ${bgClass} ${
                  isToday ? "ring-2 ring-amber-500 ring-offset-2 scale-[1.05]" : ""
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-900" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
