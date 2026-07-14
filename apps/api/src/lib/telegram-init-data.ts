import { createHmac, timingSafeEqual } from "node:crypto";
import type { TelegramUser } from "@suupstars/shared";
import { telegramUserSchema } from "@suupstars/shared";

type ValidationResult =
  | { ok: true; user: TelegramUser; authDate: number }
  | { ok: false; reason: string };

export function validateTelegramInitData(initData: string, botToken: string): ValidationResult {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return { ok: false, reason: "Missing hash" };
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(calculatedHash, "hex");
  const received = Buffer.from(hash, "hex");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "Invalid hash" };
  }

  const userRaw = params.get("user");
  const authDateRaw = params.get("auth_date");

  if (!userRaw || !authDateRaw) {
    return { ok: false, reason: "Missing user or auth_date" };
  }

  const parsedUser = parseJson(userRaw);
  if (!parsedUser.ok) {
    return { ok: false, reason: "Invalid user JSON" };
  }

  const user = telegramUserSchema.safeParse(parsedUser.value);
  const authDate = Number(authDateRaw);

  if (!user.success || Number.isNaN(authDate)) {
    return { ok: false, reason: "Invalid user payload" };
  }

  return { ok: true, user: user.data, authDate };
}

function parseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) as unknown };
  } catch {
    return { ok: false };
  }
}
