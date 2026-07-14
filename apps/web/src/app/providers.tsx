"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { configureTelegramTheme } from "@/lib/telegram";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  useEffect(() => {
    configureTelegramTheme();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
