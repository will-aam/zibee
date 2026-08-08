// components/layout/header/MobileHeader.tsx
"use client";

import * as React from "react";
import { sora } from "@/lib/fonts";
import {
  FunnelIcon,
  BellIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { appUpdates } from "@/lib/changelog";

import MobileDashboardSummary from "@/components/layout/MobileDashboardSummary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  activeTab: string;
  userName: string;
  avatarUrl: string;
  pendingInvite: any;
  loadingTotals: boolean;
  saldoGeral: number;
  totalReceitas: number;
  totalDespesas: number;
  totalDespesasFixas: number;
  listaFixas?: any[];
  totalFixasPagas?: number;
  onNavigate: (tab: string) => void;
  onOpenProfile: () => void;
  onOpenFilter: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function MobileDashboardSummarySkeleton() {
  return (
    <section className="md:hidden">
      <div className="w-full">
        <div className="animate-pulse">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="h-4 w-24 rounded-md bg-muted/60" />
              <div className="mt-3 h-8 w-44 rounded-lg bg-muted/60" />
            </div>
            <div className="h-10 w-10 rounded-2xl bg-muted/60" />
          </div>

          <div className="h-px bg-border/50" />

          <div className="p-2 space-y-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full p-3 rounded-2xl flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-2xl bg-muted/60" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded-md bg-muted/60" />
                  <div className="mt-2 h-3 w-20 rounded-md bg-muted/60" />
                </div>
                <div className="h-4 w-16 rounded-md bg-muted/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MobileHeader({
  activeTab,
  userName,
  avatarUrl,
  pendingInvite,
  loadingTotals,
  saldoGeral,
  totalReceitas,
  totalDespesas,
  totalDespesasFixas,
  listaFixas = [],
  totalFixasPagas = 0,
  onNavigate,
  onOpenProfile,
  onOpenFilter,
}: MobileHeaderProps) {
  const [hasNewUpdates, setHasNewUpdates] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  const STORAGE_KEY = "mobile-dashboard-values-hidden";

  const loadPrivacyState = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setHidden(saved === "true");
    } catch {}
  }, []);

  React.useEffect(() => {
    loadPrivacyState();
    window.addEventListener("zibee:privacy-toggled", loadPrivacyState);
    return () => {
      window.removeEventListener("zibee:privacy-toggled", loadPrivacyState);
    };
  }, [loadPrivacyState]);

  const toggleHidden = () => {
    const newVal = !hidden;
    setHidden(newVal);
    try {
      localStorage.setItem(STORAGE_KEY, String(newVal));
      window.dispatchEvent(new Event("zibee:privacy-toggled"));
    } catch {}
  };

  React.useEffect(() => {
    if (appUpdates.length > 0) {
      const latestUpdateId = appUpdates[0].id;
      const lastSeenId = localStorage.getItem("zibee_last_seen_update");

      if (lastSeenId !== latestUpdateId) {
        setHasNewUpdates(true);
      }
    }
  }, []);

  const handleOpenUpdates = () => {
    if (appUpdates.length > 0) {
      localStorage.setItem("zibee_last_seen_update", appUpdates[0].id);
      setHasNewUpdates(false);
      window.dispatchEvent(new Event("zibee:open-updates"));
    }
  };

  if (activeTab !== "dashboard") return null;

  return (
    <section className={`md:hidden relative pb-6 ${sora.className}`}>
      {/* WALLET CARD CONTAINER (Tema Escuro Fixo) */}
      <div className="bg-zinc-950 dark:bg-background text-white rounded-b-[60px] relative z-0 pb-0 overflow-hidden dark:border-b dark:border-white/20">
        
        {/* CONTEÚDO DO HEADER */}
        <header
          id="mobile-header-top"
          className="relative z-10 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-1"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenProfile}
              className="relative shrink-0 h-14 w-14 rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-105 active:scale-95 transition"
            >
              <img
                src={avatarUrl}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full rounded-full object-cover"
              />
              {pendingInvite && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-500 border-2 border-primary rounded-full" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 uppercase tracking-wider font-medium">{getGreeting()},</p>
              <p className="font-semibold text-lg leading-tight truncate text-white">
                {userName}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {/* Botão Notificação */}
              <button
                onClick={handleOpenUpdates}
                className="relative shrink-0 p-2 rounded-xl bg-white/10 active:scale-90 hover:scale-105 transition-all duration-150"
                title="Novidades"
              >
                <BellIcon className="h-5 w-5 text-white" />
                {hasNewUpdates && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-primary" />
                  </span>
                )}
              </button>

              {/* Botão Filtro */}
              <button
                onClick={onOpenFilter}
                className="shrink-0 p-2 rounded-xl bg-white/10 active:scale-90 hover:scale-105 transition-all duration-150 ml-2"
                title="Filtrar Período"
              >
                <FunnelIcon className="h-5 w-5 text-white" />
              </button>
              {/* Botão de Olho */}
              <button
                type="button"
                onClick={toggleHidden}
                className="shrink-0 p-2 rounded-xl bg-white/10 active:scale-90 hover:scale-105 transition-all duration-150 ml-2"
                title={hidden ? "Mostrar valores" : "Ocultar valores"}
              >
                {hidden ? (
                  <EyeSlashIcon className="h-5 w-5 text-white" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* CAMADA DOS CARDS DE CONTEÚDO (DENTRO DA CARTEIRA) */}
        <div className="relative z-10 px-1 mt-0 pb-2">
          {loadingTotals ? (
            <MobileDashboardSummarySkeleton />
          ) : (
            <MobileDashboardSummary
              saldoGeral={saldoGeral}
              entradasConfirmadas={totalReceitas}
              gastosVariaveis={totalDespesas}
              contasFixasMensais={totalDespesasFixas}
              listaFixas={listaFixas}
              totalFixasPagas={totalFixasPagas}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </div>
    </section>
  );
}
