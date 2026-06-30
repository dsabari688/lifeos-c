import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  category: z.enum(["food", "transportation", "shopping", "education", "healthcare", "entertainment", "misc"] as const, {
    message: "Category must be food, transportation, shopping, education, healthcare, entertainment, or misc"
  }),
  note: z.string().trim().max(200, "Note must be 200 characters or less").or(z.literal("")).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
  isImpulsive: z.boolean().optional()
});

export const budgetSchema = z.object({
  category: z.enum(["food", "transportation", "shopping", "education", "healthcare", "entertainment", "misc"] as const, {
    message: "Invalid budget category"
  }),
  limit: z.number().nonnegative("Budget limit cannot be negative")
});
