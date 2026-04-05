"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function PWAUpdater() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Dispara quando o SW executa o "skipWaiting" e assume a página
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // 1. Avisa o usuário para evitar o susto do reload
        toast({
          title: "Atualização disponível ✨",
          description: "A aplicar a nova versão do Zibee...",
          duration: 3000,
        });

        // 2. Dá tempo para ler o aviso e força o recarregamento
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      });
    }
  }, [toast]);

  return null; // Componente totalmente invisível
}
