import { z } from "zod";

export const sleepSchema = z.object({
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, "Sleep time must follow HH:MM format"),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, "Wake time must follow HH:MM format"),
  duration: z.number().min(0, "Duration cannot be negative").max(24, "Duration cannot exceed 24 hours"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format")
});
