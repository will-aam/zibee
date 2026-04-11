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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type RecurrenceEndType = "ate_data" | "ocorrencias";
type RepeatType = "unica" | "fixa" | "parcelada";
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

  const [repeatType, setRepeatType] = useState<RepeatType>("unica");
  const [recurrenceEndType, setRecurrenceEndType] =
    useState<RecurrenceEndType>("ocorrencias");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(2);

  const [statusFixa, setStatusFixa] = useState<"ativo" | "pausado">("ativo");

  // BLINDAGEM: Limpa as opções para evitar itens duplicados por causa de espaços
  const categoriasUnicas = Array.from(
    new Set(categoriasDB.map((c) => c.nome.trim())),
  );
  const pagamentosUnicos = Array.from(
    new Set(formasPagamentoDB.map((p) => p.nome.trim())),
  );

  useEffect(() => {
    if (lancamentoToEdit) {
      setFormData({
        ...lancamentoToEdit,
        // Limpa os espaços ao editar para que o Select encontre a opção certa
        categoria: lancamentoToEdit.categoria?.trim(),
        forma_pagamento: lancamentoToEdit.forma_pagamento?.trim(),
      });
      setRepeatType(lancamentoToEdit.isShadow ? "fixa" : "unica");
      setStatusFixa("ativo");
      setRecurrenceEndType("ocorrencias");
      setRecurrenceEndDate("");
      setRecurrenceOccurrences(2);
    } else {
      setFormData({
        descricao: "",
        categoria: categoriasUnicas[0] || "Contas Fixas",
        tipo: "Despesa",
        valor: 0,
        forma_pagamento: pagamentosUnicos[0] || "Pix",
        data_vencimento: new Date().toISOString().split("T")[0],
        pago: false,
        observacoes: "",
      });
      setRepeatType("unica");
      setStatusFixa("ativo");
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

  const createRecurrenceItems = (basePayload: Omit<Lancamento, "id">) => {
    const items: Omit<Lancamento, "id">[] = [];
    const baseDate = parseDateLocal(basePayload.data_vencimento);

    if (recurrenceEndType === "ocorrencias") {
      const total = recurrenceOccurrences;
      for (let i = 1; i <= total; i++) {
        const nextDate = addMonthsKeepingDay(baseDate, i - 1);
        items.push({
          ...basePayload,
          data_vencimento: formatDateLocal(nextDate),
          pago: i === 1 ? formData.pago || false : false,
          parcela_atual: i,
          total_parcelas: total,
        });
      }
      return items;
    }

    if (recurrenceEndType === "ate_data") {
      const end = parseDateLocal(recurrenceEndDate);
      let parcelasCount = 0;

      for (
        let monthOffset = 0;
        monthOffset <= MAX_RECURRENCE_MONTHS;
        monthOffset++
      ) {
        const nextDate = addMonthsKeepingDay(baseDate, monthOffset);
        if (nextDate > end) break;
        parcelasCount++;
      }

      for (let i = 1; i <= parcelasCount; i++) {
        const nextDate = addMonthsKeepingDay(baseDate, i - 1);
        items.push({
          ...basePayload,
          data_vencimento: formatDateLocal(nextDate),
          pago: i === 1 ? formData.pago || false : false,
          parcela_atual: i,
          total_parcelas: parcelasCount,
        });
      }
    }
    return items;
  };

  const validateRecurrence = () => {
    if (repeatType === "fixa") return true;

    if (repeatType !== "parcelada" || formData.tipo !== "Despesa") return true;

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
        categoria: formData.categoria?.trim(), // Salva a string limpa
        forma_pagamento: formData.forma_pagamento?.trim(), // Salva a string limpa
        user_id: userId,
        grupo_id: activeContext === "grupo" ? groupId : null,
      } as Omit<Lancamento, "id">;

      if (lancamentoToEdit) {
        if (lancamentoToEdit.isShadow) {
          const dia = parseInt(formData.data_vencimento!.split("-")[2]);
          const updateMasterPayload = {
            nome: formData.descricao,
            valor: formData.valor,
            dia_vencimento: dia,
            categoria: formData.categoria?.trim(),
            forma_pagamento: formData.forma_pagamento?.trim(),
            status: statusFixa,
          };

          let query = supabase
            .from("despesas_fixas")
            .update(updateMasterPayload)
            .eq("id", lancamentoToEdit.conta_fixa_id);

          if (activeContext === "grupo" && groupId)
            query = query.eq("grupo_id", groupId);
          else query = query.eq("user_id", userId).is("grupo_id", null);

          await query;
          toast({
            title:
              statusFixa === "pausado"
                ? "Conta Fixa Pausada!"
                : "Conta Fixa Atualizada!",
          });
        } else {
          const updatePayload = {
            descricao: formData.descricao,
            categoria: formData.categoria?.trim(),
            tipo: formData.tipo,
            valor: formData.valor,
            forma_pagamento: formData.forma_pagamento?.trim(),
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
          toast({ title: "Lançamento Atualizado!" });
        }
      } else {
        if (repeatType === "fixa" && formData.tipo === "Despesa") {
          const dia = parseInt(formData.data_vencimento!.split("-")[2]);
          const payloadFixa = {
            nome: formData.descricao,
            valor: formData.valor,
            dia_vencimento: dia,
            categoria: formData.categoria?.trim(),
            forma_pagamento: formData.forma_pagamento?.trim(),
            user_id: userId,
            grupo_id: activeContext === "grupo" ? groupId : null,
            status: "ativo",
          };

          const { error: errFixa } = await supabase
            .from("despesas_fixas")
            .insert([payloadFixa]);
          if (errFixa) throw errFixa;

          toast({ title: "Conta Fixa Cadastrada com Sucesso!" });
        } else if (repeatType === "parcelada" && formData.tipo === "Despesa") {
          const recurrenceItems = createRecurrenceItems(basePayload);
          await supabase.from("lancamentos").insert(recurrenceItems);
          toast({ title: "Parcelas Criadas com Sucesso!" });
        } else {
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
                    R${" "}
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
                  disabled={!!lancamentoToEdit}
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
                  {categoriasUnicas.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
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
                  {pagamentosUnicos.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !formData.data_vencimento && "text-muted-foreground",
                    )}
                  >
                    <CalendarDaysIcon className="mr-2 h-4 w-4 shrink-0" />
                    {formData.data_vencimento
                      ? format(
                          parseDateLocal(formData.data_vencimento),
                          "dd 'de' MMMM 'de' yyyy",
                          { locale: ptBR },
                        )
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={
                      formData.data_vencimento
                        ? parseDateLocal(formData.data_vencimento)
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        setFormData({
                          ...formData,
                          data_vencimento: formatDateLocal(date),
                        });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* SEÇÃO INOVADORA DE PAUSA (Só aparece ao editar uma sombra) */}
            {lancamentoToEdit?.isShadow && (
              <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 flex items-center justify-between mt-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Cobrança Ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Desative para pausar esta conta fixa nos próximos meses.
                  </p>
                </div>
                <Switch
                  checked={statusFixa === "ativo"}
                  onCheckedChange={(c) =>
                    setStatusFixa(c ? "ativo" : "pausado")
                  }
                />
              </div>
            )}

            {/* SEÇÃO DE PAGAMENTO E REPETIÇÃO */}
            <div className="flex flex-col gap-2 mt-2">
              {/* CHECKBOX DE PAGO (SÓ APARECE SE NÃO FOR CONTA FIXA) */}
              {repeatType !== "fixa" && !lancamentoToEdit?.isShadow && (
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

              {/* OPÇÕES DE REPETIÇÃO HUMANIZADAS (SÓ APARECE PARA DESPESAS NOVAS) */}
              {formData.tipo === "Despesa" && !lancamentoToEdit && (
                <div className="space-y-4 mt-4 pt-4 border-t border-border/50">
                  <Label className="text-muted-foreground font-bold">
                    Como essa despesa se repete?
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant={repeatType === "unica" ? "default" : "outline"}
                      className="w-full justify-center"
                      onClick={() => {
                        setRepeatType("unica");
                        setFormData((prev) => ({ ...prev, pago: false }));
                      }}
                    >
                      Única
                    </Button>
                    <Button
                      type="button"
                      variant={repeatType === "fixa" ? "default" : "outline"}
                      className="w-full justify-center"
                      onClick={() => {
                        setRepeatType("fixa");
                        setFormData((prev) => ({ ...prev, pago: false }));
                      }}
                    >
                      Assinatura (Fixa)
                    </Button>
                    <Button
                      type="button"
                      variant={
                        repeatType === "parcelada" ? "default" : "outline"
                      }
                      className="w-full justify-center"
                      onClick={() => {
                        setRepeatType("parcelada");
                        setFormData((prev) => ({ ...prev, pago: false }));
                      }}
                    >
                      Parcelada
                    </Button>
                  </div>

                  {/* CAIXA EXPANSÍVEL DO PARCELAMENTO */}
                  {repeatType === "parcelada" && (
                    <div className="grid gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl animate-in fade-in slide-in-from-top-2 mt-2">
                      <div className="space-y-2">
                        <Label>Até quando se repete?</Label>
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
                              Quantidade de Parcelas
                            </SelectItem>
                            <SelectItem value="ate_data">
                              Até uma data limite
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recurrenceEndType === "ate_data" && (
                        <div className="space-y-2">
                          <Label>Data da última parcela</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-10 bg-background",
                                  !recurrenceEndDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarDaysIcon className="mr-2 h-4 w-4 shrink-0" />
                                {recurrenceEndDate
                                  ? format(
                                      parseDateLocal(recurrenceEndDate),
                                      "dd 'de' MMMM 'de' yyyy",
                                      { locale: ptBR },
                                    )
                                  : "Selecione a data limite"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                locale={ptBR}
                                selected={
                                  recurrenceEndDate
                                    ? parseDateLocal(recurrenceEndDate)
                                    : undefined
                                }
                                onSelect={(date) => {
                                  if (date) {
                                    setRecurrenceEndDate(formatDateLocal(date));
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
