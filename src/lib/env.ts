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
  // Coolify injects SERVICE_URL_ICECAST for the public Icecast reverse proxy.
  // Use it for browser playback so audio does not pass through the Next.js app server.
  SERVICE_URL_ICECAST: z.string().url().optional(),
  STREAM_SOURCE_HOST: z.string().default("icecast"),
  ICECAST_SOURCE_PORT: z.coerce.number().int().positive().default(8000),
  ICECAST_SOURCE_PASSWORD: z.string().transform((v) => v.trim() || "sourcepass").default("sourcepass"),
  METRICS_POLL_SECRET: z.string().default("openradio-internal"),
  UPLOAD_DIR: z.string().default("/tmp/openradio-uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52428800),
  LIQ_CONFIG_DIR: z.string().default("/app/liquidsoap-configs"),
  NGINX_GEO_DIR: z.string().default("/app/nginx-geo"),
  ICECAST_ACL_DIR: z.string().default("/app/icecast-acl"),
  // Email — all optional; if unset, reset links are logged to stdout
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("noreply@openradio.local"),
  SUPER_ADMIN_EMAILS: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
