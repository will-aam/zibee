// components/layout/header/MobileHeader.tsx
"use client";

import * as React from "react";
import { Sora } from "next/font/google";
import { FunnelIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import MobileDashboardSummary from "@/components/layout/MobileDashboardSummary";

const sora = Sora({ subsets: ["latin"] });

// --- COMPONENTE IONIC DA CALCULADORA (SOLID E ALINHADO) ---
const CalculatorIonicSolid = ({ className }: { className?: string }) => (
  <div className="flex items-center justify-center">
    {/* @ts-expect-error Tag customizada do Ionicons */}
    <ion-icon
      name="calculator"
      class={className}
      style={{ fontSize: "1.5rem", lineHeight: 1 }}
    />
  </div>
);
// -----------------------------------------------------------

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
      <div className="rounded-3xl bg-background shadow-sm border overflow-hidden animate-pulse">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-3 h-8 w-44 rounded bg-muted" />
          </div>
          <div className="h-10 w-10 rounded-2xl bg-muted" />
        </div>
        <div className="h-px bg-border" />
        <div className="p-2 space-y-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full p-3 rounded-2xl flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-2xl bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="mt-2 h-3 w-20 rounded bg-muted" />
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
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
  onNavigate,
  onOpenProfile,
  onOpenFilter,
}: MobileHeaderProps) {
  if (activeTab !== "dashboard") return null;

  return (
    <section className={`md:hidden relative ${sora.className}`}>
      <header
        id="mobile-header-top"
        className="relative overflow-hidden bg-primary text-primary-foreground px-4 pt-[max(22px,env(safe-area-inset-top))] pb-24"
      >
        <div className="relative z-10 flex items-center gap-4 mb-2">
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
            <button
              onClick={() => onNavigate("receitas")}
              className="shrink-0 p-2.5 rounded-2xl active:scale-95 transition hover:bg-white/10"
              title="Planejamento"
            >
              <CalculatorIonicSolid className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={() => onNavigate("configuracoes")}
              className="shrink-0 p-2.5 rounded-2xl active:scale-95 transition hover:bg-white/10"
              title="Configurações"
            >
              <Cog6ToothIcon className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={onOpenFilter}
              className="shrink-0 p-2.5 rounded-2xl active:scale-95 transition bg-white/10"
              title="Filtrar"
            >
              <FunnelIcon className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 w-full h-16 block text-background"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,64 C180,120 360,120 540,80 C720,40 900,20 1080,40 C1260,60 1350,95 1440,110 L1440,120 L0,120 Z"
          />
        </svg>
      </header>

      {loadingTotals ? (
        <MobileDashboardSummarySkeleton />
      ) : (
        <MobileDashboardSummary
          saldoGeral={saldoGeral}
          entradasConfirmadas={totalReceitas}
          gastosVariaveis={totalDespesas}
          contasFixasMensais={totalDespesasFixas}
          listaFixas={listaFixas}
          onNavigate={onNavigate}
        />
      )}
    </section>
  );
}
