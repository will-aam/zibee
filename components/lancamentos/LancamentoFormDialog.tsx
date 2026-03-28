// components/lancamentos/LancamentoFormDialog.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Lancamento } from "@/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface LancamentoFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Para avisar a tela principal que precisa recarregar a lista
  lancamentoToEdit: Lancamento | null;
  userId: string | undefined;
  categoriasDB: { id: number; nome: string }[];
  formasPagamentoDB: { id: number; nome: string }[];
}

export function LancamentoFormDialog({
  isOpen,
  onClose,
  onSuccess,
  lancamentoToEdit,
  userId,
  categoriasDB,
  formasPagamentoDB,
}: LancamentoFormDialogProps) {
  const { toast } = useToast();

  // Estado do Formulário
  const [formData, setFormData] = useState<Partial<Lancamento>>({});
  // NOVO: Estado para controlar se é uma conta recorrente
  const [isRecorrente, setIsRecorrente] = useState(false);

  // Quando o modal abrir/fechar ou mudar o item sendo editado, resetamos os dados
  useEffect(() => {
    if (lancamentoToEdit) {
      setFormData(lancamentoToEdit);
      setIsRecorrente(false); // Edição não mostra/afeta a recorrência padrão
    } else {
      setFormData({
        descricao: "",
        categoria: categoriasDB[0]?.nome || "Contas Fixas",
        tipo: "Despesa",
        valor: 0,
        forma_pagamento: formasPagamentoDB[0]?.nome || "Pix",
        data_vencimento: new Date().toISOString().split("T")[0],
        pago: false,
        observacoes: "",
      });
      setIsRecorrente(false);
    }
  }, [lancamentoToEdit, isOpen, categoriasDB, formasPagamentoDB]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      if (lancamentoToEdit) {
        // --- MODO EDIÇÃO ---
        await supabase
          .from("lancamentos")
          .update(formData)
          .eq("id", lancamentoToEdit.id)
          .eq("user_id", userId);
        toast({ title: "Atualizado!" });
      } else {
        // --- MODO CRIAÇÃO ---
        const { error } = await supabase
          .from("lancamentos")
          .insert([{ ...formData, user_id: userId }]);

        if (error) throw error;

        // --- NOVO: LÓGICA DE DESPESA RECORRENTE ---
        if (isRecorrente && formData.tipo === "Despesa") {
          // Extraímos apenas o DIA da data escolhida ("2024-03-15" -> 15)
          const diaDoVencimento = Number(
            formData.data_vencimento?.split("-")[2] || 1,
          );

          await supabase.from("despesas_fixas").insert([
            {
              user_id: userId,
              nome: formData.descricao,
              valor: formData.valor,
              dia_vencimento: diaDoVencimento,
              categoria: formData.categoria,
              forma_pagamento: formData.forma_pagamento,
            },
          ]);

          toast({
            title: "Criado com Recorrência!",
            description:
              "Esta despesa foi adicionada aos lançamentos e às Despesas Fixas.",
          });
        } else {
          toast({ title: "Criado!" });
        }
      }
      onSuccess(); // Recarrega a lista
      onClose(); // Fecha o modal
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-screen h-screen max-w-none rounded-none sm:rounded-lg sm:h-auto sm:max-h-[85vh] sm:max-w-lg flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>
            {lancamentoToEdit ? "Editar" : "Novo"} Lançamento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <form
            id="lancamento-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao || ""}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                required
                placeholder="Ex: Mercado, Salário..."
                className="text-lg py-6"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valor: Number(e.target.value),
                      })
                    }
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  {formData.tipo === "Receita" ? "Fonte de Renda" : "Categoria"}
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v: any) =>
                    setFormData({ ...formData, tipo: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                    <SelectItem value="Receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) =>
                  setFormData({ ...formData, categoria: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriasDB.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {formData.tipo === "Receita"
                  ? "Recebido via"
                  : "Forma de Pagamento"}
              </Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(v) =>
                  setFormData({ ...formData, forma_pagamento: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamentoDB.map((f) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {formData.tipo === "Receita"
                  ? "Data do Recebimento"
                  : "Data de Vencimento"}
              </Label>
              <Input
                type="date"
                value={formData.data_vencimento || ""}
                onChange={(e) =>
                  setFormData({ ...formData, data_vencimento: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="pago"
                  checked={formData.pago}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, pago: checked === true })
                  }
                />
                <Label
                  htmlFor="pago"
                  className="cursor-pointer flex-1 font-medium"
                >
                  {formData.tipo === "Receita"
                    ? "Já foi recebido?"
                    : "Já foi pago?"}
                </Label>
              </div>

              {/* CHECKBOX DE CONTA RECORRENTE (Aparece apenas se for despesa nova) */}
              {!lancamentoToEdit && formData.tipo === "Despesa" && (
                <div className="flex items-center gap-2 border p-3 rounded-md bg-muted/20">
                  <Checkbox
                    id="recorrente"
                    checked={isRecorrente}
                    onCheckedChange={(checked) =>
                      setIsRecorrente(checked === true)
                    }
                  />
                  <Label
                    htmlFor="recorrente"
                    className="cursor-pointer flex-1 font-medium text-primary"
                  >
                    Repetir todo mês (Tornar Recorrente)
                  </Label>
                </div>
              )}
            </div>
            <div className="h-4"></div>
          </form>
        </div>

        <div className="p-4 border-t bg-background/95 backdrop-blur z-10 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </Button>
          <Button className="flex-1" type="submit" form="lancamento-form">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
