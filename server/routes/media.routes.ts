import express from "express";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { authenticateToken } from "../middleware/auth.js";
import { dbService } from "../db/index.js";
import { GROQ_API_KEY } from "../config/env.js";
import { secureImageUpload, secureVideoUpload } from "../middleware/uploadValidator.js";

const router = express.Router();

// Groq client initialization
let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  return openaiInstance;
}

// --- PROFILE AVATAR ---
router.post("/api/profile/avatar", authenticateToken, secureImageUpload.single("avatar"), (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  const db = dbService.getDatabaseState();
  const user = db.users?.find((u: any) => u.id === req.user.id);
  if (user) {
    user.avatarUrl = avatarUrl;
    dbService.saveDatabaseState(db);
    dbService.updateProfile(req.user.id, { avatar: avatarUrl });
  }
  
  res.json({ avatarUrl });
});

// --- RECEIPT VISION SCANNER ---
router.post("/api/expenses/scan-receipt", authenticateToken, secureImageUpload.single("receipt"), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No receipt image uploaded." });
  }

  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString("base64");
    const ai = getOpenAI();

    const response = await ai.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: 'Extract expense information from this receipt image. Return ONLY a JSON object with the schema: {"amount": number, "merchant": string, "category": string, "date": string, "note": string}.' },
            { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    const allowed = ["food", "transportation", "shopping", "education", "healthcare", "entertainment", "misc"];
    if (!allowed.includes(parsed.category)) {
      if (parsed.category === "transport") parsed.category = "transportation";
      else if (parsed.category === "health") parsed.category = "healthcare";
      else parsed.category = "misc";
    }

    res.json(parsed);

  } catch (error: any) {
    console.error("Receipt Scan Groq Error:", error.message);
    const fallbackScan = {
      amount: 24.50,
      merchant: "LifeOS Scanner (Offline)",
      category: "shopping",
      date: new Date().toISOString().split("T")[0],
      note: "Receipt scanner processed in offline simulation mode due to Vision API limit/error."
    };
    res.json(fallbackScan);
  }
});

// --- TRACKNET VISION BRIDGE ---
router.post("/api/vision/track", authenticateToken, secureVideoUpload.single("video"), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "No video payload detected." });

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append("video", fileBlob, req.file.filename);

    const pythonResponse = await fetch("http://127.0.0.1:5002/api/track", {
      method: "POST",
      body: formData
    });

    const result = await pythonResponse.json();
    res.json(result);
  } catch (error: any) {
    console.error("TrackNet Communication Failure:", error.message);
    res.status(500).json({ error: "Visual cortex offline or unreachable." });
  }
});

export default router;
