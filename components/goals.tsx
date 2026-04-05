"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import type { Meta } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Pin, PinOff } from "lucide-react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/solid";

import { MetaFormSheet } from "@/components/target/MetaFormSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Cache em memória (SWR manual)
 * - Voltar para a aba fica instantâneo.
 * - É "por usuário" para evitar vazamento entre contas em dev.
 */
const metasCache = {
  userId: null as string | null,
  metas: null as Meta[] | null,
  loadedAt: 0,
};

// Helpers
function formatYYYYMMDDLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYYYYMMDDToLocalDate(dateString: string) {
  const [ano, mes, dia] = dateString.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export default function Metas() {
  const { toast } = useToast();

  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const [metas, setMetas] = useState<Meta[]>(
    metasCache.userId === userId && metasCache.metas ? metasCache.metas : [],
  );
  const [loading, setLoading] = useState<boolean>(
    !(metasCache.userId === userId && metasCache.metas),
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [metaToEdit, setMetaToEdit] = useState<Meta | null>(null);

  // --- CONFIRMAÇÃO DE EXCLUSÃO (AlertDialog) ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [metaToDelete, setMetaToDelete] = useState<Meta | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteDialog = (meta: Meta) => {
    setMetaToDelete(meta);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setMetaToDelete(null);
  };

  /**
   * Processa simulações apenas para metas com automação ativa.
   */
  const processarSimulacoes = useCallback(
    async (metasCarregadas: Meta[]) => {
      if (!userId) return metasCarregadas;

      const agora = new Date();
      const hojeMeiaNoite = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate(),
      );

      let houveAtualizacao = false;

      const metasAtualizadas = await Promise.all(
        metasCarregadas.map(async (meta) => {
          if (!meta.auto_deposito_ativo) return meta;

          if (
            !meta.auto_valor ||
            !meta.auto_dia_cobranca ||
            !meta.auto_data_inicio
          ) {
            return meta;
          }

          // Define data de referência
          let dataReferencia: Date;
          if (meta.auto_ultimo_processamento) {
            dataReferencia = parseYYYYMMDDToLocalDate(
              meta.auto_ultimo_processamento,
            );
          } else {
            dataReferencia = parseYYYYMMDDToLocalDate(meta.auto_data_inicio);
            dataReferencia.setDate(dataReferencia.getDate() - 1);
          }

          let valorAdicional = 0;
          let novoUltimoProcessamento = meta.auto_ultimo_processamento;

          const tempDate = new Date(dataReferencia);
          tempDate.setDate(tempDate.getDate() + 1);

          while (tempDate <= hojeMeiaNoite) {
            // duração em meses
            if (meta.auto_meses_duracao && meta.auto_meses_duracao > 0) {
              const inicio = parseYYYYMMDDToLocalDate(meta.auto_data_inicio);
              const fim = new Date(inicio);
              fim.setMonth(fim.getMonth() + meta.auto_meses_duracao);
              if (tempDate > fim) break;
            }

            if (tempDate.getDate() === meta.auto_dia_cobranca) {
              let deveProcessar = true;

              if (
                tempDate.getTime() === hojeMeiaNoite.getTime() &&
                meta.auto_horario
              ) {
                const [hAg, mAg] = meta.auto_horario.split(":").map(Number);
                const hAtual = agora.getHours();
                const mAtual = agora.getMinutes();

                if (hAtual < hAg || (hAtual === hAg && mAtual < mAg)) {
                  deveProcessar = false;
                  break;
                }
              }

              if (deveProcessar) {
                valorAdicional += meta.auto_valor;
                novoUltimoProcessamento = formatYYYYMMDDLocal(tempDate);
              }
            }

            tempDate.setDate(tempDate.getDate() + 1);
          }

          if (valorAdicional <= 0) return meta;

          houveAtualizacao = true;

          const novoValorDepositado =
            (meta.valor_depositado || 0) + valorAdicional;

          const { error } = await supabase
            .from("metas")
            .update({
              valor_depositado: novoValorDepositado,
              auto_ultimo_processamento: novoUltimoProcessamento,
            })
            .eq("id", meta.id)
            .eq("user_id", userId);

          if (error) return meta;

          return {
            ...meta,
            valor_depositado: novoValorDepositado,
            auto_ultimo_processamento: novoUltimoProcessamento,
          };
        }),
      );

      if (houveAtualizacao) {
        toast({
          title: "Simulação processada",
          description: "Depósitos automáticos foram aplicados nas suas metas.",
        });
      }

      return metasAtualizadas;
    },
    [toast, userId],
  );

  const fetchMetas = useCallback(
    async (force = false) => {
      if (!userId) return;

      if (!force && metasCache.userId === userId && metasCache.metas) {
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("metas")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const processadas = await processarSimulacoes(
          data as unknown as Meta[],
        );

        setMetas(processadas);
        metasCache.userId = userId;
        metasCache.metas = processadas;
        metasCache.loadedAt = Date.now();
      } catch (err: any) {
        toast({
          title: "Erro ao carregar metas",
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [processarSimulacoes, toast, userId],
  );

  useEffect(() => {
    if (!userId) return;

    if (metasCache.userId && metasCache.userId !== userId) {
      metasCache.userId = userId;
      metasCache.metas = null;
      metasCache.loadedAt = 0;
      setMetas([]);
      setLoading(true);
    }

    fetchMetas(false);
  }, [fetchMetas, userId]);

  const confirmDelete = async () => {
    if (!userId || !metaToDelete) return;

    setDeleting(true);

    // otimista
    const prev = metas;
    const id = metaToDelete.id;

    setMetas((m) => m.filter((x) => x.id !== id));
    if (metasCache.userId === userId && metasCache.metas) {
      metasCache.metas = metasCache.metas.filter((x) => x.id !== id);
    }

    try {
      const { error } = await supabase
        .from("metas")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Meta removida" });
      setDeleteOpen(false);
      setMetaToDelete(null);
    } catch {
      setMetas(prev);
      metasCache.metas = prev;
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const toggleFixarMeta = async (id: number) => {
    if (!userId) return;

    const metaAtual = metas.find((m) => m.id === id);
    if (!metaAtual) return;

    try {
      if (metaAtual.fixada) {
        await supabase
          .from("metas")
          .update({ fixada: false })
          .eq("id", id)
          .eq("user_id", userId);

        const next = metas.map((m) =>
          m.id === id ? { ...m, fixada: false } : m,
        );
        setMetas(next);
        metasCache.metas = next;
        return;
      }

      const fixada = metas.find((m) => m.fixada);

      if (fixada) {
        await supabase
          .from("metas")
          .update({ fixada: false })
          .eq("id", fixada.id)
          .eq("user_id", userId);
      }

      await supabase
        .from("metas")
        .update({ fixada: true })
        .eq("id", id)
        .eq("user_id", userId);

      const next = metas.map((m) => {
        if (m.id === id) return { ...m, fixada: true };
        if (m.fixada) return { ...m, fixada: false };
        return m;
      });

      setMetas(next);
      metasCache.metas = next;
    } catch {
      toast({ title: "Erro ao fixar meta", variant: "destructive" });
    }
  };

  const handleOpenNewForm = () => {
    setMetaToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (meta: Meta) => {
    setMetaToEdit(meta);
    setIsFormOpen(true);
  };

  const metasView = useMemo(() => {
    return metas.map((meta) => {
      const total = Number(meta.valor_total || 0);
      const depositado = Number(meta.valor_depositado || 0);
      const progresso =
        total > 0 ? Math.min((depositado / total) * 100, 100) : 0;
      const falta = Math.max(total - depositado, 0);
      return { meta, progresso, falta };
    });
  }, [metas]);

  return (
    <>
      <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Metas Financeiras
            </h1>
            <p className="text-muted-foreground text-sm">
              Planeje e acompanhe suas conquistas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fetchMetas(true)}
              className="gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={handleOpenNewForm} className="gap-2">
              <PlusIcon className="h-4 w-4" /> Nova Meta
            </Button>
          </div>
        </div>

        {isFormOpen && (
          <MetaFormSheet
            metaToEdit={metaToEdit}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => fetchMetas(true)}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-14">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/70" />
          </div>
        ) : metasView.length === 0 ? (
          <div className="text-center text-muted-foreground py-14 border border-dashed rounded-2xl bg-accent/20">
            Nenhuma meta criada.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metasView.map(({ meta, progresso, falta }) => (
              <Card
                key={meta.id}
                className="hover:bg-accent/50 transition-all duration-200 relative overflow-hidden"
              >
                {meta.fixada && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1.5">
                    <Pin className="h-3 w-3" />
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-3 pr-8">
                    <div className="min-w-0">
                      {meta.link ? (
                        <a
                          href={meta.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg text-balance hover:underline inline-flex items-center gap-2 text-primary"
                        >
                          <span className="truncate">{meta.nome}</span>
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-lg text-balance block truncate">
                          {meta.nome}
                        </span>
                      )}
                    </div>

                    <ArrowTrendingUpIcon className="h-5 w-5 text-primary shrink-0" />
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">
                        {progresso.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={progresso} className="h-3" />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Falta:{" "}
                    <span className="font-bold text-primary">
                      R${" "}
                      {falta.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </p>

                  {meta.auto_deposito_ativo && (
                    <div className="mt-1 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground border border-border/50">
                      <ArrowPathIcon className="h-3.5 w-3.5 mt-0.5 text-green-600 animate-spin-slow" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          Depósito Automático Ativo
                        </p>
                        <p className="mt-0.5">
                          + R$ {Number(meta.auto_valor || 0).toFixed(2)} todo
                          dia {meta.auto_dia_cobranca}
                          {meta.auto_horario ? ` às ${meta.auto_horario}` : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {meta.data_conclusao && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <CalendarIcon className="h-3 w-3" />
                      <span>
                        Meta para{" "}
                        {new Date(meta.data_conclusao).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4 items-center pt-2">
                    <Button
                      size="sm"
                      variant={meta.fixada ? "default" : "outline"}
                      onClick={() => toggleFixarMeta(meta.id)}
                      className="flex-1"
                      title={meta.fixada ? "Desfixar" : "Fixar"}
                    >
                      {meta.fixada ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEditForm(meta)}
                        className="p-2 text-muted-foreground active:scale-90 transition-transform bg-transparent hover:bg-transparent"
                        title="Editar Meta"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => openDeleteDialog(meta)}
                        className="p-2 text-destructive active:scale-90 transition-transform bg-transparent hover:bg-transparent"
                        title="Excluir Meta"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ALERT DIALOG: confirmação de exclusão */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) =>
          open ? setDeleteOpen(true) : closeDeleteDialog()
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              {metaToDelete
                ? `Você tem certeza que deseja excluir a meta "${metaToDelete.nome}"? Essa ação não pode ser desfeita.`
                : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // evita comportamento padrão do Radix
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
