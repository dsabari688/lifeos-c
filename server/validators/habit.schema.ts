import { z } from "zod";

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required").max(100, "Habit name must be 100 characters or less"),
  frequency: z.enum(["daily", "weekly"] as const, {
    message: "Frequency must be daily or weekly"
  }),
  icon: z.string().trim().max(50).optional()
});
