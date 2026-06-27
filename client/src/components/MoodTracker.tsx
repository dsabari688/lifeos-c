import {useState} from "react";

export default function MoodTracker(){

const [mood,setMood]=useState("");
const [note,setNote]=useState("");
const [saved,setSaved]=useState(false);

const moods=[
["😄","Great"],
["🙂","Good"],
["😐","Normal"],
["😞","Low"],
["😡","Bad"]
];

async function saveMood(){

await fetch("/api/mood",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
mood,
note
})
});

setSaved(true);

}

return (
<div className="p-4 rounded-xl">

<h2 className="text-xl font-bold">
How are you feeling today?
</h2>

<div className="flex gap-3 my-4">

{moods.map((m)=>(

<button
key={m[1]}
onClick={()=>setMood(m[1])}
className="p-3"
>

<div className="text-2xl">
{m[0]}
</div>

{m[1]}

</button>

))}

</div>


<textarea
className="border p-2"
placeholder="Add note..."
value={note}
onChange={
e=>setNote(e.target.value)
}
/>


<br/>


<button
className="mt-3 p-2 bg-blue-500"
onClick={saveMood}
>
Save Mood
</button>


{saved && 
<p>Mood saved ✅</p>
}

</div>
)

}
