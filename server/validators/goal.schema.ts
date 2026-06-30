import { z } from "zod";

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(100, "Goal title must be 100 characters or less"),
  description: z.string().trim().max(500, "Description must be 500 characters or less").or(z.literal("")).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must follow YYYY-MM-DD format"),
  progress: z.number().min(0, "Progress cannot be negative").max(100, "Progress cannot exceed 100%").optional(),
  status: z.enum(["in-progress", "completed", "deferred"]).optional()
});
