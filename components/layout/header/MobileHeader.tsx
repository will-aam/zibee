"use client";

import * as React from "react";
import { sora } from "@/lib/fonts";
import {
  FunnelIcon,
  EllipsisHorizontalIcon,
  MoonIcon,
  SunIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { BellIcon } from "@heroicons/react/24/outline";
import { appUpdates } from "@/lib/changelog";

import MobileDashboardSummary from "@/components/layout/MobileDashboardSummary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

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
  totalFixasPagas?: number; // <-- 1. ABRINDO A PONTE (Interface)
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
  totalFixasPagas = 0, // <-- 2. RECEBENDO NA FUNÇÃO
  onNavigate,
  onOpenProfile,
  onOpenFilter,
}: MobileHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  const [promptInstall, setPromptInstall] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(true);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);

    const checkStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(checkStandalone());

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handler = (e: any) => {
      e.preventDefault();
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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

  const triggerNativeInstall = async () => {
    if (promptInstall) {
      promptInstall.prompt();
      const { outcome } = await promptInstall.userChoice;
      if (outcome === "accepted") {
        setPromptInstall(null);
        setShowInstructions(false);
      }
    }
  };

  if (activeTab !== "dashboard") return null;

  return (
    <section className={`md:hidden relative min-h-[500px] ${sora.className}`}>
      {/* 1. CAMADA DE FUNDO GLOBAL DO COMPONENTE (Z-0) */}
      {/* Esta div agora tem uma altura fixa grande (ex: 460px) para fazer o azul dominar a tela */}
      <div
        className="absolute top-0 left-0 right-0 h-[460px] z-0 bg-linear-to-b from-primary via-primary/95 to-transparent backdrop-blur-xl"
        style={{
          // Uma dissolução super longa: fica 100% visível até 35% da altura e depois some suavemente até os 100%
          maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 35%, transparent 100%)",
        }}
      />

      {/* 2. CONTEÚDO DO HEADER (Z-10 para ficar acima do fundo) */}
      <header
        id="mobile-header-top"
        // Removemos o bg-primary e adicionamos z-10 e bg-transparent
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
            <button
              onClick={handleOpenUpdates}
              className="relative shrink-0 p-2.5 rounded-2xl active:scale-95 transition hover:bg-white/20"
              title="Novidades"
            >
              <BellIcon className="h-6 w-6 text-white" />
              {hasNewUpdates && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-primary"></span>
                </span>
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 p-2.5 rounded-2xl active:scale-95 transition bg-white/10 hover:bg-white/20"
                  title="Menu de Opções"
                >
                  <EllipsisHorizontalIcon className="h-6 w-6 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 p-2 rounded-2xl z-150 shadow-xl border-border/50"
              >
                <DropdownMenuItem
                  onClick={() => onNavigate("receitas")}
                  className="gap-3 p-3 rounded-xl cursor-pointer"
                >
                  <CalculatorIonicSolid className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    Balanço Financeiro
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={onOpenFilter}
                  className="gap-3 p-3 rounded-xl cursor-pointer"
                >
                  <FunnelIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">Filtrar Período</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/50" />

                {!isStandalone && (
                  <DropdownMenuItem
                    onClick={() => setShowInstructions(true)}
                    className="gap-3 p-3 rounded-xl cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    <span className="font-bold text-sm">Instalar App</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="gap-3 p-3 rounded-xl cursor-pointer"
                >
                  {mounted && theme === "dark" ? (
                    <SunIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <MoonIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">Alternar Tema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 3. CAMADA DOS CARDS DE CONTEÚDO (Z-10) */}
      {/* Envolvemos o resumo em uma div com z-10 relativo para garantir que ele fique elegantemente por cima do fundo borrado */}
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

      {/* MODAL DE INSTRUÇÕES DE INSTALAÇÃO */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl z-9999">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <SparklesIcon className="h-6 w-6 text-primary" />
              Instalar Zibee
            </DialogTitle>
            <DialogDescription className="pt-2">
              Tenha a experiência completa, rápida e sem distrações direto na
              tela inicial do seu celular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {promptInstall ? (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
                <p className="text-sm font-medium text-foreground mb-4">
                  Seu dispositivo é totalmente compatível! Clique no botão
                  abaixo para instalar automaticamente.
                </p>
                <Button
                  onClick={triggerNativeInstall}
                  className="w-full rounded-xl h-12 text-md font-bold"
                >
                  Instalar Automaticamente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                  <p className="text-xs font-medium text-destructive">
                    Instalação automática bloqueada pelo seu navegador atual.
                    Siga o passo a passo manual:
                  </p>
                </div>

                {isIOS ? (
                  <div className="flex items-center gap-4 bg-muted/50 border border-border/50 p-4 rounded-2xl">
                    <div className="bg-background p-2 rounded-xl shadow-sm shrink-0">
                      <ShareIcon className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      Toque no botão <strong>Compartilhar</strong> na barra do
                      Safari e selecione{" "}
                      <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-muted/50 border border-border/50 p-4 rounded-2xl">
                    <div className="bg-background p-2 rounded-xl shadow-sm shrink-0">
                      <EllipsisVerticalIcon className="w-6 h-6 text-foreground" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      Toque nos <strong>3 pontinhos</strong> do navegador e
                      selecione <strong>"Instalar Aplicativo"</strong> ou{" "}
                      <strong>"Adicionar à Tela Inicial"</strong>.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowInstructions(false)}
                  className="w-full rounded-xl h-12 text-md font-bold"
                >
                  Entendi, vou fazer isso
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
