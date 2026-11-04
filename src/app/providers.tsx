"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { GameKitProvider } from "@/lib/gamekit/GameKit";

// Providers de cliente: TanStack Query + i18n + GameKit (íconos y hover). Viven en un Client Component porque
// usan contexto y estado del cliente. El QueryClient se crea una vez por sesión.
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <GameKitProvider>{children}</GameKitProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
