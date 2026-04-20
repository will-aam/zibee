"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { CheckCircleIcon } from "@/components/ui/check-circle";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lancamento } from "@/types";

interface LancamentoItemProps {
  lancamento: Lancamento;
  isSelected: boolean;
  categoriaRegra?: string;
  infoFatura?: { mesFormatado: string; ano: number };
  onSelect: () => void;
  onTogglePago: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function LancamentoItem({
  lancamento,
  isSelected,
  categoriaRegra,
  infoFatura,
  onSelect,
  onTogglePago,
  onEdit,
  onDelete,
}: LancamentoItemProps) {
  const isReceita = lancamento.tipo === "Receita";
  const isFixa = !!lancamento.conta_fixa_id || !!lancamento.isShadow;
  const isParcelada = !!lancamento.total_parcelas;
  const isCartaoCredito = !!lancamento.cartao_id;

  const isPausada = (lancamento as any).status_fixa === "pausado";

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all duration-200",
        isSelected
          ? "bg-primary/5 border-primary/30"
          : isPausada
            ? "bg-muted/30 border-dashed border-border/50 opacity-60"
            : lancamento.isShadow
              ? "bg-accent/10 border-border/80 border-dashed hover:border-border hover:shadow-sm"
              : "bg-card border-border/50 hover:border-border hover:shadow-sm",
      )}
    >
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        {!isCartaoCredito ? (
          <button
            onClick={isPausada ? undefined : onTogglePago}
            disabled={isPausada}
            title={
              isPausada
                ? "Conta oculta (Reative para pagar)"
                : lancamento.pago
                  ? "Marcar como pendente"
                  : "Marcar como pago"
            }
            className={cn(
              "pt-0.5 sm:pt-0 shrink-0 transition-transform flex items-center justify-center h-7 w-7 rounded-full",
              !isPausada && "active:scale-90",
              isPausada && "cursor-not-allowed",
              !lancamento.pago && lancamento.isShadow && "bg-blue-500/5",
            )}
          >
            <CheckCircleIcon
              checked={lancamento.pago}
              size={28}
              className={cn(
                "transition-colors duration-300",
                isPausada
                  ? "text-muted-foreground/30"
                  : lancamento.pago
                    ? "text-green-500"
                    : lancamento.isShadow
                      ? "text-blue-500/50 hover:text-blue-500/80"
                      : "text-muted-foreground/30 hover:text-muted-foreground/60",
              )}
            />
          </button>
        ) : (
          <div className="pt-0.5 sm:pt-0 shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 text-primary"
            >
              <path d="M2.25 10.5h19.5V15a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 15v-4.5Z" />
              <path d="M4.5 6A2.25 2.25 0 0 0 2.25 8.25v.75h19.5v-.75A2.25 2.25 0 0 0 19.5 6H4.5Z" />
            </svg>
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={cn(
                "font-semibold text-sm sm:text-base truncate",
                lancamento.pago || isPausada
                  ? "text-foreground/60"
                  : "text-foreground",
                isPausada && "line-through",
              )}
            >
              {lancamento.descricao}
            </h3>

            <div className="flex items-center gap-1.5">
              {isFixa && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                    isPausada
                      ? "bg-muted text-muted-foreground"
                      : "text-blue-600 dark:text-blue-400",
                  )}
                >
                  {isPausada ? (
                    <EyeSlashIcon className="h-3 w-3" />
                  ) : (
                    <Pin className="h-3 w-3" />
                  )}
                  {isPausada ? "Oculta" : "Fixa"}
                </span>
              )}
              {isParcelada && (
                <span className="flex items-center gap-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  {lancamento.parcela_atual}/{lancamento.total_parcelas}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            <span
              className={cn(
                "font-medium flex items-center gap-0.5",
                isReceita
                  ? "text-green-600 dark:text-green-500"
                  : isPausada
                    ? "text-muted-foreground"
                    : "text-destructive/80",
              )}
            >
              {isReceita ? (
                <ArrowUpRightIcon className="h-3 w-3" />
              ) : (
                <ArrowDownRightIcon className="h-3 w-3" />
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

            {isCartaoCredito && infoFatura && (
              <>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1 font-bold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-widest">
                  Fatura de {infoFatura.mesFormatado}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pl-10 sm:pl-0 w-full sm:w-auto">
        <div
          className={cn(
            "font-bold text-sm sm:text-base tracking-tight",
            isReceita
              ? "text-green-600 dark:text-green-500"
              : "text-foreground",
            (!lancamento.pago || isPausada) && "opacity-70",
          )}
        >
          {isReceita ? "+" : "-"}{" "}
          {Number(lancamento.valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </div>

        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
            onClick={onEdit}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={onDelete}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
