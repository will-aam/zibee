"use client";

import * as React from "react";
import Image from "next/image";
import { sora, audiowide } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "next-themes";
import { appUpdates } from "@/lib/changelog";

import { FunnelIcon, BellIcon } from "@heroicons/react/24/outline";

interface DesktopHeaderProps {
  activeTab: string;
  onNavigate?: (tab: string) => void;
  userName: string;
  onOpenFilter: () => void;
}

export function DesktopHeader(props: DesktopHeaderProps) {
  const {
    activeTab,
    onNavigate,
    userName,
    onOpenFilter,
  } = props;

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // LOGICA DO SINO DE NOVIDADES
  const [hasNewUpdates, setHasNewUpdates] = React.useState(false);

  React.useEffect(() => {
    if (appUpdates.length > 0) {
      const latestUpdateId = appUpdates[0].id; // Pega o ID da novidade mais recente
      const lastSeenId = localStorage.getItem("zibee_last_seen_update");

      // Se não houver nada salvo, ou se o ID salvo for diferente do mais recente, brilha!
      if (lastSeenId !== latestUpdateId) {
        setHasNewUpdates(true);
      }
    }
  }, []);

  const handleOpenUpdates = () => {
    // Quando clicado, tira a bolinha vermelha e avisa aos outros componentes
    if (appUpdates.length > 0) {
      localStorage.setItem("zibee_last_seen_update", appUpdates[0].id);
      setHasNewUpdates(false);
      window.dispatchEvent(new Event("zibee:open-updates")); // Aviso global para abrir o Modal
    }
  };





  return (
    <header
      className={`hidden md:flex items-center justify-between px-8 py-5 bg-background/80 backdrop-blur-md sticky top-0 z-50 ${sora.className}`}
    >
      {/* LOGO (Mantido vazio para espaçamento se necessário, ou pode ser removido. Como é justify-between, podemos apenas deixar a div vazia ou tirá-la. Vou deixar vazia para manter o alinhamento dos botões à direita.) */}
      <div className="flex-1"></div>

      {/* CONTROLES DIREITA */}
      <div className="flex items-center gap-3 ml-4">
        {activeTab === "dashboard" && (
          <Button
            variant="outline"
            className="rounded-2xl h-11 px-5"
            onClick={onOpenFilter}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            <span className="text-base font-medium">Filtrar</span>
          </Button>
        )}

        {/* --- NOVO: BOTÃO DE NOTIFICAÇÕES (SINO) --- */}
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-2xl h-11 w-11 hover:bg-muted/50"
          onClick={handleOpenUpdates}
          title="Novidades"
        >
          <BellIcon className="h-5 w-5 text-muted-foreground" />
          {hasNewUpdates && (
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-background"></span>
            </span>
          )}
        </Button>
        {/* ------------------------------------------ */}

      </div>
    </header>
  );
}
