import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only numbers")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required")
});
