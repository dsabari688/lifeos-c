import dotenv from "dotenv";
import { z } from "zod";
import path from "path";

dotenv.config();

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  GROQ_API_KEY: z.string().optional().or(z.literal("")),
  PORT: z.string().default("5001").transform((val) => parseInt(val, 10)),
  DB_FILE: z.string().default(path.join(process.cwd(), "lifeos_db.json")),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_WHITELIST: z.string().default("http://localhost:5173,http://127.0.0.1:5173,http://localhost:5001,http://127.0.0.1:5001"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().default("587").transform((val) => parseInt(val, 10)),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default("")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment configuration validation failed:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
