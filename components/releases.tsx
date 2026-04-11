"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Lancamento } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  TrashIcon,
  FunnelIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";

// COMPONENTES
import { MonthSelector } from "./releases/MonthSelector";
import { LancamentoItem } from "./releases/LancamentoItem";
import { LancamentosFilters } from "./releases/LancamentosFilters";
import { LancamentoFormDialog } from "./releases/LancamentoFormDialog";

// IMPORTAÇÃO DO ALERT DIALOG DA NOSSA UI
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

// CACHE EM MEMÓRIA (Agora separa as categorias por contexto: Pessoal/Grupo)
const memoryCache = {
  lancamentosPorMes: {} as Record<string, Lancamento[]>,
  categorias: {} as Record<string, { id: number; nome: string }[]>,
  formasPagamento: null as { id: number; nome: string }[] | null,
};

export default function Lancamentos() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  const [date, setDate] = useState<Date>(new Date());
  const [filtroMes, setFiltroMes] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const cacheKey = `${filtroMes}_${activeContext}`;
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(
    memoryCache.lancamentosPorMes[cacheKey] || [],
  );

  // Inicia puxando as categorias específicas do contexto atual
  const [categoriasDB, setCategoriasDB] = useState<
    { id: number; nome: string }[]
  >(memoryCache.categorias[activeContext] || []);
  const [formasPagamentoDB, setFormasPagamentoDB] = useState(
    memoryCache.formasPagamento || [],
  );
  const [loading, setLoading] = useState(
    !memoryCache.lancamentosPorMes[cacheKey],
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] =
    useState<Lancamento | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // --- FILTROS ---
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [filtrosCategoria, setFiltrosCategoria] = useState<string[]>([]);
  const [filtrosPagamento, setFiltrosPagamento] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroNatureza, setFiltroNatureza] = useState<string>("todas");

  const [deleteConfig, setDeleteConfig] = useState<{
    isOpen: boolean;
    type: "single" | "bulk" | null;
    id?: number;
  }>({ isOpen: false, type: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, "0");
      const novoMes = `${ano}-${mes}`;
      setFiltroMes(novoMes);

      const novoCacheKey = `${novoMes}_${activeContext}`;
      if (memoryCache.lancamentosPorMes[novoCacheKey]) {
        setLancamentos(memoryCache.lancamentosPorMes[novoCacheKey]);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
  }, [date, activeContext]);

  const fetchAllData = useCallback(async () => {
    if (!userId) return;

    try {
      let groupId = currentGroupId;
      if (activeContext === "grupo" && !groupId) {
        const { data: myGroup } = await supabase
          .from("grupos")
          .select("id")
          .eq("criador_id", userId)
          .maybeSingle();
        if (myGroup) groupId = myGroup.id;
        else {
          const { data: membership } = await supabase
            .from("membros_grupo")
            .select("grupo_id")
            .eq("user_id", userId)
            .eq("status", "Aceito")
            .maybeSingle();
          if (membership) groupId = membership.grupo_id;
        }
        setCurrentGroupId(groupId);
        if (!groupId) {
          setLoading(false);
          return;
        }
      }

      const [ano, mes] = filtroMes.split("-");
      const dataInicio = `${filtroMes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const dataFim = `${filtroMes}-${ultimoDia}`;

      // 1. BUSCAR LANÇAMENTOS DO MÊS
      let queryLancamentos = supabase
        .from("lancamentos")
        .select("*")
        .gte("data_vencimento", dataInicio)
        .lte("data_vencimento", dataFim)
        .order("data_vencimento", { ascending: true });

      // 2. BUSCAR CONTAS FIXAS ATIVAS E PAUSADAS
      let queryFixas = supabase.from("despesas_fixas").select("*");

      // 3. BUSCAR AS CATEGORIAS MÁGICAS (Agora individuais por contexto)
      let queryCat = supabase.from("categorias").select("*").order("nome");

      if (activeContext === "grupo" && groupId) {
        queryLancamentos = queryLancamentos.eq("grupo_id", groupId);
        queryFixas = queryFixas.eq("grupo_id", groupId);
        queryCat = queryCat.eq("grupo_id", groupId);
      } else {
        queryLancamentos = queryLancamentos
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryFixas = queryFixas.eq("user_id", userId).is("grupo_id", null);
        queryCat = queryCat.eq("user_id", userId).is("grupo_id", null);
      }

      const [resLancamentos, resFixas, resCat, resPay] = await Promise.all([
        queryLancamentos,
        queryFixas,
        !memoryCache.categorias[activeContext]
          ? queryCat
          : Promise.resolve({ data: memoryCache.categorias[activeContext] }),
        !memoryCache.formasPagamento
          ? supabase.from("formas_pagamento").select("*").order("nome")
          : Promise.resolve({ data: memoryCache.formasPagamento }),
      ]);

      if (resLancamentos.data) {
        const dadosLancamentos = resLancamentos.data as unknown as Lancamento[];
        const dadosFixas = resFixas.data || [];

        // 3. A MÁGICA: CRIANDO AS SOMBRAS (Apenas para Fixas "Ativas")
        const contasFixasJaPagasNoMes = new Set(
          dadosLancamentos
            .filter((l) => l.conta_fixa_id != null)
            .map((l) => l.conta_fixa_id),
        );

        const sombras: Lancamento[] = [];

        dadosFixas.forEach((fixa) => {
          if (fixa.status === "pausado") return;

          if (!contasFixasJaPagasNoMes.has(fixa.id)) {
            const diaSeguro = Math.min(fixa.dia_vencimento, ultimoDia);
            const diaStr = String(diaSeguro).padStart(2, "0");

            sombras.push({
              id: -fixa.id,
              user_id: fixa.user_id,
              grupo_id: fixa.grupo_id,
              descricao: fixa.descricao || fixa.nome || "Conta Fixa",
              categoria: fixa.categoria || "Sem categoria",
              tipo: "Despesa",
              valor: fixa.valor,
              forma_pagamento: fixa.forma_pagamento || "Pendente",
              data_vencimento: `${filtroMes}-${diaStr}`,
              pago: false,
              conta_fixa_id: fixa.id,
              isShadow: true,
            } as Lancamento);
          }
        });

        // 4. FUSÃO (Lançamentos + Sombras) ordenados por data
        const todosOsDados = [...dadosLancamentos, ...sombras].sort(
          (a, b) =>
            new Date(a.data_vencimento).getTime() -
            new Date(b.data_vencimento).getTime(),
        );

        memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
          todosOsDados;
        setLancamentos(todosOsDados);
      }

      if (resCat.data) {
        memoryCache.categorias[activeContext] = resCat.data;
        setCategoriasDB(resCat.data);
      }
      if (resPay.data && !memoryCache.formasPagamento) {
        memoryCache.formasPagamento = resPay.data;
        setFormasPagamentoDB(resPay.data);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filtroMes, userId, activeContext, currentGroupId, toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const lancamentosFiltrados = lancamentos.filter((l) => {
    const matchSearch = l.descricao
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchTipo = filtrosTipo.length === 0 || filtrosTipo.includes(l.tipo);
    const matchCategoria =
      filtrosCategoria.length === 0 || filtrosCategoria.includes(l.categoria);
    const matchPagamento =
      filtrosPagamento.length === 0 ||
      filtrosPagamento.includes(l.forma_pagamento);

    let matchStatus = true;
    if (filtroStatus === "pago") matchStatus = l.pago === true;
    if (filtroStatus === "pendente") matchStatus = l.pago === false;

    let matchNatureza = true;
    if (filtroNatureza === "unica")
      matchNatureza = !l.conta_fixa_id && !l.total_parcelas;
    if (filtroNatureza === "fixa") matchNatureza = !!l.conta_fixa_id;
    if (filtroNatureza === "parcelada") matchNatureza = !!l.total_parcelas;

    return (
      matchSearch &&
      matchTipo &&
      matchCategoria &&
      matchPagamento &&
      matchStatus &&
      matchNatureza
    );
  });

  const handleSelectAll = () => {
    const lancamentosSelecionaveis = lancamentosFiltrados.filter(
      (l) => !l.isShadow,
    );
    if (
      selectedIds.length === lancamentosSelecionaveis.length &&
      lancamentosSelecionaveis.length > 0
    )
      setSelectedIds([]);
    else setSelectedIds(lancamentosSelecionaveis.map((l) => l.id));
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfig({ isOpen: true, type: "bulk" });
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfig({ isOpen: true, type: "single", id });
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteConfig({ isOpen: false, type: null });
  };

  const confirmDeletion = async () => {
    setIsDeleting(true);

    try {
      if (deleteConfig.type === "bulk") {
        const remaining = lancamentos.filter(
          (l) => !selectedIds.includes(l.id),
        );
        setLancamentos(remaining);
        memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
          remaining;
        const idsToDelete = [...selectedIds];
        setSelectedIds([]);

        let query = supabase.from("lancamentos").delete().in("id", idsToDelete);
        if (activeContext === "grupo" && currentGroupId)
          query = query.eq("grupo_id", currentGroupId);
        else query = query.eq("user_id", userId).is("grupo_id", null);

        await query;
        toast({ title: `${idsToDelete.length} excluídos.` });
        window.dispatchEvent(new Event("zibee:transaction-changed"));
      } else if (deleteConfig.type === "single" && deleteConfig.id) {
        const isShadow = deleteConfig.id < 0;
        const realId = isShadow ? -deleteConfig.id : deleteConfig.id;

        const remaining = lancamentos.filter((l) => l.id !== deleteConfig.id);
        setLancamentos(remaining);
        memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
          remaining;

        let query;
        if (isShadow) {
          query = supabase.from("despesas_fixas").delete().eq("id", realId);
        } else {
          query = supabase.from("lancamentos").delete().eq("id", realId);
        }

        if (activeContext === "grupo" && currentGroupId)
          query = query.eq("grupo_id", currentGroupId);
        else query = query.eq("user_id", userId).is("grupo_id", null);

        await query;
        toast({
          title: isShadow ? "Conta Fixa cancelada!" : "Excluído com sucesso",
        });
        window.dispatchEvent(new Event("zibee:transaction-changed"));
      }
    } catch {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      closeDeleteDialog();
    }
  };

  const togglePago = async (lancamento: Lancamento) => {
    try {
      const novoStatus = !lancamento.pago;

      // 1. MATERIALIZAÇÃO DE SOMBRA
      if (lancamento.isShadow) {
        const { id, isShadow, ...dadosProBanco } = lancamento;
        const payloadInsert = { ...dadosProBanco, pago: true };

        const tempId = Date.now();
        const telaAtualizada = lancamentos.map((l) =>
          l.id === lancamento.id
            ? ({ ...payloadInsert, id: tempId } as Lancamento)
            : l,
        );
        setLancamentos(telaAtualizada);
        toast({ title: "Conta Fixa paga! Lançamento gerado." });

        const { data, error } = await supabase
          .from("lancamentos")
          .insert([payloadInsert])
          .select()
          .single();
        if (error) throw error;

        setLancamentos((prev) => prev.map((l) => (l.id === tempId ? data : l)));
        memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
          telaAtualizada;
        window.dispatchEvent(new Event("zibee:transaction-changed"));
        return;
      }

      // 2. TOGGLE NORMAL DE UM LANÇAMENTO REAL
      const updated = lancamentos.map((l) =>
        l.id === lancamento.id ? { ...l, pago: novoStatus } : l,
      );
      setLancamentos(updated);
      memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] = updated;

      let query = supabase
        .from("lancamentos")
        .update({ pago: novoStatus })
        .eq("id", lancamento.id);
      if (activeContext === "grupo" && currentGroupId)
        query = query.eq("grupo_id", currentGroupId);
      else query = query.eq("user_id", userId).is("grupo_id", null);

      await query;
      window.dispatchEvent(new Event("zibee:transaction-changed"));
    } catch {
      fetchAllData();
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleNovoLancamento = () => {
    setLancamentoEditando(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (lancamento: Lancamento) => {
    setLancamentoEditando(lancamento);
    setIsDialogOpen(true);
  };

  const isShadowDeleting =
    deleteConfig.type === "single" && deleteConfig.id && deleteConfig.id < 0;

  return (
    <>
      <div className="w-full px-4 pt-6 pb-24">
        {/* CABEÇALHO SUPERIOR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Lançamentos{" "}
              {activeContext === "grupo" && (
                <span className="text-primary text-xl">(Grupo)</span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie todas as suas despesas e receitas do mês.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div>
              <MonthSelector date={date} setDate={setDate} />
            </div>
            <Button
              onClick={handleNovoLancamento}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-xl"
            >
              <PlusIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL CHAPADO NA TELA */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Buscar lançamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-primary transition-all rounded-xl"
              />
            </div>

            <LancamentosFilters
              filtrosTipo={filtrosTipo}
              setFiltrosTipo={setFiltrosTipo}
              filtrosCategoria={filtrosCategoria}
              setFiltrosCategoria={setFiltrosCategoria}
              filtrosPagamento={filtrosPagamento}
              setFiltrosPagamento={setFiltrosPagamento}
              filtroStatus={filtroStatus}
              setFiltroStatus={setFiltroStatus}
              filtroNatureza={filtroNatureza}
              setFiltroNatureza={setFiltroNatureza}
              categoriasOptions={categoriasDB}
              pagamentoOptions={formasPagamentoDB}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id="select-all"
                  checked={
                    lancamentosFiltrados.filter((l) => !l.isShadow).length >
                      0 &&
                    selectedIds.length ===
                      lancamentosFiltrados.filter((l) => !l.isShadow).length
                  }
                  onCheckedChange={handleSelectAll}
                  className="rounded-lg"
                />
                <Label
                  htmlFor="select-all"
                  className="cursor-pointer font-medium text-sm text-muted-foreground"
                >
                  Selecionar Todos
                </Label>
              </div>

              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  className="h-8 rounded-lg"
                >
                  <TrashIcon className="h-3.5 w-3.5 mr-1.5" /> Excluir (
                  {selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* LISTA DE ITENS */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/50" />
              </div>
            ) : lancamentosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-2xl bg-accent/20">
                <FunnelIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">
                  Nenhum lançamento encontrado.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-4">
                  Mude o mês ou ajuste os filtros.
                </p>

                {(filtrosTipo.length > 0 ||
                  filtrosCategoria.length > 0 ||
                  searchQuery ||
                  filtroStatus ||
                  filtroNatureza !== "todas") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFiltrosTipo([]);
                      setFiltrosCategoria([]);
                      setFiltrosPagamento([]);
                      setFiltroStatus(null);
                      setFiltroNatureza("todas");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lancamentosFiltrados.map((lancamento) => (
                  <LancamentoItem
                    key={lancamento.id}
                    lancamento={lancamento}
                    isSelected={selectedIds.includes(lancamento.id)}
                    onSelect={() => {
                      if (lancamento.isShadow) return;
                      if (selectedIds.includes(lancamento.id)) {
                        setSelectedIds((prev) =>
                          prev.filter((id) => id !== lancamento.id),
                        );
                      } else {
                        setSelectedIds((prev) => [...prev, lancamento.id]);
                      }
                    }}
                    onTogglePago={() => togglePago(lancamento)}
                    onEdit={() => handleEdit(lancamento)}
                    onDelete={() => handleDeleteClick(lancamento.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <LancamentoFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchAllData}
        lancamentoToEdit={lancamentoEditando}
        userId={userId}
        categoriasDB={categoriasDB}
        formasPagamentoDB={formasPagamentoDB}
        activeContext={activeContext}
        groupId={currentGroupId}
      />

      <AlertDialog
        open={deleteConfig.isOpen}
        onOpenChange={(open) =>
          open
            ? setDeleteConfig({ ...deleteConfig, isOpen: true })
            : closeDeleteDialog()
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfig.type === "bulk"
                ? "Excluir lançamentos selecionados?"
                : isShadowDeleting
                  ? "Excluir Conta Fixa?"
                  : "Excluir lançamento?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {deleteConfig.type === "bulk"
                ? `Você está prestes a excluir ${selectedIds.length} lançamentos. Esta ação não pode ser desfeita.`
                : isShadowDeleting
                  ? "Você apagará esta regra de cobrança para os meses futuros. Os pagamentos já realizados nos meses anteriores serão mantidos no histórico."
                  : "Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeletion();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
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
