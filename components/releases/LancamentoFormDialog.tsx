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
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

type RecurrenceEndType = "ate_data" | "ocorrencias";
const MAX_RECURRENCE_MONTHS = 600;

interface LancamentoFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lancamentoToEdit: Lancamento | null;
  userId: string | undefined;
  categoriasDB: { id: number; nome: string }[];
  formasPagamentoDB: { id: number; nome: string }[];
  activeContext: string;
  groupId: string | null;
}

export function LancamentoFormDialog({
  isOpen,
  onClose,
  onSuccess,
  lancamentoToEdit,
  userId,
  categoriasDB,
  formasPagamentoDB,
  activeContext,
  groupId,
}: LancamentoFormDialogProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Lancamento>>({});

  // --- NOVOS ESTADOS DE REPETIÇÃO ---
  const [isContaFixa, setIsContaFixa] = useState(false);
  const [isRecorrente, setIsRecorrente] = useState(false);

  const [recurrenceEndType, setRecurrenceEndType] =
    useState<RecurrenceEndType>("ocorrencias");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(2);

  useEffect(() => {
    if (lancamentoToEdit) {
      setFormData(lancamentoToEdit);
      setIsContaFixa(false);
      setIsRecorrente(false);
      setRecurrenceEndType("ocorrencias");
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
      setIsContaFixa(false);
      setIsRecorrente(false);
      setRecurrenceEndType("ocorrencias");
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
      for (
        let monthOffset = 1;
        monthOffset <= MAX_RECURRENCE_MONTHS;
        monthOffset++
      ) {
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
    if (isContaFixa) return true; // Conta fixa só precisa do dia, que já vem da data

    if (!isRecorrente || formData.tipo !== "Despesa") return true;

    if (!formData.data_vencimento) {
      toast({
        title: "Recorrência inválida",
        description: "Informe a data do primeiro pagamento.",
        variant: "destructive",
      });
      return false;
    }
    if (recurrenceEndType === "ocorrencias" && recurrenceOccurrences < 2) {
      toast({
        title: "Recorrência inválida",
        description: "O número de ocorrências deve ser pelo menos 2.",
        variant: "destructive",
      });
      return false;
    }
    if (recurrenceEndType === "ate_data") {
      if (!recurrenceEndDate) {
        toast({
          title: "Recorrência inválida",
          description: "Selecione a data final.",
          variant: "destructive",
        });
        return false;
      }
      if (
        parseDateLocal(recurrenceEndDate) <
        parseDateLocal(formData.data_vencimento)
      ) {
        toast({
          title: "Recorrência inválida",
          description: "A data final deve ser depois do primeiro pagamento.",
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
        grupo_id: activeContext === "grupo" ? groupId : null,
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

        let query = supabase
          .from("lancamentos")
          .update(updatePayload)
          .eq("id", lancamentoToEdit.id);
        if (activeContext === "grupo" && groupId)
          query = query.eq("grupo_id", groupId);
        else query = query.eq("user_id", userId).is("grupo_id", null);

        await query;

        // Se marcou como parcelado durante a edição a partir deste mês
        if (isRecorrente && formData.tipo === "Despesa") {
          const recurrenceItems = createRecurrenceItems(basePayload, false);
          if (recurrenceItems.length > 0)
            await supabase.from("lancamentos").insert(recurrenceItems);
        }
        toast({ title: "Lançamento Atualizado!" });
      } else {
        // --- MODO CRIAÇÃO NOVO ---
        if (isContaFixa && formData.tipo === "Despesa") {
          // 1. SALVA APENAS NA TABELA DE CONTAS FIXAS (MASTER)
          const dia = parseInt(formData.data_vencimento!.split("-")[2]);
          const payloadFixa = {
            descricao: formData.descricao,
            valor: formData.valor,
            dia_vencimento: dia,
            categoria: formData.categoria,
            forma_pagamento: formData.forma_pagamento,
            user_id: userId,
            grupo_id: activeContext === "grupo" ? groupId : null,
          };

          const { error: errFixa } = await supabase
            .from("despesas_fixas")
            .insert([payloadFixa]);
          if (errFixa) throw errFixa;

          toast({ title: "Conta Fixa Cadastrada com Sucesso!" });
        } else if (isRecorrente && formData.tipo === "Despesa") {
          // SALVA LANÇAMENTOS PARCELADOS (VÁRIOS MESES NA TABELA NORMAL)
          const recurrenceItems = createRecurrenceItems(basePayload, true);
          await supabase.from("lancamentos").insert(recurrenceItems);
          toast({ title: "Parcelas Criadas com Sucesso!" });
        } else {
          // SALVA LANÇAMENTO ÚNICO NORMAL (TABELA NORMAL)
          await supabase.from("lancamentos").insert([basePayload]);
          toast({ title: "Lançamento Criado!" });
        }
      }

      window.dispatchEvent(new Event("zibee:transaction-changed"));
      onSuccess();
      onClose();
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
        className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:h-auto sm:max-h-[85vh] sm:max-w-lg flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>
            {lancamentoToEdit ? "Editar" : "Novo"} Lançamento{" "}
            {activeContext === "grupo" && (
              <span className="text-primary">(Grupo)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                placeholder="Ex: Conta de Luz, Aluguel..."
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
                  {formData.tipo === "Receita" ? "Fonte de Renda" : "Tipo"}
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
              {/* CHECKBOX DE PAGO (SÓ APARECE SE NÃO FOR CONTA FIXA) */}
              {!isContaFixa && (
                <div className="flex items-center gap-2 border p-3 rounded-md bg-card animate-in fade-in slide-in-from-top-2 duration-300">
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
              )}

              {/* OPÇÕES DE REPETIÇÃO (SÓ APARECE PARA DESPESAS NOVAS) */}
              {formData.tipo === "Despesa" && !lancamentoToEdit && (
                <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
                  <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                    Opções de Repetição
                  </Label>

                  {/* CARD 1: TORNAR CONTA FIXA */}
                  <label
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                      isContaFixa
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card border-border/60 hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      checked={isContaFixa}
                      onCheckedChange={(c) => {
                        const isFixed = c === true;
                        setIsContaFixa(isFixed);
                        if (isFixed) {
                          setIsRecorrente(false); // Desliga a outra
                          setFormData((prev) => ({ ...prev, pago: false })); // Força "Não Pago"
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col gap-1">
                      <p
                        className={cn(
                          "font-bold text-sm",
                          isContaFixa ? "text-primary" : "text-foreground",
                        )}
                      >
                        Tornar uma Conta Fixa
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Ficará salva na sua aba de Contas Fixas.
                      </p>
                    </div>
                  </label>

                  {/* CARD 2: PARCELAMENTO */}
                  <label
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                      isRecorrente
                        ? "bg-foreground/5 border-foreground/30 shadow-sm"
                        : "bg-card border-border/60 hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      checked={isRecorrente}
                      onCheckedChange={(c) => {
                        setIsRecorrente(c === true);
                        if (c === true) setIsContaFixa(false); // Desliga a outra
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="font-bold text-sm text-foreground">
                        Compra Parcelada / Temporária
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Repetir por um número específico de meses ou até uma
                        data limite.
                      </p>
                    </div>
                  </label>

                  {/* CAIXA EXPANSÍVEL DO PARCELAMENTO */}
                  {isRecorrente && (
                    <div className="grid gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Como repetir?</Label>
                        <Select
                          value={recurrenceEndType}
                          onValueChange={(v: RecurrenceEndType) =>
                            setRecurrenceEndType(v)
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ocorrencias">
                              Quantidade de vezes (Parcelas)
                            </SelectItem>
                            <SelectItem value="ate_data">
                              Até uma data limite
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
                            className="bg-background"
                          />
                        </div>
                      )}

                      {recurrenceEndType === "ocorrencias" && (
                        <div className="space-y-2">
                          <Label>
                            Quantos meses no total? (Incluindo este)
                          </Label>
                          <div className="flex items-center justify-between bg-background border rounded-xl h-12 px-2 w-full max-w-[200px]">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setRecurrenceOccurrences(
                                  Math.max(2, recurrenceOccurrences - 1),
                                )
                              }
                              disabled={recurrenceOccurrences <= 2}
                            >
                              <MinusIcon className="h-5 w-5" />
                            </Button>
                            <span className="text-lg font-bold w-12 text-center select-none">
                              {recurrenceOccurrences}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setRecurrenceOccurrences(
                                  recurrenceOccurrences + 1,
                                )
                              }
                            >
                              <PlusIcon className="h-5 w-5" />
                            </Button>
                          </div>
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

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-10 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl"
            type="submit"
            form="lancamento-form"
          >
            Salvar Lançamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
