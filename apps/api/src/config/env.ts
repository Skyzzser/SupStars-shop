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

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  BOT_TOKEN: z.string().min(1),
  WEB_APP_URL: z.string().url(),
  API_PUBLIC_URL: optionalUrl,
  PUBLIC_WEB_URL: optionalUrl,
  CORS_ORIGINS: z.string().default(""),
  ADMIN_IDS: z.string().default(""),
  ADMIN_USERNAMES: z.string().default(""),
  DEV_ALLOW_BROWSER: booleanFromEnv.default(false),
  SUPPORT_URL: optionalUrl,
  CRYPTOBOT_API_TOKEN: optionalString,
  CRYPTOBOT_API_URL: z.string().url().default("https://pay.crypt.bot"),
  CRYPTOBOT_WEBHOOK_SECRET: optionalString,
  CRYPTOBOT_INVOICE_EXPIRES_IN: z.coerce.number().int().min(1).max(2678400).default(3600),
  MANUAL_WALLET_ENABLED: booleanFromEnv.default(false),
  MANUAL_WALLET_NETWORK: z.string().trim().default("TON"),
  MANUAL_WALLET_ASSET: z.string().trim().default("USDT"),
  MANUAL_WALLET_ADDRESS: optionalString,
  MANUAL_WALLET_MEMO: optionalString,
  MANUAL_WALLET_INSTRUCTIONS: optionalString,
});

export const env = envSchema.parse(process.env);

export const adminTelegramIds = env.ADMIN_IDS.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const adminTelegramUsernames = env.ADMIN_USERNAMES.split(",")
  .map((value) => value.trim().replace(/^@+/, "").toLowerCase())
  .filter(Boolean);

export const manualWalletConfig = {
  enabled: env.MANUAL_WALLET_ENABLED,
  network: env.MANUAL_WALLET_NETWORK,
  asset: env.MANUAL_WALLET_ASSET,
  address: env.MANUAL_WALLET_ADDRESS,
  memo: env.MANUAL_WALLET_MEMO,
  instructions: env.MANUAL_WALLET_INSTRUCTIONS,
};

export const corsOrigins = Array.from(
  new Set(
    [env.WEB_APP_URL, ...env.CORS_ORIGINS.split(",")]
      .map((value) => value.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  ),
);
