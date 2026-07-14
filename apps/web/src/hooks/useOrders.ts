"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateOrderRequest, OrderStatus, UpdateOrderStatusRequest } from "@suupstars/shared";
import { api } from "@/lib/api";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: api.products,
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["orders", "me"],
    queryFn: api.myOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.order(id),
    enabled: Boolean(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderRequest) => api.createOrder(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.cancelOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useAdminOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ["admin", "orders", status ?? "all"],
    queryFn: () => api.adminOrders(status),
  });
}

export function useAdminUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrderStatusRequest }) =>
      api.adminUpdateStatus(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useAdminUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, internalNote }: { id: string; internalNote: string }) =>
      api.adminUpdateNote(id, internalNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
}
