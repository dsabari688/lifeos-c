import React, { useState, useEffect } from "react";
import { Smile, CheckCircle2 } from "lucide-react";

interface MoodTrackerProps {
  token?: string | null;
}

interface MoodEntry {
  id: string;
  mood: string;
  note: string;
  createdAt: string;
}

const moodsList = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Normal" },
  { emoji: "😞", label: "Low" },
  { emoji: "😡", label: "Bad" }
];

export default function MoodTracker({ token }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/mood/today", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setTodayMood(data);
        } else {
          setTodayMood(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading today's mood:", err);
        setLoading(false);
      });
  }, [token, saved]);

  const handleSaveMood = async () => {
    if (!token || !selectedMood) return;

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mood: selectedMood,
          note
        })
      });

      if (res.ok) {
        setSaved(true);
      }
    } catch (err) {
      console.error("Error saving mood:", err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 animate-pulse flex items-center justify-center text-slate-400 font-mono text-xs">
        Connecting to neural telemetry...
      </div>
    );
  }

  const loggedEmoji = moodsList.find(m => m.label === todayMood?.mood)?.emoji || "😄";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 transition-all hover:shadow-md">
      {todayMood ? (
        <div className="flex items-center gap-4 animate-in fade-in duration-200">
          <div className="text-4xl filter drop-shadow select-none">
            {loggedEmoji}
          </div>
          <div>
            <span className="font-mono text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
              METRICS LOGGED FOR TODAY
            </span>
            <h3 className="font-display font-black text-slate-800 text-sm md:text-base leading-tight mt-1">
              You logged a {todayMood.mood} mood today.
            </h3>
            {todayMood.note && (
              <p className="text-xs text-slate-500 font-sans italic mt-1">
                "{todayMood.note}"
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smile className="w-4.5 h-4.5 text-amber-500" />
            <h3 className="font-display font-bold text-slate-800 text-sm">How are you feeling today, Sir?</h3>
          </div>

          <div className="flex gap-2 justify-between max-w-md">
            {moodsList.map((m) => {
              const isSelected = selectedMood === m.label;
              return (
                <button
                  key={m.label}
                  onClick={() => setSelectedMood(m.label)}
                  className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-500 bg-amber-55/40 text-amber-800 font-black scale-[1.02]"
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 text-slate-500"
                  }`}
                >
                  <span className="text-2xl filter drop-shadow select-none hover:scale-110 transition-transform mb-1">
                    {m.emoji}
                  </span>
                  <span className="text-[10px] font-display font-semibold uppercase tracking-wider">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedMood && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                placeholder="Optional reflection or notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500"
              />
              <div>
                <button
                  onClick={handleSaveMood}
                  className="px-5 py-2.5 bg-slate-900 border border-transparent hover:bg-slate-800 text-white font-display font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-fit active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  Log Mind State
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
