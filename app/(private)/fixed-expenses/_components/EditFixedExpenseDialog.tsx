"use client";

import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

interface ItemOpcao {
  id: number;
  nome: string;
}

export interface DespesaFixa {
  id: number;
  descricao?: string; // Novo padrão
  nome?: string; // Proteção para dados legados
  valor: number;
  dia_vencimento: number;
  categoria?: string;
  forma_pagamento?: string;
}

interface EditFixedExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: DespesaFixa | null;
  onSaved: (updated: DespesaFixa) => void;
  categorias: ItemOpcao[];
  formasPagamento: ItemOpcao[];
  activeContext?: string;
  groupId?: string | null;
}

type FormState = {
  descricao: string;
  valor: string;
  dia: string;
  categoria: string;
  pagamento: string;
};

export function EditFixedExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSaved,
  categorias,
  formasPagamento,
  activeContext,
  groupId,
}: EditFixedExpenseDialogProps) {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const [loading, setLoading] = useState(false);

  const initialForm: FormState = useMemo(
    () => ({
      // Lê de 'descricao' primeiro, se não achar tenta 'nome'
      descricao: expense?.descricao || expense?.nome || "",
      valor: expense?.valor != null ? String(expense.valor) : "",
      dia:
        expense?.dia_vencimento != null ? String(expense.dia_vencimento) : "",
      categoria: expense?.categoria ?? "",
      pagamento: expense?.forma_pagamento ?? "",
    }),
    [expense],
  );

  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
  }, [open, initialForm]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const canSave = useMemo(() => {
    return !!form.descricao.trim() && !!form.valor && !!form.dia && !loading;
  }, [form.descricao, form.valor, form.dia, loading]);

  const handleSave = useCallback(async () => {
    if (!userId || !expense) return;

    if (!form.descricao.trim() || !form.valor || !form.dia) {
      toast({
        title: "Campos obrigatórios",
        description: "Descrição, Valor e Dia são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Salva corretamente na coluna 'descricao'
      const payload = {
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        dia_vencimento: Number(form.dia),
        categoria: form.categoria?.trim() ? form.categoria.trim() : null,
        forma_pagamento: form.pagamento?.trim() ? form.pagamento.trim() : null,
      };

      let query = supabase
        .from("despesas_fixas")
        .update(payload)
        .eq("id", expense.id);

      if (activeContext === "grupo" && groupId) {
        query = query.eq("grupo_id", groupId);
      } else {
        query = query.eq("user_id", userId).is("grupo_id", null);
      }

      const { error } = await query;

      if (error) throw error;

      const updated: DespesaFixa = {
        ...expense,
        descricao: payload.descricao, // Mantém atualizado no state
        valor: payload.valor,
        dia_vencimento: payload.dia_vencimento,
        categoria: payload.categoria ?? undefined,
        forma_pagamento: payload.forma_pagamento ?? undefined,
      };

      toast({ title: "Conta Fixa atualizada!" });

      onSaved(updated);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    expense,
    form,
    onOpenChange,
    onSaved,
    toast,
    userId,
    activeContext,
    groupId,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[90vw] sm:max-w-[425px] rounded-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-border/50">
          <DialogTitle className="text-xl font-bold">
            Editar Conta Fixa{" "}
            {activeContext === "grupo" && (
              <span className="text-primary">(Grupo)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) handleSave();
          }}
          className="p-6 space-y-5"
        >
          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">
              Descrição
            </Label>
            <Input
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
              className="rounded-xl h-11 bg-muted/30"
              placeholder="Ex: Aluguel, Internet..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.valor}
                  onChange={(e) => setField("valor", e.target.value)}
                  className="rounded-xl h-11 pl-9 bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">
                Dia do Vencimento
              </Label>
              <Input
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={form.dia}
                onChange={(e) => setField("dia", e.target.value)}
                className="rounded-xl h-11 bg-muted/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">
                Categoria
              </Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setField("categoria", v)}
              >
                <SelectTrigger className="rounded-xl h-11 bg-muted/30">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">
                Pagamento
              </Label>
              <Select
                value={form.pagamento}
                onValueChange={(v) => setField("pagamento", v)}
              >
                <SelectTrigger className="rounded-xl h-11 bg-muted/30">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((f) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 rounded-xl h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSave}
              className="flex-1 rounded-xl h-11"
            >
              {loading && (
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
