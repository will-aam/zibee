// components/lancamentos/LancamentoItem.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  CreditCard,
  CheckCircle,
  XCircle,
  CalendarIcon,
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
  return (
    <Card
      className={cn(
        "transition-all border-l-4 hover:shadow-sm",
        isSelected
          ? "bg-accent/50 border-primary shadow-sm"
          : "border-transparent",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {/* BOTÃO DE TOGGLE DE PAGAMENTO */}
              <button
                onClick={onTogglePago}
                title={
                  lancamento.pago ? "Marcar como pendente" : "Marcar como pago"
                }
                className="hover:scale-110 transition-transform"
              >
                {lancamento.pago ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground/50 hover:text-yellow-500" />
                )}
              </button>

              <h3 className="font-semibold leading-none">
                {lancamento.descricao}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pl-7">
              <span
                className={cn(
                  "font-medium",
                  lancamento.tipo === "Receita"
                    ? "text-green-600"
                    : "text-red-500",
                )}
              >
                {lancamento.tipo}
              </span>
              <span>•</span>
              <span>{lancamento.categoria}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {lancamento.forma_pagamento}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {new Date(lancamento.data_vencimento).toLocaleDateString(
                  "pt-BR",
                  { timeZone: "UTC" }, // Correção de fuso horário
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div
              className={cn(
                "font-bold text-sm",
                lancamento.tipo === "Receita" ? "text-green-600" : "",
              )}
            >
              {lancamento.tipo === "Receita" ? "+" : "-"}{" "}
              {Number(lancamento.valor).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>

            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-red-400 hover:text-red-500"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
