import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  category: z.enum(["high", "medium", "low"] as const, {
    message: "Priority category must be high, medium, or low"
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must follow HH:MM format").or(z.literal("")).optional(),
  recurType: z.enum(["none", "daily", "weekly"] as const, {
    message: "Recurrence type must be none, daily, or weekly"
  }),
  status: z.enum(["pending", "completed"] as const).optional()
});
