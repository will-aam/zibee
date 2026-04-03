"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
} from "lucide-react";

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
  saldoGeral: number;
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

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setHidden(true);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hidden));
    } catch {
      // ignore
    }
  }, [hidden]);

  const displaySaldoGeral = !hasEntradas
    ? "****"
    : maskMoney(hidden, saldoGeral);
  const displayEntradas = maskMoney(hidden, entradasConfirmadas);
  const displayGastos = maskMoney(hidden, gastosVariaveis);
  const displayFixas = maskMoney(hidden, contasFixasMensais);

  return (
    <section className="-mt-12 px-4 md:hidden">
      <div className="rounded-2xl bg-background shadow-sm border overflow-hidden">
        {/* Topo: Saldo geral + olho */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Saldo geral</p>

              <p className="text-2xl font-bold tracking-tight">
                {displaySaldoGeral}
              </p>

              {!hasEntradas && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sem entradas confirmadas no período
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setHidden((prev) => !prev)}
              className="shrink-0 h-10 w-10 rounded-2xl hover:bg-muted/50 transition flex items-center justify-center"
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent mx-4 my-2" />

        <div className="px-2 py-2">
          {/* Entradas confirmadas */}
          <div className="w-full text-left px-3 py-3 rounded-2xl hover:bg-muted/40 transition flex items-center gap-3">
            <div className="h-10 w-10 rounded-full    h bg-green-500/10 text-green-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Entradas Confirmadas</p>
              <p className="text-xs text-muted-foreground">
                Já recebido em conta
              </p>
            </div>

            <p className="text-sm font-semibold text-green-600">
              {displayEntradas}
            </p>
          </div>

          {/* Gastos variáveis */}
          <div className="w-full text-left px-3 py-3 rounded-2xl hover:bg-muted/40 transition flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Gastos Variáveis</p>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </div>

            <p className="text-sm font-semibold text-red-600">
              {displayGastos}
            </p>
          </div>

          {/* Contas fixas mensais */}
          <div className="w-full text-left px-3 py-3 rounded-2xl hover:bg-muted/40 transition flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Contas Fixas Mensais</p>

              <button
                type="button"
                onClick={() => onNavigate?.("despesas_fixas")}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:underline"
              >
                Recorrência mensal
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-blue-600">
              {displayFixas}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
