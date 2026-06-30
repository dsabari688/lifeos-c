import { Request } from "express";
import crypto from "crypto";

/**
 * Generates a secure random token for CSRF protection.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Double-submit CSRF cookie pattern validation.
 * Compares the token in the request header with the token inside cookies.
 */
export function validateCsrfToken(req: Request): boolean {
  const safeMethods = ["GET", "HEAD", "OPTIONS", "TRACE"];
  if (safeMethods.includes(req.method)) {
    return true;
  }

  const headerToken = req.headers["x-xsrf-token"] as string;
  
  // Extract cookie manually to avoid external dependency requirements
  let cookieToken: string | null = null;
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc: Record<string, string>, c) => {
      const parts = c.split("=");
      acc[parts[0].trim()] = parts[1] ? parts[1].trim() : "";
      return acc;
    }, {});
    cookieToken = cookies["XSRF-TOKEN"] || null;
  }

  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}
