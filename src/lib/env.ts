import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/openradio?schema=public"),
  SESSION_COOKIE_NAME: z.string().default("orc_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  STREAM_PUBLIC_BASE_URL: z.string().url().default("http://localhost:8000"),
  STREAM_SOURCE_HOST: z.string().default("icecast"),
  ICECAST_SOURCE_PORT: z.coerce.number().int().positive().default(8000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
