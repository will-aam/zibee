"use client";

import * as React from "react";
import { useMemo, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import type { Meta } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

interface MetaFormSheetProps {
  metaToEdit: Meta | null;
  onClose: () => void;
  onSuccess: () => void;
}

type MetaTipo = "vista" | "parcelado";

function todayYYYYMMDD() {
  return new Date().toISOString().split("T")[0];
}

function toNumberOrZero(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function MetaFormSheet({
  metaToEdit,
  onClose,
  onSuccess,
}: MetaFormSheetProps) {
  const { toast } = useToast();

  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const editingId = metaToEdit?.id ?? null;

  const [isSaving, setIsSaving] = useState(false);

  const [parcelamentoConfig, setParcelamentoConfig] = useState({
    totalParcelas: metaToEdit?.auto_meses_duracao
      ? String(metaToEdit.auto_meses_duracao)
      : "",
    valorParcela: metaToEdit?.auto_valor ? String(metaToEdit.auto_valor) : "",
  });

  const [formData, setFormData] = useState<Partial<Meta>>({
    nome: metaToEdit?.nome || "",
    link: metaToEdit?.link || "",
    descricao: metaToEdit?.descricao || "",
    valor_total: metaToEdit?.valor_total || 0,
    valor_depositado: metaToEdit?.valor_depositado || 0,
    data_inicio: metaToEdit?.data_inicio || todayYYYYMMDD(),
    tipo: (metaToEdit?.tipo as MetaTipo) || "vista",
    fixada: metaToEdit?.fixada || false,
    auto_deposito_ativo: metaToEdit?.auto_deposito_ativo || false,
    auto_valor: metaToEdit?.auto_valor || 0,
    auto_dia_cobranca: metaToEdit?.auto_dia_cobranca || 15,
    auto_horario: metaToEdit?.auto_horario || "12:00",
    auto_meses_duracao: metaToEdit?.auto_meses_duracao || 0,
    auto_data_inicio:
      metaToEdit?.auto_data_inicio ||
      metaToEdit?.data_inicio ||
      todayYYYYMMDD(),
  });

  useEffect(() => {
    setParcelamentoConfig({
      totalParcelas: metaToEdit?.auto_meses_duracao
        ? String(metaToEdit.auto_meses_duracao)
        : "",
      valorParcela: metaToEdit?.auto_valor ? String(metaToEdit.auto_valor) : "",
    });

    setFormData({
      nome: metaToEdit?.nome || "",
      link: metaToEdit?.link || "",
      descricao: metaToEdit?.descricao || "",
      valor_total: metaToEdit?.valor_total || 0,
      valor_depositado: metaToEdit?.valor_depositado || 0,
      data_inicio: metaToEdit?.data_inicio || todayYYYYMMDD(),
      tipo: (metaToEdit?.tipo as MetaTipo) || "vista",
      fixada: metaToEdit?.fixada || false,
      auto_deposito_ativo: metaToEdit?.auto_deposito_ativo || false,
      auto_valor: metaToEdit?.auto_valor || 0,
      auto_dia_cobranca: metaToEdit?.auto_dia_cobranca || 15,
      auto_horario: metaToEdit?.auto_horario || "12:00",
      auto_meses_duracao: metaToEdit?.auto_meses_duracao || 0,
      auto_data_inicio:
        metaToEdit?.auto_data_inicio ||
        metaToEdit?.data_inicio ||
        todayYYYYMMDD(),
    });
  }, [metaToEdit]);

  const setField = useCallback(
    <K extends keyof Partial<Meta>>(key: K, value: Partial<Meta>[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const totalParceladoCalculado = useMemo(() => {
    const totalParcelas = toNumberOrZero(parcelamentoConfig.totalParcelas);
    const valorParcela = toNumberOrZero(parcelamentoConfig.valorParcela);
    if (totalParcelas <= 0 || valorParcela <= 0) return 0;
    return totalParcelas * valorParcela;
  }, [parcelamentoConfig.totalParcelas, parcelamentoConfig.valorParcela]);

  useEffect(() => {
    if (formData.tipo !== "parcelado") return;
    if (totalParceladoCalculado <= 0) return;

    setFormData((prev) => ({
      ...prev,
      valor_total: totalParceladoCalculado,
      auto_deposito_ativo: true,
      auto_valor: toNumberOrZero(parcelamentoConfig.valorParcela),
      auto_meses_duracao: toNumberOrZero(parcelamentoConfig.totalParcelas),
      auto_data_inicio: prev.data_inicio || todayYYYYMMDD(),
    }));
  }, [
    formData.tipo,
    totalParceladoCalculado,
    parcelamentoConfig.totalParcelas,
    parcelamentoConfig.valorParcela,
  ]);

  const handleParcelamentoChange = useCallback(
    (field: "totalParcelas" | "valorParcela", value: string) => {
      setParcelamentoConfig((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!userId) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.nome?.trim()) {
        toast({ title: "Informe o nome da meta.", variant: "destructive" });
        return;
      }

      if (formData.tipo === "parcelado") {
        if (
          toNumberOrZero(parcelamentoConfig.totalParcelas) <= 0 ||
          toNumberOrZero(parcelamentoConfig.valorParcela) <= 0
        ) {
          toast({
            title: "Parcelamento inválido",
            description: "Informe quantidade de parcelas e valor da parcela.",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (toNumberOrZero(formData.valor_total) <= 0) {
          toast({
            title: "Valor inválido",
            description: "Informe o valor total da meta.",
            variant: "destructive",
          });
          return;
        }
      }

      setIsSaving(true);
      try {
        const payload = {
          user_id: userId,
          nome: formData.nome,
          link: formData.link?.trim() ? formData.link.trim() : null,
          descricao: formData.descricao || "",
          valor_total: toNumberOrZero(formData.valor_total),
          valor_depositado: toNumberOrZero(formData.valor_depositado),
          data_inicio: formData.data_inicio || null,
          data_conclusao: null,
          tipo: formData.tipo as MetaTipo,
          fixada: !!formData.fixada,
          auto_deposito_ativo: !!formData.auto_deposito_ativo,
          auto_valor:
            (formData.tipo as MetaTipo) === "parcelado"
              ? toNumberOrZero(parcelamentoConfig.valorParcela)
              : toNumberOrZero(formData.auto_valor),
          auto_dia_cobranca: toNumberOrZero(formData.auto_dia_cobranca) || 15,
          auto_horario: formData.auto_horario || "00:00",
          auto_data_inicio: formData.data_inicio || null,
          auto_meses_duracao:
            (formData.tipo as MetaTipo) === "parcelado"
              ? toNumberOrZero(parcelamentoConfig.totalParcelas)
              : toNumberOrZero(formData.auto_meses_duracao),
          parcelamentos: formData.parcelamentos,
        };

        if (editingId) {
          const { error } = await supabase
            .from("metas")
            .update(payload)
            .eq("id", editingId)
            .eq("user_id", userId);
          if (error) throw error;
          toast({ title: "Meta atualizada!" });
        } else {
          const { error } = await supabase.from("metas").insert([payload]);
          if (error) throw error;
          toast({ title: "Meta criada!" });
        }

        onSuccess();
        onClose();
      } catch (err: any) {
        toast({
          title: "Erro ao salvar",
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      editingId,
      formData,
      onClose,
      onSuccess,
      parcelamentoConfig.totalParcelas,
      parcelamentoConfig.valorParcela,
      toast,
      userId,
    ],
  );

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl h-dvh max-h-dvh overflow-y-auto overscroll-contain px-5 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <SheetHeader className="pt-2">
          <SheetTitle>{editingId ? "Editar Meta" : "Nova Meta"}</SheetTitle>
          <SheetDescription>
            Defina os detalhes do seu objetivo financeiro.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Meta</Label>
              <Input
                id="nome"
                value={formData.nome || ""}
                onChange={(e) => setField("nome", e.target.value)}
                placeholder="Ex: Notebook novo"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link do Produto (opcional)</Label>
              <Input
                id="link"
                type="url"
                value={formData.link || ""}
                onChange={(e) => setField("link", e.target.value)}
                placeholder="https://exemplo.com/produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ""}
                onChange={(e) => setField("descricao", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Planejamento</Label>
            <Tabs
              value={(formData.tipo as MetaTipo) || "vista"}
              onValueChange={(value) => setField("tipo", value as MetaTipo)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="vista">À Vista</TabsTrigger>
                <TabsTrigger value="parcelado">Parcelado</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {formData.tipo === "parcelado" ? (
            <div className="rounded-2xl border p-4 bg-accent/20">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totalParcelas">Quantas parcelas?</Label>
                  <Input
                    id="totalParcelas"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={parcelamentoConfig.totalParcelas}
                    onChange={(e) =>
                      handleParcelamentoChange("totalParcelas", e.target.value)
                    }
                    placeholder="Ex: 12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorParcela">Valor da parcela (R$)</Label>
                  <Input
                    id="valorParcela"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={parcelamentoConfig.valorParcela}
                    onChange={(e) =>
                      handleParcelamentoChange("valorParcela", e.target.value)
                    }
                    placeholder="Ex: 250.00"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-background/60 rounded-xl text-center text-sm border">
                Total calculado:{" "}
                <span className="font-bold text-primary">
                  R$ {totalParceladoCalculado.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="valorTotal">Valor Total da Meta (R$)</Label>
              <Input
                id="valorTotal"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={String(formData.valor_total ?? "")}
                onChange={(e) =>
                  setField("valor_total", Number(e.target.value))
                }
                required
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={String(formData.data_inicio ?? "")}
                onChange={(e) => setField("data_inicio", e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Data usada para iniciar as automações.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorDepositado">
                Já tem algum valor guardado?
              </Label>
              <Input
                id="valorDepositado"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={String(formData.valor_depositado ?? "")}
                onChange={(e) =>
                  setField("valor_depositado", Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border p-4 bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base">Simulação Automática</Label>
                <p className="text-sm text-muted-foreground">
                  {(formData.tipo as MetaTipo) === "parcelado"
                    ? "O sistema irá 'pagar' as parcelas automaticamente."
                    : "Adicione saldo automaticamente todo mês."}
                </p>
              </div>

              <Switch
                checked={!!formData.auto_deposito_ativo}
                onCheckedChange={(checked) =>
                  setField("auto_deposito_ativo", checked)
                }
                disabled={(formData.tipo as MetaTipo) === "parcelado"}
              />
            </div>

            {!!formData.auto_deposito_ativo && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                {(formData.tipo as MetaTipo) === "vista" && (
                  <div className="space-y-2">
                    <Label htmlFor="autoValor">Valor Mensal (R$)</Label>
                    <Input
                      id="autoValor"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={String(formData.auto_valor ?? "")}
                      onChange={(e) =>
                        setField("auto_valor", Number(e.target.value))
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="autoDia">Dia da Cobrança</Label>
                  <Input
                    id="autoDia"
                    type="number"
                    min="1"
                    max="31"
                    inputMode="numeric"
                    value={String(formData.auto_dia_cobranca ?? 15)}
                    onChange={(e) =>
                      setField("auto_dia_cobranca", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoHorario">Horário</Label>
                  <Input
                    id="autoHorario"
                    type="time"
                    value={String(formData.auto_horario ?? "12:00")}
                    onChange={(e) => setField("auto_horario", e.target.value)}
                  />
                </div>

                {(formData.tipo as MetaTipo) === "vista" && (
                  <div className="space-y-2">
                    <Label htmlFor="autoMeses">Duração (Meses)</Label>
                    <Input
                      id="autoMeses"
                      type="number"
                      inputMode="numeric"
                      placeholder="Vazio = Infinito"
                      value={String(formData.auto_meses_duracao ?? "")}
                      onChange={(e) =>
                        setField("auto_meses_duracao", Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingId ? (
                "Salvar Alterações"
              ) : (
                "Criar Meta"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
