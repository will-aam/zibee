import { Button } from "@/components/ui/button";
import {
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

export function ExpenseCard({ despesa, onEdit, onDelete, formatMoney }: any) {
  // Garante a compatibilidade independente se no banco a coluna chama "descricao" ou "nome"
  const titulo = despesa.descricao || despesa.nome;
  const isReceita = despesa.categoria === "Receita"; // Caso use receita fixa no futuro

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all duration-200",
        "bg-card border-border/50 hover:border-border hover:shadow-sm w-full",
      )}
    >
      {/* ESQUERDA: Ícone, Título e Info */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
        {/* Ícone Estático (já que não tem botão de pago/pendente aqui) */}
        <div className="pt-0.5 sm:pt-0 shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDaysIcon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Textos e Detalhes */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm sm:text-base truncate text-foreground">
              {titulo}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            <span
              className={cn(
                "font-medium flex items-center gap-0.5",
                isReceita
                  ? "text-green-600 dark:text-green-500"
                  : "text-destructive/80",
              )}
            >
              {isReceita ? (
                <ArrowUpRightIcon className="h-3 w-3" />
              ) : (
                <ArrowDownRightIcon className="h-3 w-3" />
              )}
              {despesa.categoria || "Sem Categoria"}
            </span>
            <span className="opacity-50">•</span>
            <span>{despesa.forma_pagamento || "Sem Pagamento"}</span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-1 font-bold">
              Vence dia {despesa.dia_vencimento}
            </span>
          </div>
        </div>
      </div>

      {/* DIREITA: Valor e Ações */}
      <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pl-14 sm:pl-0 w-full sm:w-auto shrink-0">
        {/* Valor */}
        <div
          className={cn(
            "font-bold text-sm sm:text-base tracking-tight text-foreground",
          )}
        >
          {formatMoney(despesa.valor)}
        </div>

        {/* Ações (Editar / Excluir) */}
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
            onClick={() => onEdit(despesa)}
            title="Editar Conta Fixa"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={() => onDelete(despesa)}
            title="Remover Conta Fixa"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
