import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsOrigins, env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { errorMiddleware } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin:
        env.NODE_ENV === "production"
          ? (origin, callback) => {
              if (!origin || corsOrigins.includes(origin.replace(/\/+$/, ""))) {
                callback(null, true);
                return;
              }

              callback(new Error(`CORS blocked origin: ${origin}`));
            }
          : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "suupstars-api" });
  });

  app.use("/products", productsRouter);
  app.use("/orders", ordersRouter);
  app.use("/admin", adminRouter);

  app.use(errorMiddleware);

  return app;
}
