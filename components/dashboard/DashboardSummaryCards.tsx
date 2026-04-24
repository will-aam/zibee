"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  WalletIcon,
  CalendarIcon,
} from "@heroicons/react/24/solid";

export function DashboardSummaryCards({
  totalReceitas,
  totalVariaveis,
  totalFixas,
  listaFixas,
  saldoGeral,
  hidden,
  formatMoney,
  activeContext,
}: any) {
  const [isFixasModalOpen, setIsFixasModalOpen] = useState(false);

  return (
    <>
      <div
        className={`grid gap-6 ${activeContext === "pessoal" ? "grid-cols-4" : "grid-cols-3"}`}
      >
        <div className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
            <ArrowTrendingUpIcon className="h-4 w-4" /> Entradas Confirmadas
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {formatMoney(totalReceitas)}
          </div>
        </div>

        <div className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
            <ArrowTrendingDownIcon className="h-4 w-4" /> Gastos Variáveis
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {formatMoney(totalVariaveis)}
          </div>
        </div>

        {activeContext === "pessoal" && (
          <div
            onClick={() => setIsFixasModalOpen(true)}
            className="pb-4 border-b border-border/50 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
              <WalletIcon className="h-4 w-4" /> Contas Fixas
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {formatMoney(totalFixas)}
            </div>
          </div>
        )}

        <div className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            Saldo Geral Previsto
          </div>
          <div
            className={`text-3xl font-bold tracking-tight ${saldoGeral >= 0 ? "text-foreground" : "text-destructive"}`}
          >
            {totalReceitas > 0 ? formatMoney(saldoGeral) : "****"}
          </div>
          {totalReceitas <= 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sem entradas confirmadas
            </p>
          )}
        </div>
      </div>

      <Dialog open={isFixasModalOpen} onOpenChange={setIsFixasModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 gap-0">
          <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <WalletIcon className="h-6 w-6 text-blue-500" /> Minhas Contas
              Fixas
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {listaFixas.length > 0 ? (
              <div className="flex flex-col">
                {listaFixas.map((fixa: any) => (
                  <div
                    key={fixa.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/30 border-b border-border/40 last:border-0 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {fixa.descricao || fixa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="h-3 w-3" /> Dia{" "}
                        {fixa.dia_vencimento}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatMoney(fixa.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma conta fixa ativa no momento.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
