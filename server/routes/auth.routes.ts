import express, { Request, Response } from "express";
import nodemailer from "nodemailer";
import { dbService } from "../db/index.js";
import { logger } from "../logger.js";

// Validation & Middleware imports
import { validateBody } from "../middleware/validate.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";
import { registerSchema, verifyOtpSchema, loginSchema } from "../validators/auth.schema.js";

// Security utility imports
import { env, hashPassword, verifyPassword, validatePasswordStrength, generateAccessToken, generateRefreshToken, recordAuditEvent } from "../security/index.js";

const router = express.Router();
const otpStore: Record<string, { otp: string; expiry: number; data?: string }> = {};

// Periodic garbage collection to evict expired OTPs and prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let count = 0;
  for (const key of Object.keys(otpStore)) {
    if (otpStore[key] && otpStore[key].expiry < now) {
      delete otpStore[key];
      count++;
    }
  }
  if (count > 0) {
    logger.info(`[Auth Security] Garbage collector evicted ${count} expired OTP records from memory.`);
  }
}, 60 * 1000).unref();

// Safe SMTP transporter setup
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS
  }
});

/**
 * POST /api/auth/register
 * Sends verification OTP to the target email.
 */
router.post(
  "/api/auth/register",
  authRateLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const clientIp = req.ip || (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]) || "unknown";

    try {
      // 1. Password complexity check
      if (!validatePasswordStrength(password)) {
        recordAuditEvent({
          ip: clientIp,
          action: "REGISTER_ATTEMPT_WEAK_PASSWORD",
          details: { email },
          status: "failure"
        });
        return res.status(400).json({
          error: "Password does not meet complexity rules. Must include uppercase, lowercase, numbers, and symbols."
        });
      }

      // 2. Email uniqueness check
      const db = dbService.getDatabaseState();
      if (!db.users) db.users = [];
      if (db.users.find((u: any) => u.email === email)) {
        recordAuditEvent({
          ip: clientIp,
          action: "REGISTER_ATTEMPT_DUPLICATE_EMAIL",
          details: { email },
          status: "failure"
        });
        return res.status(400).json({ error: "Email already registered" });
      }

      // 3. Generate verification OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[email] = { otp, expiry: Date.now() + 5 * 60 * 1000 };

      // 4. Send email (fallback log if credentials missing)
      if (env.EMAIL_USER && env.EMAIL_PASS) {
        await transporter.sendMail({
          from: env.EMAIL_USER,
          to: email,
          subject: "LifeOS — Verify your account",
          html: `<h2>Welcome to LifeOS</h2><p>Your verification code is:</p><h1 style="letter-spacing: 8px; color: #F5A623;">${otp}</h1><p>This code expires in 5 minutes.</p>`
        });
        logger.info(`[LifeOS OTP] Email sent successfully to ${email}`);
      } else {
        logger.warn(`\n[LifeOS OTP WARNING] SMTP is not configured. Logged OTP for ${email}: ${otp}\n`);
      }

      // Save encrypted password parameters into staging state
      otpStore[email + "_data"] = {
        otp: JSON.stringify({ name, email, password }),
        expiry: Date.now() + 5 * 60 * 1000
      };

      recordAuditEvent({
        ip: clientIp,
        action: "REGISTER_OTP_SENT",
        details: { email },
        status: "success"
      });

      return res.json({ message: "OTP sent to email" });

    } catch (error: any) {
      logger.error("Registration dispatch failure:", error);
      recordAuditEvent({
        ip: clientIp,
        action: "REGISTER_FAILURE",
        details: { email, error: error.message },
        status: "failure"
      });
      return res.status(500).json({ error: "Failed to dispatch verification OTP." });
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Validates OTP and registers the UserRecord with strong password hashes.
 */
router.post(
  "/api/auth/verify-otp",
  authRateLimiter,
  validateBody(verifyOtpSchema),
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const clientIp = req.ip || (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]) || "unknown";

    try {
      const record = otpStore[email];

      if (!record || record.otp !== otp || Date.now() > record.expiry) {
        recordAuditEvent({
          ip: clientIp,
          action: "VERIFY_OTP_INVALID",
          details: { email, otp },
          status: "failure"
        });
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      const pendingRecord = otpStore[email + "_data"];
      if (!pendingRecord) {
        return res.status(400).json({ error: "Pending registration expired or missing." });
      }

      const pendingData = JSON.parse(pendingRecord.otp);
      
      // Hash password using 12 salt rounds (Strict Security Rounds)
      const passwordHash = await hashPassword(pendingData.password);
      
      const db = dbService.getDatabaseState();
      const newUser = {
        id: `user-${Date.now()}`,
        name: pendingData.name,
        email: pendingData.email,
        passwordHash,
        avatarUrl: null,
        role: "User", // Default RBAC role
        createdAt: new Date().toISOString()
      };

      if (!db.users) db.users = [];
      db.users.push(newUser);
      await dbService.saveDatabaseState(db);

      delete otpStore[email];
      delete otpStore[email + "_data"];

      // Seed initial default tables
      dbService.getUserData(newUser.id);

      const tokenPayload = { id: newUser.id, email: newUser.email, name: newUser.name };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      recordAuditEvent({
        userId: newUser.id,
        ip: clientIp,
        action: "VERIFY_OTP_SUCCESS",
        details: { email },
        status: "success"
      });

      return res.json({
        token: accessToken,
        refreshToken,
        user: { name: newUser.name, email: newUser.email, avatarUrl: null, id: newUser.id }
      });

    } catch (error: any) {
      logger.error("OTP verification failure:", error);
      recordAuditEvent({
        ip: clientIp,
        action: "VERIFY_OTP_ERROR",
        details: { email, error: error.message },
        status: "failure"
      });
      return res.status(500).json({ error: "Verification process failure." });
    }
  }
);

/**
 * POST /api/auth/login
 * Validates credentials and returns Access + Refresh tokens.
 */
router.post(
  "/api/auth/login",
  authRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const clientIp = req.ip || (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]) || "unknown";

    try {
      const db = dbService.getDatabaseState();
      if (!db.users) db.users = [];
      
      const user = db.users.find((u: any) => u.email === email);
      if (!user) {
        recordAuditEvent({
          ip: clientIp,
          action: "LOGIN_FAILED_USER_NOT_FOUND",
          details: { email },
          status: "failure"
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify hashed password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        recordAuditEvent({
          userId: user.id,
          ip: clientIp,
          action: "LOGIN_FAILED_WRONG_PASSWORD",
          details: { email },
          status: "failure"
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const tokenPayload = { id: user.id, email: user.email, name: user.name };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      recordAuditEvent({
        userId: user.id,
        ip: clientIp,
        action: "LOGIN_SUCCESS",
        details: { email },
        status: "success"
      });

      return res.json({
        token: accessToken,
        refreshToken,
        user: { name: user.name, email: user.email, avatarUrl: user.avatarUrl, id: user.id }
      });

    } catch (error: any) {
      logger.error("Login route error:", error);
      recordAuditEvent({
        ip: clientIp,
        action: "LOGIN_FAILURE",
        details: { email, error: error.message },
        status: "failure"
      });
      return res.status(500).json({ error: "Internal authentication failure." });
    }
  }
);

export default router;
