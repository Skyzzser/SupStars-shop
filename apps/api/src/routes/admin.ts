import { Router } from "express";
import { ordersQuerySchema, updateAdminNoteSchema, updateOrderStatusSchema } from "@suupstars/shared";
import { ApiError } from "../lib/http.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAdmin, requireTelegramUser } from "../middleware/auth.js";
import { adminOrderToDto } from "../services/mapper.js";
import {
  getAdminOrder,
  listAdminOrders,
  updateInternalNote,
  updateOrderStatus,
} from "../services/orders.service.js";

export const adminRouter = Router();

adminRouter.use(requireTelegramUser, requireAdmin);

function getOrderId(id: string | string[] | undefined) {
  if (!id || Array.isArray(id)) {
    throw new ApiError(400, "Order id is required", "ORDER_ID_REQUIRED");
  }

  return id;
}

adminRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const query = ordersQuerySchema.parse(req.query);
    const orders = await listAdminOrders(query);
    res.json({ orders: orders.map(adminOrderToDto) });
  }),
);

adminRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const order = await getAdminOrder(getOrderId(req.params.id));
    res.json({ order: adminOrderToDto(order) });
  }),
);

adminRouter.patch(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const input = updateOrderStatusSchema.parse(req.body);
    const order = await updateOrderStatus(getOrderId(req.params.id), input.status, req.authUser, input.note);
    res.json({ order: adminOrderToDto(order) });
  }),
);

adminRouter.patch(
  "/orders/:id/note",
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const input = updateAdminNoteSchema.parse(req.body);
    const order = await updateInternalNote(getOrderId(req.params.id), req.authUser, input.internalNote);
    res.json({ order: adminOrderToDto(order) });
  }),
);
