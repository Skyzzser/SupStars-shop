import { Router } from "express";
import { createOrderRequestSchema } from "@suupstars/shared";
import { ApiError } from "../lib/http.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireTelegramUser } from "../middleware/auth.js";
import { orderToDto } from "../services/mapper.js";
import { cancelUserOrder, createOrder, getUserOrder, listUserOrders } from "../services/orders.service.js";

export const ordersRouter = Router();

ordersRouter.use(requireTelegramUser);

function getOrderId(id: string | string[] | undefined) {
  if (!id || Array.isArray(id)) {
    throw new ApiError(400, "ID заказа обязателен", "ORDER_ID_REQUIRED");
  }

  return id;
}

ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const input = createOrderRequestSchema.parse(req.body);
    const order = await createOrder(input, req.authUser);
    res.status(201).json({ order: orderToDto(order) });
  }),
);

ordersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const orders = await listUserOrders(req.authUser);
    res.json({ orders: orders.map(orderToDto) });
  }),
);

ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const order = await getUserOrder(getOrderId(req.params.id), req.authUser);
    res.json({ order: orderToDto(order) });
  }),
);

ordersRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const order = await cancelUserOrder(getOrderId(req.params.id), req.authUser);
    res.json({ order: orderToDto(order) });
  }),
);
