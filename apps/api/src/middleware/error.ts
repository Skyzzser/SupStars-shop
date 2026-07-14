import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/http.js";

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    const details = error.flatten();

    console.warn("API validation error", {
      method: req.method,
      path: req.path,
      details,
    });

    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Ошибка валидации данных",
        details,
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    console.warn("API request error", {
      method: req.method,
      path: req.path,
      status: error.statusCode,
      code: error.code,
      message: error.message,
    });

    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error("Unhandled API error", {
    method: req.method,
    path: req.path,
    error,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Внутренняя ошибка сервера",
    },
  });
}
