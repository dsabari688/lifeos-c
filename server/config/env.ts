import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-lifeos";

export const SMTP = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  user: process.env.EMAIL_USER || "",
  pass: process.env.EMAIL_PASS || "",
};

export const PORT = parseInt(process.env.PORT || "5001", 10);

export const DB_FILE = path.join(process.cwd(), "lifeos_db.json");

export const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

export const NODE_ENV = process.env.NODE_ENV || "development";

export const CORS_WHITELIST = (process.env.CORS_WHITELIST || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5001,http://127.0.0.1:5001").split(",");
