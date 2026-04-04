// components/features/fixed-expenses/ExpenseCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Rocket,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
} from "lucide-react";

// Adapte a tipagem conforme seu projeto
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
      className={`group transition-all duration-200 border-border/50 hover:shadow-md ${jaLancadoNoMes ? "opacity-75 bg-muted/20" : "bg-card"}`}
    >
      <CardHeader className="p-5 pb-0 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium leading-none">
            {despesa.nome}
          </CardTitle>
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            Vence dia {despesa.dia_vencimento}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onEdit(despesa)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(despesa)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              {formatMoney(despesa.valor)}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-wider bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {despesa.categoria || "Geral"}
              </span>
            </div>
          </div>

          {jaLancadoNoMes ? (
            <div className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pago
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={loadingId === despesa.id}
              onClick={() => onLancar(despesa)}
              className="gap-2 text-xs h-8"
            >
              {loadingId === despesa.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="h-3.5 w-3.5" />
              )}
              Lançar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
