import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().trim().min(1, "Message content is required").max(1000, "Message content cannot exceed 1000 characters"),
  activeContext: z.string().trim().max(1000).optional()
});
