import { useState } from "react";

const moods = [
  { name: "Great", emoji: "😄" },
  { name: "Good", emoji: "🙂" },
  { name: "Normal", emoji: "😐" },
  { name: "Low", emoji: "😞" },
  { name: "Bad", emoji: "😡" },
];

export default function MoodTracker() {
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");

  async function saveMood() {
    const token = localStorage.getItem("token");

    await fetch("http://localhost:5001/api/mood", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mood: selected,
        note,
      }),
    });

    alert("Mood saved");
  }

  return (
    <div className="p-4 rounded-xl shadow">
      <h2 className="text-xl font-bold">
        Today's Mood
      </h2>

      <div className="flex gap-3 my-4">
        {moods.map((m)=>(
          <button
            key={m.name}
            onClick={()=>setSelected(m.name)}
            className="text-3xl"
          >
            {m.emoji}
          </button>
        ))}
      </div>

      <input
        className="border p-2 w-full"
        placeholder="How are you feeling?"
        value={note}
        onChange={(e)=>setNote(e.target.value)}
      />

      <button
        onClick={saveMood}
        className="mt-3 px-4 py-2 rounded"
      >
        Save Mood
      </button>

    </div>
  );
}