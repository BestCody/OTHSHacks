import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  SECURITY_CONTACT_EMAIL: z.string().email().default("security@othacks.ca"),
  ORGANIZER_EMAIL_DOMAIN: z.string().default("othacks.ca"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("OTHacks <noreply@othacks.ca>"),
  FILE_SCAN_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  FILE_SCAN_CALLBACK_SECRET: z.string().min(32).optional(),
  ALLOW_UNSCANNED_FILES: z.enum(["true", "false"]).default("false"),
  LOG_DRAIN_URL: z.string().url().optional().or(z.literal("")),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = serverSchema.parse(process.env);
  }
  return cached;
}

export function getOptionalPublicEnv() {
  return {
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
    plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "",
  };
}
