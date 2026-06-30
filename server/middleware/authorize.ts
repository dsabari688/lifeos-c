import { Response, NextFunction } from "express";
import { dbService } from "../db/index.js";
import { UserRole } from "../security/permissions.js";

/**
 * Middleware to restrict endpoints based on user security roles (Admin, User, Guest).
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: any, res: any, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Access denied. Authentication context is required." });
    }

    const db = dbService.getDatabaseState();
    const user = db.users?.find((u: any) => u.id === req.user.id);
    
    // Default to "User" tier if no explicit role has been assigned
    const userRole = ((user as any)?.role || "User") as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "Access Forbidden: Insufficient clearance level."
      });
    }

    next();
  };
};
