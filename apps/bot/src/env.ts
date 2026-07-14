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
  BOT_TOKEN: z.string().min(1),
  WEB_APP_URL: z.string().url(),
  API_PUBLIC_URL: z.preprocess(
    (value) => (value === "" || value === undefined ? "http://localhost:4000" : value),
    z.string().url(),
  ),
  SUPPORT_URL: optionalUrl,
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  BOT_WEBHOOK_URL: optionalUrl,
  BOT_WEBHOOK_SECRET: optionalString,
  BOT_PORT: z.coerce.number().int().positive().default(4010),
});

export const env = envSchema.parse(process.env);

export function appUrl(path = "/") {
  const url = new URL(path, env.WEB_APP_URL);
  return url.toString();
}

export function canUseTelegramWebApp() {
  return new URL(env.WEB_APP_URL).protocol === "https:";
}
