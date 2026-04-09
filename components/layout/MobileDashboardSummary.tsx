"use client";

import * as React from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  WalletIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

function formatMoneyBRL(value: number) {
  return (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function maskMoney(hidden: boolean, value: number) {
  return hidden ? "R$ ****" : formatMoneyBRL(value);
}

type NavigateTarget = "recorrencia_mensal" | "despesas_fixas";

interface MobileDashboardSummaryProps {
  saldoGeral: number; // Mantido por compatibilidade da prop, mas recalculamos abaixo
  entradasConfirmadas: number;
  gastosVariaveis: number;
  contasFixasMensais: number;
  onNavigate?: (target: NavigateTarget) => void;
}

const STORAGE_KEY = "mobile-dashboard-values-hidden";

export default function MobileDashboardSummary({
  saldoGeral,
  entradasConfirmadas,
  gastosVariaveis,
  contasFixasMensais,
  onNavigate,
}: MobileDashboardSummaryProps) {
  const [hidden, setHidden] = React.useState(false);

  const hasEntradas = entradasConfirmadas > 0;

  // MÁGICA AQUI: Recalculando o Saldo Geral com a nova lógica (igual ao Desktop)
  const saldoGeralCalculado = React.useMemo(() => {
    if (!hasEntradas) return 0;
    return entradasConfirmadas - gastosVariaveis - contasFixasMensais;
  }, [entradasConfirmadas, gastosVariaveis, contasFixasMensais, hasEntradas]);

  // Carrega o estado e escuta se o Desktop mandou ocultar também
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
    } catch {
      // ignore
    }
  };

  const displaySaldoGeral = !hasEntradas
    ? "****"
    : maskMoney(hidden, saldoGeralCalculado);
  const displayEntradas = maskMoney(hidden, entradasConfirmadas);
  const displayGastos = maskMoney(hidden, gastosVariaveis);
  const displayFixas = maskMoney(hidden, contasFixasMensais);

  return (
    <section className="-mt-12 px-4 md:hidden relative z-10">
      <div className="rounded-3xl bg-card shadow-sm border border-border/50 overflow-hidden">
        {/* TOPO: SALDO GERAL + OLHO */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">
                Saldo geral
              </p>

              <p
                className={cn(
                  "text-3xl font-bold tracking-tight mt-0.5",
                  saldoGeralCalculado >= 0
                    ? "text-foreground"
                    : "text-destructive",
                )}
              >
                {displaySaldoGeral}
              </p>

              {!hasEntradas && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Sem entradas confirmadas no período
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={toggleHidden}
              className="shrink-0 h-12 w-12 rounded-full hover:bg-muted/50 active:bg-muted transition flex items-center justify-center text-muted-foreground"
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent mx-4" />

        <div className="px-2 py-2">
          {/* Entradas confirmadas */}
          <div className="w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/10 text-green-600 dark:text-green-500 flex items-center justify-center">
              <ArrowTrendingUpIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Entradas Confirmadas
              </p>
              <p className="text-xs text-muted-foreground">
                Já recebido em conta
              </p>
            </div>

            <p className="text-sm font-bold text-green-600 dark:text-green-500 tracking-tight shrink-0">
              {displayEntradas}
            </p>
          </div>

          {/* Gastos variáveis */}
          <div className="w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 text-destructive flex items-center justify-center">
              <ArrowTrendingDownIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Gastos Variáveis
              </p>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </div>

            <p className="text-sm font-bold text-destructive tracking-tight shrink-0">
              {displayGastos}
            </p>
          </div>

          {/* Contas fixas mensais */}
          <div
            role="button"
            onClick={() => onNavigate?.("despesas_fixas")}
            className="w-full text-left px-3 py-3 rounded-2xl hover:bg-muted/50 active:bg-muted/80 transition flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors group-hover:bg-blue-500/20">
              <WalletIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Contas Fixas Mensais
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                Recorrência mensal
                <ArrowRightIcon className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </p>
            </div>

            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-tight shrink-0">
              {displayFixas}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
