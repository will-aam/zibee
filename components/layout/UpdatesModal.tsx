"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { appUpdates } from "@/lib/changelog";

export function UpdatesModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Escuta o "grito" (evento) disparado pelo sino nas Headers e lê a URL
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);

    window.addEventListener("zibee:open-updates", handleOpen);

    // --- A PONTE PERFEITA: DETECTOR DE URL DO PUSH ---
    // Checa se a URL tem o gatilho "?novidades=true"
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);

      if (searchParams.get("novidades") === "true") {
        setIsOpen(true); // Abre o modal na cara do usuário

        // Salva que ele já viu, para o sininho não ficar com a bolinha vermelha
        if (appUpdates.length > 0) {
          localStorage.setItem("zibee_last_seen_update", appUpdates[0].id);
        }

        // Mágica de UX: Limpa a URL silenciosamente para "?novidades=true" sumir da barra
        // Assim, se ele atualizar a página (F5), o modal não abre de novo à toa.
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
    // -------------------------------------------------

    return () => {
      window.removeEventListener("zibee:open-updates", handleOpen);
    };
  }, []);

  if (!appUpdates || appUpdates.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Usamos um z-[9999] para garantir que fique por cima de tudo */}
      <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl z-9999 max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-muted/20 border-b border-border/50">
          <DialogTitle className="text-xl flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-primary" />
            Novidades do Zibee
          </DialogTitle>
          <DialogDescription className="pt-1">
            Fique por dentro das últimas atualizações e recursos.
          </DialogDescription>
        </DialogHeader>

        {/* Área rolável com as novidades */}
        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {appUpdates.map((update, index) => {
            // A novidade mais recente ganha destaque total. As antigas ficam um pouco transparentes.
            const isLatest = index === 0;

            return (
              <div
                key={update.id}
                className={`space-y-3 ${!isLatest ? "pt-6 border-t border-border/50 opacity-75 hover:opacity-100 transition-opacity" : ""}`}
              >
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-primary uppercase mb-1">
                    {update.date}
                  </p>
                  <h3 className="text-lg font-extrabold text-foreground leading-tight">
                    {update.title}
                  </h3>
                </div>

                <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                  {update.shortDescription}
                </p>

                <div
                  className={`space-y-3 mt-4 p-4 rounded-2xl ${isLatest ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-border/50"}`}
                >
                  {update.fullDescription.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm text-muted-foreground leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
