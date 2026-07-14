"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  WalletIcon,
} from "@heroicons/react/24/solid";

export function ExpenseCategories({
  categoriasChart,
  expandedCategory,
  setExpandedCategory,
  totalDespesas,
  totalDespesasFixas,
  formatMoney,
  togglePagoLancamento,
}: any) {
  return (
    <section>
      <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
        <ArrowTrendingDownIcon className="h-5 w-5 text-orange-500" /> Onde estou
        gastando?
      </h2>
      <div className="space-y-4">
        {categoriasChart.length > 0 ? (
          categoriasChart.map((item: any, index: number) => {
            const isExpanded = expandedCategory === item.name;
            return (
              <div key={index} className="space-y-1.5 transition-all">
                <div
                  className="flex items-center justify-between text-sm cursor-pointer select-none hover:opacity-80 py-1"
                  onClick={() =>
                    setExpandedCategory(isExpanded ? null : item.name)
                  }
                >
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-300",
                        isExpanded && "rotate-180",
                      )}
                    />
                    {item.name}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {formatMoney(item.value)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-700 ease-out"
                    style={{
                      width:
                        totalDespesas + totalDespesasFixas > 0
                          ? `${(item.value / (totalDespesas + totalDespesasFixas)) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                {isExpanded && (
                  <div className="pt-2 pb-2 pl-6 pr-2 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    {item.items.map((despesa: any, idx: number) => {
                      const isFixedTemplate = !!despesa.dia_vencimento;
                      const isPago = despesa.pago;
                      const dataDisplay = isFixedTemplate
                        ? `Todo dia ${despesa.dia_vencimento}`
                        : new Date(despesa.data_vencimento).toLocaleDateString(
                            "pt-BR",
                            { timeZone: "UTC" },
                          );
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs border-b border-border/40 last:border-0 pb-2 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            {!isFixedTemplate && !despesa.cartao_id ? (
                              <Checkbox
                                checked={isPago}
                                onCheckedChange={() =>
                                  togglePagoLancamento(despesa.id, isPago)
                                }
                                className="h-4 w-4 rounded-md"
                              />
                            ) : (
                              <WalletIcon
                                className="h-4 w-4 text-blue-500/60"
                                title={
                                  despesa.cartao_id
                                    ? "Compra no Cartão"
                                    : "Conta Fixa"
                                }
                              />
                            )}
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  "font-medium",
                                  isPago &&
                                    "line-through text-muted-foreground",
                                )}
                              >
                                {despesa.descricao || despesa.nome}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {dataDisplay} {isFixedTemplate && " (Fixa)"}
                              </span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "font-semibold",
                              isPago
                                ? "text-muted-foreground"
                                : "text-foreground",
                            )}
                          >
                            {formatMoney(Number(despesa.valor))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground bg-accent/30 p-4 rounded-xl border border-dashed">
            Sem gastos registrados neste período.
          </div>
        )}
      </div>
    </section>
  );
}
