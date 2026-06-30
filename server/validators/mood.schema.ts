import { z } from "zod";

export const moodSchema = z.object({
  mood: z.string().trim().min(1, "Mood value is required").max(50, "Mood descriptor is too long"),
  note: z.string().trim().max(500, "Note must be 500 characters or less").or(z.literal("")).optional()
});
