import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Returns Express middleware that validates req.body using a Zod Schema.
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: "Validation failed: Malformed input parameters detected.",
          errors: issues
        });
      }
      return res.status(500).json({
        success: false,
        message: "An internal parsing error occurred during parameter validation."
      });
    }
  };
};
