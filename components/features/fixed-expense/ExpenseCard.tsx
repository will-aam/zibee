import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  RocketLaunchIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";

export function ExpenseCard({
  despesa,
  jaLancadoNoMes,
  loadingId,
  onLancar,
  onEdit,
  onDelete,
  formatMoney,
}: any) {
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 border-border/50 
      ${jaLancadoNoMes ? "bg-muted/30 border-dashed opacity-80" : "bg-card shadow-sm"}`}
    >
      <div className="p-4">
        {/* Linha Superior: Nome e Ações */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="space-y-1 overflow-hidden">
            <h3
              className={`font-semibold text-base truncate ${jaLancadoNoMes ? "text-muted-foreground" : "text-foreground"}`}
            >
              {despesa.nome}
            </h3>
            <div className="flex items-center text-xs text-muted-foreground font-medium">
              <CalendarDaysIcon className="mr-1.5 h-3.5 w-3.5 opacity-70" />
              Vence dia {despesa.dia_vencimento}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-0.5 shrink-0">
            {jaLancadoNoMes ? (
              <div className="h-8 w-8 flex items-center justify-center text-emerald-500 bg-emerald-500/10 rounded-md">
                <CheckCircleIcon className="h-4 w-4" />
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                disabled={loadingId === despesa.id}
                onClick={() => onLancar(despesa)}
                className="h-8 w-8 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-90 transition-all rounded-md"
                title="Lançar agora"
              >
                {loadingId === despesa.id ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <RocketLaunchIcon className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-90 transition-all rounded-md"
              onClick={() => onEdit(despesa)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all rounded-md"
              onClick={() => onDelete(despesa)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Linha Inferior: Valor e Tags */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mt-1">
          <div
            className={`text-2xl font-bold tracking-tight ${jaLancadoNoMes ? "text-muted-foreground" : "text-foreground"}`}
          >
            {formatMoney(despesa.valor)}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {despesa.categoria && (
              <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                {despesa.categoria}
              </span>
            )}
            {despesa.forma_pagamento && (
              <span className="text-[10px] font-medium uppercase tracking-wider bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                {despesa.forma_pagamento}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
