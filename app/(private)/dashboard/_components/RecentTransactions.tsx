"use client";

import React, { useMemo } from "react";
import type { Lancamento, DespesaFixa } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@heroicons/react/24/solid";

interface RecentTransactionsProps {
  despesas: Lancamento[];
  fixas: DespesaFixa[];
  receitas: Lancamento[]; // If available, pass them to show income too
  formatMoney: (val: number) => string;
  hidden: boolean;
  onNavigate?: (tab: string) => void;
}

export function RecentTransactions({
  despesas,
  fixas,
  receitas = [],
  formatMoney,
  hidden,
  onNavigate,
}: RecentTransactionsProps) {
  const recentTransactions = useMemo(() => {
    // Combine all transactions
    const all = [
      ...despesas.map(d => ({ ...d, isReceita: d.tipo === "Receita" })),
      ...fixas.map(f => ({ ...f, isReceita: false, data_vencimento: new Date().toISOString().split('T')[0] })), // simplificado para fixas
      ...receitas.map(r => ({ ...r, isReceita: true }))
    ];

    // Sort by date descending (most recent first)
    // We assume data_vencimento is YYYY-MM-DD
    return all
      .sort((a, b) => {
        const dateA = new Date(a.data_vencimento || new Date()).getTime();
        const dateB = new Date(b.data_vencimento || new Date()).getTime();
        return dateB - dateA;
      })
      .slice(0, 6); // Get top 6
  }, [despesas, fixas, receitas]);

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          Transações Recentes
        </h2>
        <button 
          onClick={() => onNavigate?.("lancamentos")}
          className="text-sm font-semibold text-primary hover:underline transition-all"
        >
          Ver Todas
        </button>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma transação recente encontrada.
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {recentTransactions.map((txItem, idx) => {
            const tx = txItem as any;
            const isIncome = tx.isReceita;
            
            // Generate a fake avatar/icon color based on category
            const avatarColor = isIncome ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600";
            
            // Name fallback
            const displayName = tx.descricao || tx.nome || "Transação";

            return (
              <div key={`${tx.id}-${idx}`} className="flex items-center justify-between p-4 bg-card border border-border/50 shadow-sm rounded-2xl hover:border-primary/50 transition-colors cursor-default mb-3">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${avatarColor}`}>
                    {isIncome ? (
                      <ArrowUpRightIcon className="h-5 w-5" />
                    ) : (
                      <ArrowDownRightIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-[15px] truncate max-w-[180px] xl:max-w-[220px]">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {tx.categoria || "Sem categoria"}
                      {tx.data_vencimento && ` • ${format(new Date(tx.data_vencimento + "T12:00:00"), "dd MMM", { locale: ptBR })}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${isIncome ? "text-emerald-500" : "text-foreground"}`}>
                    {isIncome ? "+" : "-"}{formatMoney(Number(tx.valor || 0))}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    {tx.pago ? "Concluído" : "Pendente"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
