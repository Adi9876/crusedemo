import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_BYTES: z.coerce.number().int().positive().default(48),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(16).default(12),
  BYBIT_API_KEY: z.string().min(1, 'BYBIT_API_KEY is required'),
  BYBIT_API_SECRET: z.string().min(1, 'BYBIT_API_SECRET is required'),
  BYBIT_USE_TESTNET: z.enum(['true', 'false']).default('true'),
  PLATFORM_USER_ID: z.string().uuid().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@crusex.com'),
  EMAIL_VERIFICATION_REQUIRED: z.enum(['true', 'false']).default('false')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
