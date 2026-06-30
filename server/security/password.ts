import bcrypt from "bcrypt";

// Password policy: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validates password strength against security policy rules.
 */
export function validatePasswordStrength(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

/**
 * Hashes password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!validatePasswordStrength(password)) {
    throw new Error(
      "Password policy violation: Must be at least 8 characters long, contain uppercase, lowercase, a number, and a special character."
    );
  }
  return bcrypt.hash(password, 12);
}

/**
 * Compares plaintext password with stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
