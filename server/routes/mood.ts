import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { readDB, getUserData, writeDB } from '../db/index.js';
import { validateBody } from '../middleware/validate.js';
import { moodSchema } from '../validators/mood.schema.js';

const router = express.Router();

router.post("/api/mood", authenticateToken, validateBody(moodSchema), (req: AuthRequest, res: Response) => {
  try {
    const { mood, note } = req.body;

    const db = readDB();
    const userData = getUserData(db, req.user!.id);

    if (!userData.moods) userData.moods = [];

    const entry = {
      id: Date.now().toString(),
      mood,
      note: note || "",
      createdAt: new Date().toISOString()
    };

    userData.moods.push(entry);
    writeDB(db);

    return res.json({ success: true, mood: entry });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to save mood log." });
  }
});

router.get("/api/mood/today", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = readDB();
    const userData = getUserData(db, req.user!.id);
    const today = new Date().toISOString().slice(0, 10);
    const mood = userData.moods?.find((m: any) => m.createdAt.startsWith(today));
    return res.json(mood || null);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve today's mood." });
  }
});

export default router;
