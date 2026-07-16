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

const port = z.coerce.number().int().positive();
const defaultBotMode = process.env.NODE_ENV === "production" ? "webhook" : "polling";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BOT_TOKEN: z.string().min(1),
  WEB_APP_URL: z.string().url(),
  API_PUBLIC_URL: optionalUrl,
  SUPPORT_URL: optionalUrl,
  PORT: port.optional(),
  BOT_MODE: z.preprocess(
    (value) => (value === undefined || value === "" ? defaultBotMode : value),
    z.enum(["polling", "webhook"]),
  ),
  BOT_PUBLIC_URL: optionalUrl,
  BOT_WEBHOOK_URL: optionalUrl,
  BOT_WEBHOOK_PATH: z.string().startsWith("/").default("/telegram/webhook"),
  BOT_WEBHOOK_SECRET: optionalString,
  BOT_PORT: port.default(4010),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && !value.API_PUBLIC_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["API_PUBLIC_URL"],
      message: "API_PUBLIC_URL is required in production. It must point to the public API HTTPS URL.",
    });
  }

  if (value.NODE_ENV === "production" && value.BOT_MODE !== "webhook") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["BOT_MODE"],
      message: "BOT_MODE=webhook is required in production. Use polling only for development.",
    });
  }

  if (value.BOT_MODE === "webhook") {
    const webhookUrl = value.BOT_WEBHOOK_URL ?? value.BOT_PUBLIC_URL;

    if (!webhookUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOT_PUBLIC_URL"],
        message: "BOT_PUBLIC_URL or BOT_WEBHOOK_URL is required in webhook mode.",
      });
    } else if (new URL(webhookUrl).protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.BOT_WEBHOOK_URL ? ["BOT_WEBHOOK_URL"] : ["BOT_PUBLIC_URL"],
        message: "Telegram webhooks require a public HTTPS URL.",
      });
    }

    if (value.NODE_ENV === "production" && !value.BOT_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOT_WEBHOOK_SECRET"],
        message: "BOT_WEBHOOK_SECRET is required in production webhook mode.",
      });
    }
  }
});

export const env = envSchema.parse(process.env);
export const apiPublicUrl = (env.API_PUBLIC_URL ?? "http://localhost:4000").replace(/\/+$/, "");
export const botHttpPort = env.PORT ?? env.BOT_PORT;

function buildBotWebhookUrl() {
  if (env.BOT_WEBHOOK_URL) {
    return env.BOT_WEBHOOK_URL;
  }

  if (env.BOT_PUBLIC_URL) {
    return new URL(env.BOT_WEBHOOK_PATH, `${env.BOT_PUBLIC_URL.replace(/\/+$/, "")}/`).toString();
  }

  return undefined;
}

export const botWebhookUrl = buildBotWebhookUrl();
export const botWebhookPath = botWebhookUrl ? new URL(botWebhookUrl).pathname : env.BOT_WEBHOOK_PATH;

export function appUrl(path = "/") {
  const url = new URL(path, env.WEB_APP_URL);
  return url.toString();
}

export function canUseTelegramWebApp() {
  return new URL(env.WEB_APP_URL).protocol === "https:";
}
