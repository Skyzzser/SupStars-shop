import type { NextFunction, Request, Response } from "express";
import { env, adminTelegramIds } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../lib/http.js";
import { validateTelegramInitData } from "../lib/telegram-init-data.js";

export async function requireTelegramUser(req: Request, _res: Response, next: NextFunction) {
  const initData = req.header("x-telegram-init-data");
  const devTelegramId = req.header("x-dev-telegram-id");

  try {
    const telegramUser = (() => {
      if (initData) {
        const validated = validateTelegramInitData(initData, env.BOT_TOKEN);
        if (!validated.ok) {
          throw new ApiError(401, validated.reason, "INVALID_INIT_DATA");
        }
        return validated.user;
      }

      if (req.header("x-bot-token") === env.BOT_TOKEN && devTelegramId) {
        return {
          id: Number(devTelegramId),
          username: req.header("x-dev-username") ?? undefined,
          first_name: req.header("x-dev-first-name") ?? "Telegram",
        };
      }

      if (env.DEV_ALLOW_BROWSER) {
        return {
          id: Number(devTelegramId ?? "999000111"),
          username: req.header("x-dev-username") ?? "dev_user",
          first_name: "Dev",
        };
      }

      throw new ApiError(401, "Telegram initData is required", "AUTH_REQUIRED");
    })();

    const telegramId = BigInt(telegramUser.id);
    const isAdmin = adminTelegramIds.includes(String(telegramUser.id));

    req.authUser = await prisma.user.upsert({
      where: { telegramId },
      update: {
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        language: telegramUser.language_code ?? null,
        isAdmin,
      },
      create: {
        telegramId,
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        language: telegramUser.language_code ?? null,
        isAdmin,
      },
    });

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.authUser?.isAdmin) {
    next(new ApiError(403, "Admin access required", "ADMIN_REQUIRED"));
    return;
  }

  next();
}
