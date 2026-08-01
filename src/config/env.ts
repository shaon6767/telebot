import { z } from "zod";

/**
 * Validates all required environment variables at startup.
 * Fails fast with a clear error instead of crashing later, mid-flow,
 * with a cryptic "undefined is not a function" somewhere deep in the bot.
 */
const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  WEBHOOK_SECRET: z
    .string()
    .min(16, "WEBHOOK_SECRET must be at least 16 characters"),
  WEBHOOK_URL: z.string().url("WEBHOOK_URL must be a valid HTTPS URL"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  EXPIRY_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
