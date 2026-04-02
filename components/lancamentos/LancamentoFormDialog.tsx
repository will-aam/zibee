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

type RecurrenceEndType = "infinito" | "ate_data" | "ocorrencias";
const MAX_RECURRENCE_MONTHS = 600;

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
  // Estado para controlar recorrência
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [recurrenceEndType, setRecurrenceEndType] =
    useState<RecurrenceEndType>("infinito");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(2);

  // Quando o modal abrir/fechar ou mudar o item sendo editado, resetamos os dados
  useEffect(() => {
    if (lancamentoToEdit) {
      setFormData(lancamentoToEdit);
      setIsRecorrente(false);
      setRecurrenceEndType("infinito");
      setRecurrenceEndDate("");
      setRecurrenceOccurrences(2);
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
      setRecurrenceEndType("infinito");
      setRecurrenceEndDate("");
      setRecurrenceOccurrences(2);
    }
  }, [lancamentoToEdit, isOpen, categoriasDB, formasPagamentoDB]);

  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateLocal = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const addMonthsKeepingDay = (baseDate: Date, monthsToAdd: number) => {
    const target = new Date(baseDate);
    const baseDay = target.getDate();
    target.setMonth(target.getMonth() + monthsToAdd, 1);
    const maxDay = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0,
    ).getDate();
    target.setDate(Math.min(baseDay, maxDay));
    return target;
  };

  const createRecurrenceItems = (
    basePayload: Omit<Lancamento, "id">,
    includeCurrent: boolean,
  ) => {
    const items: Omit<Lancamento, "id">[] = [];
    const baseDate = parseDateLocal(basePayload.data_vencimento);

    if (includeCurrent) items.push(basePayload);

    if (recurrenceEndType === "ocorrencias") {
      for (let i = 1; i < recurrenceOccurrences; i++) {
        const nextDate = addMonthsKeepingDay(baseDate, i);
        items.push({
          ...basePayload,
          data_vencimento: formatDateLocal(nextDate),
          pago: false,
        });
      }
      return items;
    }

    if (recurrenceEndType === "ate_data") {
      const end = parseDateLocal(recurrenceEndDate);
      for (let monthOffset = 1; monthOffset <= MAX_RECURRENCE_MONTHS; monthOffset++) {
        const nextDate = addMonthsKeepingDay(baseDate, monthOffset);
        if (nextDate > end) break;
        items.push({
          ...basePayload,
          data_vencimento: formatDateLocal(nextDate),
          pago: false,
        });
      }
    }

    return items;
  };

  const validateRecurrence = () => {
    if (!isRecorrente || formData.tipo !== "Despesa") return true;
    if (!formData.data_vencimento) {
      toast({
        title: "Recorrência inválida",
        description: "Informe a data de vencimento para aplicar recorrência.",
        variant: "destructive",
      });
      return false;
    }

    if (recurrenceEndType === "ocorrencias" && recurrenceOccurrences < 2) {
      toast({
        title: "Recorrência inválida",
        description: "Quantidade de ocorrências deve ser pelo menos 2.",
        variant: "destructive",
      });
      return false;
    }

    if (recurrenceEndType === "ate_data") {
      if (!recurrenceEndDate) {
        toast({
          title: "Recorrência inválida",
          description: "Selecione a data final da recorrência.",
          variant: "destructive",
        });
        return false;
      }
      if (parseDateLocal(recurrenceEndDate) < parseDateLocal(formData.data_vencimento)) {
        toast({
          title: "Recorrência inválida",
          description:
            "A data final deve ser igual ou posterior à data do lançamento.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!validateRecurrence()) return;

    try {
      const basePayload = {
        ...formData,
        user_id: userId,
      } as Omit<Lancamento, "id">;

      if (lancamentoToEdit) {
        // --- MODO EDIÇÃO ---
        const updatePayload = {
          descricao: formData.descricao,
          categoria: formData.categoria,
          tipo: formData.tipo,
          valor: formData.valor,
          forma_pagamento: formData.forma_pagamento,
          data_vencimento: formData.data_vencimento,
          pago: formData.pago,
          observacoes: formData.observacoes,
          link: formData.link,
        };
        await supabase
          .from("lancamentos")
          .update(updatePayload)
          .eq("id", lancamentoToEdit.id)
          .eq("user_id", userId);

        if (isRecorrente && formData.tipo === "Despesa") {
          if (recurrenceEndType === "infinito") {
            const diaDoVencimento = Number(
              formData.data_vencimento?.split("-")[2] || 1,
            );
            const { error: errorDespesaFixa } = await supabase
              .from("despesas_fixas")
              .insert([
                {
                  user_id: userId,
                  nome: formData.descricao,
                  valor: formData.valor,
                  dia_vencimento: diaDoVencimento,
                  categoria: formData.categoria,
                  forma_pagamento: formData.forma_pagamento,
                },
              ]);
            if (errorDespesaFixa) throw errorDespesaFixa;
          } else {
            const recurrenceItems = createRecurrenceItems(basePayload, false);
            if (recurrenceItems.length > 0) {
              const { error: recurrenceError } = await supabase
                .from("lancamentos")
                .insert(recurrenceItems);
              if (recurrenceError) throw recurrenceError;
            }
          }
        }

        toast({ title: "Atualizado!" });
      } else {
        // --- MODO CRIAÇÃO ---
        if (isRecorrente && formData.tipo === "Despesa") {
          if (recurrenceEndType === "infinito") {
            const { error } = await supabase.from("lancamentos").insert([basePayload]);
            if (error) throw error;

            const diaDoVencimento = Number(
              formData.data_vencimento?.split("-")[2] || 1,
            );

            const { error: errorDespesaFixa } = await supabase
              .from("despesas_fixas")
              .insert([
                {
                  user_id: userId,
                  nome: formData.descricao,
                  valor: formData.valor,
                  dia_vencimento: diaDoVencimento,
                  categoria: formData.categoria,
                  forma_pagamento: formData.forma_pagamento,
                },
              ]);
            if (errorDespesaFixa) throw errorDespesaFixa;
          } else {
            const recurrenceItems = createRecurrenceItems(basePayload, true);
            const { error: recurrenceError } = await supabase
              .from("lancamentos")
              .insert(recurrenceItems);
            if (recurrenceError) throw recurrenceError;
          }

          toast({
            title: "Criado com Recorrência!",
            description: "Recorrência aplicada ao lançamento com sucesso.",
          });
        } else {
          const { error } = await supabase.from("lancamentos").insert([basePayload]);
          if (error) throw error;
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

              {formData.tipo === "Despesa" && (
                <div className="space-y-3 border p-3 rounded-md bg-muted/20">
                  <div className="flex items-center gap-2">
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
                      {lancamentoToEdit
                        ? "Aplicar recorrência a partir deste lançamento"
                        : "Repetir todo mês (Tornar Recorrente)"}
                    </Label>
                  </div>

                  {isRecorrente && (
                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label>Condição de término</Label>
                        <Select
                          value={recurrenceEndType}
                          onValueChange={(v: RecurrenceEndType) =>
                            setRecurrenceEndType(v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="infinito">
                              Sem fim (despesa fixa)
                            </SelectItem>
                            <SelectItem value="ate_data">
                              Até uma data
                            </SelectItem>
                            <SelectItem value="ocorrencias">
                              Número de ocorrências
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recurrenceEndType === "ate_data" && (
                        <div className="space-y-2">
                          <Label>Data final</Label>
                          <Input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={(e) =>
                              setRecurrenceEndDate(e.target.value)
                            }
                          />
                        </div>
                      )}

                      {recurrenceEndType === "ocorrencias" && (
                        <div className="space-y-2">
                          <Label>Quantidade de ocorrências</Label>
                          <Input
                            type="number"
                            min="2"
                            value={recurrenceOccurrences}
                            onChange={(e) =>
                              setRecurrenceOccurrences(Number(e.target.value))
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
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
