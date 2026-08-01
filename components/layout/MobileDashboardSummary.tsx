"use client";

import * as React from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  WalletIcon,
  ArrowRightIcon,
  CalendarIcon,
  BanknotesIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatMoneyBRL(value: number) {
  return (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function maskMoney(hidden: boolean, value: number) {
  return hidden ? "R$ ****" : formatMoneyBRL(value);
}

type NavigateTarget = "recorrencia_mensal" | "despesas_fixas" | "lancamentos";

interface MobileDashboardSummaryProps {
  saldoGeral: number; // Mantido por compatibilidade da prop
  entradasConfirmadas: number;
  gastosVariaveis: number;
  contasFixasMensais: number;
  listaFixas?: any[];
  totalFixasPagas?: number; // NOVO: Prop para receber as fixas já pagas do Dashboard
  onNavigate?: (target: NavigateTarget) => void;
  forceDesktop?: boolean;
  userName?: string;
}

const STORAGE_KEY = "mobile-dashboard-values-hidden";

export default function MobileDashboardSummary({
  saldoGeral,
  entradasConfirmadas,
  gastosVariaveis,
  contasFixasMensais,
  listaFixas = [],
  totalFixasPagas = 0, // Inicia em 0 caso o pai ainda não passe
  onNavigate,
  forceDesktop = false,
  userName = "Usuário",
}: MobileDashboardSummaryProps) {
  const [hidden, setHidden] = React.useState(false);
  const [isFixasModalOpen, setIsFixasModalOpen] = React.useState(false);

  // MÁGICA DO CARD MUTANTE NO MOBILE
  const isSemReceita = entradasConfirmadas <= 0;
  const totalGastoMes = gastosVariaveis + contasFixasMensais;
  const saldoDinheiroEmMaos =
    entradasConfirmadas - gastosVariaveis - totalFixasPagas;

  const valorPrincipal = isSemReceita ? totalGastoMes : saldoDinheiroEmMaos;

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

  const displayValorPrincipal = maskMoney(hidden, valorPrincipal);
  const displayEntradas = maskMoney(hidden, entradasConfirmadas);
  const displayGastos = maskMoney(hidden, gastosVariaveis);
  const displayFixas = maskMoney(hidden, contasFixasMensais);

  return (
    <>
      <section className={cn("relative z-10", forceDesktop ? "hidden md:flex flex-col justify-center bg-zinc-950 rounded-[32px] p-6 text-white shadow-xl h-full" : "md:hidden")}>
        <div className="w-full flex flex-col gap-6">

          {/* TOPO: O CARD MUTANTE */}
          <div className="px-5 pt-3 pb-2 relative flex flex-col items-center text-center">
            {/* Botão de Olho Removido (Movido para o MobileHeader) */}

            <div className="flex-1 min-w-0 flex flex-col items-center max-w-[80%]">
              {/* Título Dinâmico */}
              <div
                className={`flex items-center gap-1.5 text-sm font-semibold mb-1 ${
                  isSemReceita ? "text-orange-400" : "text-emerald-400"
                }`}
              >
                {isSemReceita ? (
                  <>
                    <ArrowTrendingDownIcon className="h-4 w-4" /> Total Gasto
                    no Mês
                  </>
                ) : (
                  <>
                    <BanknotesIcon className="h-4 w-4" /> Saldo Atual
                  </>
                )}
              </div>

              <p className="text-4xl font-bold tracking-tight mt-1 text-white">
                {displayValorPrincipal}
              </p>

              {/* Subtítulo Dinâmico */}
              <p className="text-xs text-white/70 mt-2 font-medium">
                {isSemReceita
                  ? "Soma de Variáveis + Contas Fixas"
                  : "Dinheiro livre (ignora fixas não pagas)"}
              </p>
            </div>
          </div>

          <div className="px-2 pb-2">
            <div className="flex flex-col">
              {/* Entradas confirmadas */}
              <div className="w-full text-left px-3 py-2 flex items-center gap-3">
                <ArrowTrendingUpIcon className="h-5 w-5 shrink-0 text-emerald-400" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    Entradas Confirmadas
                  </p>
                  {!forceDesktop && (
                    <p className="text-xs text-white/60">
                      Já recebido em conta
                    </p>
                  )}
                </div>

                <p className="text-sm font-bold text-emerald-400 tracking-tight shrink-0">
                  {displayEntradas}
                </p>
              </div>

              {/* Gastos variáveis */}
              <div className="w-full text-left px-3 py-2 flex items-center gap-3">
                <ArrowTrendingDownIcon className="h-5 w-5 shrink-0 text-red-400" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    Gastos Variáveis
                  </p>
                  {!forceDesktop && (
                    <p className="text-xs text-white/60">Total acumulado</p>
                  )}
                </div>

                <p className="text-sm font-bold text-red-400 tracking-tight shrink-0">
                  {displayGastos}
                </p>
              </div>

              {/* Contas fixas mensais - ABRE O MODAL */}
              <div
                role="button"
                onClick={() => setIsFixasModalOpen(true)}
                className="w-full text-left px-3 py-2 hover:bg-white/5 active:bg-white/10 rounded-2xl transition flex items-center gap-3 cursor-pointer group"
              >
                <WalletIcon className="h-5 w-5 shrink-0 text-blue-400 transition-colors group-hover:text-blue-300" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                    Contas Fixas
                  </p>
                  {!forceDesktop && (
                    <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
                      Ver lista
                      <ArrowRightIcon className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </p>
                  )}
                </div>

                <p className="text-sm font-bold text-blue-400 tracking-tight shrink-0">
                  {displayFixas}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL INFORMATIVO DE CONTAS FIXAS (MOBILE) */}
      <Dialog open={isFixasModalOpen} onOpenChange={setIsFixasModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-3xl overflow-hidden p-0 gap-0 z-9999">
          <DialogHeader className="p-5 pb-4 bg-muted/30 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <WalletIcon className="h-5 w-5 text-blue-500" />
              Minhas Contas Fixas
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {listaFixas && listaFixas.length > 0 ? (
              <div className="flex flex-col">
                {listaFixas.map((fixa: any) => (
                  <div
                    key={fixa.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/30 border-b border-border/40 last:border-0 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {fixa.descricao || fixa.nome}
                      </p>
                      <p className="text-xs text-foreground/80 flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="h-3 w-3" /> Dia{" "}
                        {fixa.dia_vencimento}
                      </p>
                    </div>
                    <span className="font-bold text-foreground text-sm">
                      {formatMoneyBRL(fixa.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-foreground/80">
                Nenhuma conta fixa ativa no momento.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
