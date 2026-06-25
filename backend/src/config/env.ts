import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, validated environment configuration.
 *
 * The process fails fast at startup if any required variable is missing or
 * malformed, so the rest of the codebase can treat `env` as a fully-typed,
 * always-valid object.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  // ─── File uploads ─────────────────────────────────────────────────────────
  /** Directory where uploaded files are stored (relative to cwd or absolute). */
  UPLOAD_DIR: z.string().default('./uploads'),
  /** Maximum size of a single uploaded file, in bytes. Default 5 MiB. */
  UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(5_242_880),
  /** Maximum number of files accepted in a single multipart request. */
  UPLOAD_MAX_FILES_PER_REQUEST: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment configuration:\n',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Name of the httpOnly cookie that carries the auth JWT. */
export const AUTH_COOKIE = 'access_token';
