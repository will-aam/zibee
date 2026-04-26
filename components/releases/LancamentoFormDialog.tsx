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
import { MinusIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import {
  CalendarDaysIcon,
  InformationCircleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipagens e Constantes
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
  cartoesDB: {
    id: number;
    nome: string;
    dia_fechamento: number;
    dia_vencimento: number;
  }[];
  activeContext: string;
  groupId: string | null;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export function LancamentoFormDialog({
  isOpen,
  onClose,
  onSuccess,
  lancamentoToEdit,
  userId,
  categoriasDB,
  formasPagamentoDB,
  cartoesDB,
  activeContext,
  groupId,
}: LancamentoFormDialogProps) {
  const { toast } = useToast();

  // --- ESTADOS ---
  const [formData, setFormData] = useState<Partial<Lancamento>>({});
  const [isSubmitting, setIsSubmitting] = useState(false); // TRAVA CONTRA DEDO NERVOSO

  const [repeatType, setRepeatType] = useState<RepeatType>("unica");
  const [recurrenceEndType, setRecurrenceEndType] =
    useState<RecurrenceEndType>("ocorrencias");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(2);
  const [statusFixa, setStatusFixa] = useState<"ativo" | "pausado">("ativo");

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [valorInput, setValorInput] = useState("0,00");

  const categoriasUnicas = Array.from(
    new Set(categoriasDB.map((c) => c.nome.trim())),
  );
  const pagamentosUnicos = Array.from(
    new Set(formasPagamentoDB.map((p) => p.nome.trim())),
  );

  const isCartao =
    formData.forma_pagamento?.toLowerCase().includes("cartão") ||
    formData.forma_pagamento?.toLowerCase().includes("cartao");

  // --- EFEITOS ---
  useEffect(() => {
    if (lancamentoToEdit) {
      setFormData({
        ...lancamentoToEdit,
        categoria: lancamentoToEdit.categoria?.trim(),
        forma_pagamento: lancamentoToEdit.forma_pagamento?.trim(),
      });
      setValorInput(
        lancamentoToEdit.valor
          ? lancamentoToEdit.valor.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0,00",
      );
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
        cartao_id: null,
      });
      setRepeatType("unica");
      setStatusFixa("ativo");
      setRecurrenceEndType("ocorrencias");
      setRecurrenceEndDate("");
      setRecurrenceOccurrences(2);
      setValorInput("0,00");
    }
  }, [lancamentoToEdit, isOpen, categoriasDB, formasPagamentoDB]);

  // --- HELPERS E HANDLERS ---
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numericValue = parseInt(value || "0", 10) / 100;
    setValorInput(
      numericValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    setFormData({ ...formData, valor: numericValue });
  };

  const handleCreateCategory = async (
    e: React.MouseEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !userId) return;
    try {
      const novaCategoria = {
        nome: newCategoryName.trim(),
        user_id: userId,
        grupo_id: activeContext === "grupo" ? groupId : null,
        tipo: formData.tipo === "Receita" ? "receita" : "despesa",
        cor: "#64748b",
        icone: "🏷️",
      };
      const { data, error } = await supabase
        .from("categorias")
        .insert([novaCategoria])
        .select();
      if (error) throw error;
      setFormData({ ...formData, categoria: novaCategoria.nome });
      setNewCategoryName("");
      setIsCreatingCategory(false);
      window.dispatchEvent(new Event("zibee:categories-changed"));
      toast({ title: "Categoria criada com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    }
  };

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
      const valorParcela = Number(basePayload.valor) / total;
      for (let i = 1; i <= total; i++) {
        const nextDate = addMonthsKeepingDay(baseDate, i - 1);
        items.push({
          ...basePayload,
          valor: valorParcela,
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
      const valorParcela =
        parcelasCount > 0
          ? Number(basePayload.valor) / parcelasCount
          : Number(basePayload.valor);
      for (let i = 1; i <= parcelasCount; i++) {
        const nextDate = addMonthsKeepingDay(baseDate, i - 1);
        items.push({
          ...basePayload,
          valor: valorParcela,
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
        title: "Atenção",
        description: "Informe a data inicial.",
        variant: "destructive",
      });
      return false;
    }
    if (recurrenceEndType === "ocorrencias" && recurrenceOccurrences < 2) {
      toast({
        title: "Atenção",
        description: "O número mínimo de parcelas é 2.",
        variant: "destructive",
      });
      return false;
    }
    if (recurrenceEndType === "ate_data" && !recurrenceEndDate) {
      toast({
        title: "Atenção",
        description: "Selecione a data final.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // --- SUBMISSÃO PRINCIPAL ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !userId || !validateRecurrence()) return;
    setIsSubmitting(true); // TRAVA ATIVADA

    try {
      const basePayload = {
        ...formData,
        categoria: formData.categoria?.trim(),
        forma_pagamento: formData.forma_pagamento?.trim(),
        cartao_id: isCartao ? formData.cartao_id : null,
        user_id: userId,
        grupo_id: activeContext === "grupo" ? groupId : null,
        pago: isCartao ? false : formData.pago,
      } as Omit<Lancamento, "id">;

      if (lancamentoToEdit) {
        if (lancamentoToEdit.isShadow) {
          if (formData.pago || isCartao) {
            const materializadoPayload = {
              ...basePayload,
              pago: isCartao ? false : true,
              conta_fixa_id: lancamentoToEdit.conta_fixa_id,
            };
            delete (materializadoPayload as any).isShadow;
            delete (materializadoPayload as any).status_fixa;

            await supabase.from("lancamentos").insert([materializadoPayload]);
            toast({
              title: isCartao ? "Lançado na fatura!" : "Conta do mês paga!",
            });
          } else {
            const dia = parseInt(formData.data_vencimento!.split("-")[2]);
            const updateMasterPayload = {
              nome: formData.descricao,
              valor: formData.valor,
              dia_vencimento: dia,
              categoria: formData.categoria?.trim(),
              forma_pagamento: formData.forma_pagamento?.trim(),
              cartao_id: isCartao ? formData.cartao_id : null,
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
                  ? "Conta Pausada!"
                  : "Conta Atualizada!",
            });
          }
        } else {
          const updatePayload = {
            descricao: formData.descricao,
            categoria: formData.categoria?.trim(),
            tipo: formData.tipo,
            valor: formData.valor,
            forma_pagamento: formData.forma_pagamento?.trim(),
            cartao_id: isCartao ? formData.cartao_id : null,
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
            cartao_id: isCartao ? formData.cartao_id : null,
            user_id: userId,
            grupo_id: activeContext === "grupo" ? groupId : null,
            status: "ativo",
          };
          const { error: errFixa } = await supabase
            .from("despesas_fixas")
            .insert([payloadFixa]);
          if (errFixa) throw errFixa;
          toast({ title: "Conta Fixa Cadastrada!" });
        } else if (repeatType === "parcelada" && formData.tipo === "Despesa") {
          const grupoParcelaId = `parcela-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const payloadComGrupo = {
            ...basePayload,
            grupo_parcela_id: grupoParcelaId,
          };
          const recurrenceItems = createRecurrenceItems(payloadComGrupo);
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
    } finally {
      setIsSubmitting(false); // DESTRAVA
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isSubmitting && onClose()}
    >
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
            {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
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
                disabled={isSubmitting}
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
                    type="text"
                    inputMode="numeric"
                    value={valorInput}
                    onChange={handleValorChange}
                    required
                    className="pl-9"
                    disabled={isSubmitting}
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
                  disabled={!!lancamentoToEdit || isSubmitting}
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

            {/* SEÇÃO 2: CATEGORIA E PAGAMENTO */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) =>
                  setFormData({ ...formData, categoria: v })
                }
                disabled={isSubmitting}
                onOpenChange={(open) => {
                  if (!open) {
                    setIsCreatingCategory(false);
                    setNewCategoryName("");
                  }
                }}
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
                  <div className="p-2 border-t mt-1">
                    {!isCreatingCategory ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-sm text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCreatingCategory(true);
                        }}
                      >
                        <PlusIcon className="w-4 h-4 mr-2" /> Nova Categoria
                      </Button>
                    ) : (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          autoFocus
                          placeholder="Nome da categoria"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateCategory(e);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => handleCreateCategory(e as any)}
                        >
                          Salvar
                        </Button>
                      </div>
                    )}
                  </div>
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
                disabled={isSubmitting}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    forma_pagamento: v,
                    cartao_id: null,
                  })
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

            {/* SEÇÃO 3: OPÇÕES ESPECÍFICAS (CARTÃO / DATAS) */}
            {isCartao && formData.tipo === "Despesa" && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2">
                <Label className="flex items-center gap-1.5 text-primary">
                  <CreditCardIcon className="h-4 w-4" /> Qual Cartão de Crédito?
                </Label>
                {cartoesDB.length > 0 ? (
                  <Select
                    value={
                      formData.cartao_id
                        ? String(formData.cartao_id)
                        : undefined
                    }
                    onValueChange={(v) =>
                      setFormData({ ...formData, cartao_id: Number(v) })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o cartão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoesDB.map((cartao) => (
                        <SelectItem key={cartao.id} value={String(cartao.id)}>
                          {cartao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-xs text-muted-foreground pt-1 pb-1">
                    Você não cadastrou nenhum cartão. A despesa será salva sem
                    vínculo.
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {formData.tipo === "Receita"
                  ? "Data do Recebimento"
                  : isCartao
                    ? "Dia da Cobrança / Compra"
                    : "Data de Vencimento"}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
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
                      if (date)
                        setFormData({
                          ...formData,
                          data_vencimento: formatDateLocal(date),
                        });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* SEÇÃO 4: REPETIÇÃO E RECORRÊNCIA */}
            {formData.tipo === "Despesa" && !lancamentoToEdit && (
              <div className="space-y-4 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground font-bold">
                    Como essa despesa se repete?
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      >
                        <InformationCircleIcon className="h-5 w-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[280px] sm:w-[320px] p-4 rounded-2xl z-9999"
                      align="start"
                      side="top"
                    >
                      <div className="space-y-3 text-sm">
                        <h4 className="font-bold text-foreground">
                          Tipos de Repetição
                        </h4>
                        <div className="space-y-2 text-muted-foreground">
                          <p>
                            <strong className="text-foreground">Única:</strong>{" "}
                            acontece só uma vez.
                          </p>
                          <p>
                            <strong className="text-foreground">
                              Recorrente:
                            </strong>{" "}
                            repete todo mês até pausar.
                          </p>
                          <p>
                            <strong className="text-foreground">
                              Parcelada:
                            </strong>{" "}
                            repete por X meses ou até data final.
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={repeatType === "unica" ? "default" : "outline"}
                    onClick={() => {
                      setRepeatType("unica");
                      setFormData((prev) => ({ ...prev, pago: false }));
                    }}
                    disabled={isSubmitting}
                  >
                    Única
                  </Button>
                  <Button
                    type="button"
                    variant={repeatType === "fixa" ? "default" : "outline"}
                    onClick={() => {
                      setRepeatType("fixa");
                      setFormData((prev) => ({ ...prev, pago: false }));
                    }}
                    disabled={isSubmitting}
                  >
                    Recorrente
                  </Button>
                  <Button
                    type="button"
                    variant={repeatType === "parcelada" ? "default" : "outline"}
                    onClick={() => {
                      setRepeatType("parcelada");
                      setFormData((prev) => ({ ...prev, pago: false }));
                    }}
                    disabled={isSubmitting}
                  >
                    Parcelada
                  </Button>
                </div>

                {repeatType === "parcelada" && (
                  <div className="grid gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Até quando se repete?</Label>
                      <Select
                        value={recurrenceEndType}
                        onValueChange={(v: RecurrenceEndType) =>
                          setRecurrenceEndType(v)
                        }
                        disabled={isSubmitting}
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

                    {recurrenceEndType === "ate_data" ? (
                      <div className="space-y-2">
                        <Label>Data da última parcela</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isSubmitting}
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
                                : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              locale={ptBR}
                              selected={
                                recurrenceEndDate
                                  ? parseDateLocal(recurrenceEndDate)
                                  : undefined
                              }
                              onSelect={(d) => {
                                if (d) setRecurrenceEndDate(formatDateLocal(d));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Quantos meses no total?</Label>
                        <div className="flex items-center justify-between bg-background border rounded-xl h-12 px-2 w-full max-w-[200px]">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setRecurrenceOccurrences(
                                Math.max(2, recurrenceOccurrences - 1),
                              )
                            }
                            disabled={
                              recurrenceOccurrences <= 2 || isSubmitting
                            }
                          >
                            <MinusIcon className="h-5 w-5" />
                          </Button>
                          <span className="text-lg font-bold w-12 text-center">
                            {recurrenceOccurrences}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setRecurrenceOccurrences(
                                recurrenceOccurrences + 1,
                              )
                            }
                            disabled={isSubmitting}
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

            {/* STATUS E PAGAMENTO */}
            {lancamentoToEdit?.isShadow && (
              <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 flex items-center justify-between mt-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Cobrança Ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Pausar nos próximos meses.
                  </p>
                </div>
                <Switch
                  checked={statusFixa === "ativo"}
                  onCheckedChange={(c) =>
                    setStatusFixa(c ? "ativo" : "pausado")
                  }
                  disabled={isSubmitting}
                />
              </div>
            )}

            {repeatType !== "fixa" &&
              !isCartao &&
              !lancamentoToEdit?.isShadow && (
                <div className="flex items-center gap-2 border p-3 rounded-md bg-card mt-4">
                  <Checkbox
                    id="pago"
                    checked={formData.pago}
                    onCheckedChange={(c) =>
                      setFormData({ ...formData, pago: c === true })
                    }
                    disabled={isSubmitting}
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
            <div className="h-4"></div>
          </form>
        </div>

        {/* RODAPÉ E BOTÕES DE AÇÃO */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-10 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl"
            type="submit"
            form="lancamento-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />{" "}
                Salvando...
              </>
            ) : (
              "Salvar Lançamento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
