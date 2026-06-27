import React, { useState, useEffect } from "react";
import { Target, Calendar, Plus, ShieldCheck, Flame, Trash2 } from "lucide-react";
import { Goal } from "../types";

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (title: string, targetDate: string) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ goals, onAddGoal, onDeleteGoal, onUpdateProgress }) => {
  const [newTitle, setNewTitle] = useState("");
    const [forecast, setForecast] = useState<any>(null);

  const getForecast = async (goalTitle: string) => {
    const res = await fetch("/api/predictive-outcomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryGoal: goalTitle, timeframeMonths: 6 })
    });
    const data = await res.json();
    if (data.success) setForecast(data.forecast);
  };

  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddGoal(newTitle, newDate);
    setNewTitle("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Strategic Goal Vault</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Track multi-week macro directives and milestones.</p>
              {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-900 stroke-3" />
          Institute Goal
        </button>
            {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-4 duration-200">
          <div className="flex-1 space-y-2 w-full">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Strategic Milestone Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Accomplish Advanced Algorithms Certification"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
            />
                {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

          <div className="w-full md:w-48 space-y-2 shrink-0">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Target Date Limit</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
                {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

          <div className="flex gap-2 w-full md:w-auto font-display shrink-0">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="w-full md:w-20 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full md:px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lock In
            </button>
                {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
        </form>
      )}

      {/* Goal Cards Stack */}
      <div className="space-y-5">
        {goals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm italic bg-white border border-slate-100 rounded-2xl shadow-xs">
            Your strategic vault is empty, Sir. Institute a new goal above.
                {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
        ) : (
          goals.map((g) => {
            let statusLabel = "Active";
            let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-150";

            if (g.progress < 20) {
              statusLabel = "Needs Focus";
              statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-150";
            } else if (g.status === "paused") {
              statusLabel = "Paused";
              statusBadgeClass = "bg-slate-100 text-slate-500 border-slate-200";
            } else if (g.status === "completed" || g.progress === 100) {
              statusLabel = "Completed";
              statusBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-150";
            }

            return (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition-all duration-200 hover:border-amber-500/20 group relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-500 shrink-0" />
                      <h4 className="font-display font-black text-slate-800 text-sm md:text-base leading-snug group-hover:text-amber-900 transition-colors">
                        {g.title}
                      </h4>
                          {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 pl-7">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target Date: <span className="text-slate-600 font-medium">{g.targetDate}</span></span>
                          {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
                        {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

                  <div className="text-right pl-7 md:pl-0 shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-0">
                    <span className="font-display font-black text-2xl text-amber-500">
                      {g.progress}%
                    </span>
                    <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Complete</p>
                        {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
                      {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

                {/* Progress bar and manual updater */}
                <div className="mt-4 pb-4">
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50 relative">
                    <div 
                      className="h-full bg-linear-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${g.progress}%` }}
                    />
                        {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
                  
                  {/* Invisible slider placed directly over the bar for easy updating */}
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={g.progress}
                    onChange={(e) => onUpdateProgress(g.id, parseInt(e.target.value))}
                    className="w-full mt-2 accent-amber-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Slide to update progress"
                  />
                      {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

                {/* Tag metadata row */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-50 pt-2 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider font-mono ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>

                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 text-slate-500 font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Goal Node Secured
                    </span>
                        {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>

                  {/* Trash Decommission button showing on hover */}
                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer flex items-center justify-center"
                    title="Decommission goal directive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                      {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
                    {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
            );
          })
        )}
            {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
          {/* Forecast Result Modal */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{forecast.targetGoal}</h3>
            <div className="text-4xl font-black text-indigo-600 mb-4">{forecast.probabilityPercent}% Probability</div>
            <p className="text-sm text-slate-600 mb-4">{forecast.timelineForecast}</p>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-medium">
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}
</div>
  );
};

