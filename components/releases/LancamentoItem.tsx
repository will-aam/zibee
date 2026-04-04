"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pencil,
  Trash2,
  CalendarIcon,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lancamento } from "@/types";

interface LancamentoItemProps {
  lancamento: Lancamento;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePago: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function LancamentoItem({
  lancamento,
  isSelected,
  onSelect,
  onTogglePago,
  onEdit,
  onDelete,
}: LancamentoItemProps) {
  const isReceita = lancamento.tipo === "Receita";

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all duration-200",
        isSelected
          ? "bg-primary/5 border-primary/30"
          : "bg-card border-border/50 hover:border-border hover:shadow-sm",
      )}
    >
      {/* ESQUERDA: Checkbox, Status e Info */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        {/* 2. Botão de Status (Pago / Pendente) */}
        <button
          onClick={onTogglePago}
          title={lancamento.pago ? "Marcar como pendente" : "Marcar como pago"}
          className="pt-0.5 sm:pt-0 shrink-0 transition-transform active:scale-90"
        >
          {lancamento.pago ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />
          )}
        </button>

        {/* 3. Textos e Detalhes */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-semibold text-sm sm:text-base truncate",
                lancamento.pago ? "text-foreground" : "text-foreground/80",
              )}
            >
              {lancamento.descricao}
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
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {lancamento.categoria}
            </span>
            <span className="opacity-50">•</span>
            <span>{lancamento.forma_pagamento}</span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 opacity-70" />
              {new Date(lancamento.data_vencimento).toLocaleDateString(
                "pt-BR",
                { timeZone: "UTC" },
              )}
            </span>
          </div>
        </div>
      </div>

      {/* DIREITA: Valor e Ações */}
      <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pl-10 sm:pl-0 w-full sm:w-auto">
        {/* Valor */}
        <div
          className={cn(
            "font-bold text-sm sm:text-base tracking-tight",
            isReceita
              ? "text-green-600 dark:text-green-500"
              : "text-foreground",
            !lancamento.pago && "opacity-70",
          )}
        >
          {isReceita ? "+" : "-"}{" "}
          {Number(lancamento.valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </div>

        {/* Ações (Editar / Excluir) */}
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
