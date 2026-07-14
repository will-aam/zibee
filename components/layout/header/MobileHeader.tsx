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
    <section className="-mt-12 px-4 md:hidden">
      <div className="rounded-3xl bg-background/80 backdrop-blur-xl shadow-sm border border-border/50 overflow-hidden">
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
    <section className={`md:hidden relative min-h-[500px] ${sora.className}`}>
      {/* CAMADA DE FUNDO GLOBAL DO COMPONENTE */}
      <div
        className="absolute top-0 left-0 right-0 h-[460px] z-0 bg-linear-to-b from-primary via-primary/95 to-transparent backdrop-blur-xl"
        style={{
          maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 35%, transparent 100%)",
        }}
      />

      {/* CONTEÚDO DO HEADER */}
      <header
        id="mobile-header-top"
        className="relative z-10 bg-transparent text-primary-foreground px-4 pt-[max(22px,env(safe-area-inset-top))] pb-16"
      >
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={onOpenProfile}
            className="relative shrink-0 h-16 w-16 rounded-full flex items-center justify-center ring-2 ring-white/80 ring-offset-2 ring-offset-primary hover:scale-105 active:scale-95 transition"
          >
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-full w-full rounded-full object-cover"
            />
            {pendingInvite && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-blue-500 border-2 border-primary rounded-full" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/85">{getGreeting()},</p>
            <p className="font-semibold text-xl leading-tight truncate text-white">
              {userName}!
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Botão Notificação - sem background, apenas ícone */}
            <button
              onClick={handleOpenUpdates}
              className="relative shrink-0 p-2.5 rounded-2xl active:scale-90 hover:scale-105 transition-all duration-150"
              title="Novidades"
            >
              <BellIcon className="h-6 w-6 text-white" />
              {hasNewUpdates && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-primary" />
                </span>
              )}
            </button>

            {/* Botão Filtro - sem background, apenas ícone */}
            <button
              onClick={onOpenFilter}
              className="shrink-0 p-2.5 rounded-2xl active:scale-90 hover:scale-105 transition-all duration-150"
              title="Filtrar Período"
            >
              <FunnelIcon className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* CAMADA DOS CARDS DE CONTEÚDO */}
      <div className="relative z-10 mt-8 px-4">
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
    </section>
  );
}
