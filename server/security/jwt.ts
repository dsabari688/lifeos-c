import jwt from "jsonwebtoken";
import { env } from "./env.js";

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
}

/**
 * Generates an Access Token (Expires in 15 minutes)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m"
  });
}

/**
 * Generates a Refresh Token (Expires in 7 days)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d"
  });
}

/**
 * Verifies and decodes a token enforcing HS256 signature algorithm.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"]
  }) as TokenPayload;
}
