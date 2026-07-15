import { Router } from "express";
import { ApiError } from "../lib/http.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireTelegramUser } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get(
  "/",
  requireTelegramUser,
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    res.json({
      user: {
        telegramId: req.authUser.telegramId.toString(),
        username: req.authUser.username,
        firstName: req.authUser.firstName,
        isAdmin: req.authUser.isAdmin,
      },
    });
  }),
);
