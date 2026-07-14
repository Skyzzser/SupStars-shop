import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BOT_TOKEN: z.string().min(1),
  WEB_APP_URL: z.string().url(),
  API_PUBLIC_URL: optionalUrl,
  SUPPORT_URL: optionalUrl,
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  BOT_WEBHOOK_URL: optionalUrl,
  BOT_WEBHOOK_SECRET: optionalString,
  BOT_PORT: z.coerce.number().int().positive().default(4010),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && !value.API_PUBLIC_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["API_PUBLIC_URL"],
      message: "API_PUBLIC_URL is required in production. It must point to the public API HTTPS URL.",
    });
  }
});

export const env = envSchema.parse(process.env);
export const apiPublicUrl = (env.API_PUBLIC_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export function appUrl(path = "/") {
  const url = new URL(path, env.WEB_APP_URL);
  return url.toString();
}

export function canUseTelegramWebApp() {
  return new URL(env.WEB_APP_URL).protocol === "https:";
}
