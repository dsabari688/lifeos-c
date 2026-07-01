import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditSecrets } from './secrets.js';
import { env } from './env.js';
import { logger } from '../logger.js';

vi.mock('./env.js', () => ({
  env: {
    JWT_SECRET: 'safe-key',
    GROQ_API_KEY: 'groq-key',
    NODE_ENV: 'development'
  }
}));

vi.mock('../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('auditSecrets', () => {
  let originalExit: any;

  beforeEach(() => {
    originalExit = process.exit;
    process.exit = vi.fn() as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('should pass audit if JWT_SECRET is strong and GROQ_API_KEY is defined', () => {
    env.JWT_SECRET = 'strong-and-secure-jwt-key';
    env.GROQ_API_KEY = 'valid-groq-key';
    env.NODE_ENV = 'development';

    auditSecrets();

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('All checks passed successfully'));
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should log warn in development if JWT_SECRET is weak placeholder', () => {
    env.JWT_SECRET = 'your-secret-key-lifeos';
    env.GROQ_API_KEY = 'valid-groq-key';
    env.NODE_ENV = 'development';

    auditSecrets();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Configure a strong key in production'));
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should log error and exit process in production if JWT_SECRET is weak placeholder', () => {
    env.JWT_SECRET = 'your-secret-key-lifeos';
    env.GROQ_API_KEY = 'valid-groq-key';
    env.NODE_ENV = 'production';

    auditSecrets();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Server startup aborted'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log warn if GROQ_API_KEY is missing', () => {
    env.JWT_SECRET = 'strong-and-secure-jwt-key';
    env.GROQ_API_KEY = '';
    env.NODE_ENV = 'development';

    auditSecrets();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('GROQ_API_KEY is not defined'));
  });
});
