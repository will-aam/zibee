// components/features/fixed-expenses/EditFixedExpenseDialog.tsx
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
  DialogFooter,
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
import { Loader2 } from "lucide-react";

interface ItemOpcao {
  id: number;
  nome: string;
}

export interface DespesaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_vencimento: number;
  categoria?: string;
  forma_pagamento?: string;
}

interface EditFixedExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: DespesaFixa | null;

  // substitui onSuccess() por onSaved(updated)
  onSaved: (updated: DespesaFixa) => void;

  categorias: ItemOpcao[];
  formasPagamento: ItemOpcao[];
}

type FormState = {
  nome: string;
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
}: EditFixedExpenseDialogProps) {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const [loading, setLoading] = useState(false);

  const initialForm: FormState = useMemo(
    () => ({
      nome: expense?.nome ?? "",
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
    return !!form.nome.trim() && !!form.valor && !!form.dia && !loading;
  }, [form.nome, form.valor, form.dia, loading]);

  const handleSave = useCallback(async () => {
    if (!userId || !expense) return;

    if (!form.nome.trim() || !form.valor || !form.dia) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, Valor e Dia são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        valor: Number(form.valor),
        dia_vencimento: Number(form.dia),
        categoria: form.categoria?.trim() ? form.categoria.trim() : null,
        forma_pagamento: form.pagamento?.trim() ? form.pagamento.trim() : null,
      };

      const { error } = await supabase
        .from("despesas_fixas")
        .update(payload)
        .eq("id", expense.id)
        .eq("user_id", userId);

      if (error) throw error;

      const updated: DespesaFixa = {
        ...expense,
        nome: payload.nome,
        valor: payload.valor,
        dia_vencimento: payload.dia_vencimento,
        categoria: payload.categoria ?? undefined,
        forma_pagamento: payload.forma_pagamento ?? undefined,
      };

      toast({ title: "Despesa atualizada!" });

      // Atualiza o pai (otimista + cache) e fecha
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
  }, [expense, form, onOpenChange, onSaved, toast, userId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar Despesa Fixa</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) handleSave();
          }}
          className="grid gap-4 py-4"
        >
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setField("valor", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Dia vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={form.dia}
                onChange={(e) => setField("dia", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria (padrão)</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setField("categoria", v)}
              >
                <SelectTrigger>
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
              <Label>Pagamento (padrão)</Label>
              <Select
                value={form.pagamento}
                onValueChange={(v) => setField("pagamento", v)}
              >
                <SelectTrigger>
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSave}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
