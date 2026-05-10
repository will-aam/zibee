// components/providers/query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inicializamos o cliente dentro de um useState para garantir que os dados
  // não vazem entre diferentes usuários se houver renderização no servidor.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // A Mágica do Cache: Guarda os dados por 5 minutos sem recarregar o banco
            refetchOnWindowFocus: false, // Não faz requisições à toa só porque o usuário mudou de aba no celular
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Ferramenta incrível de debug (só aparece no modo desenvolvedor) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
