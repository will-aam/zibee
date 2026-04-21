"use client";

import type React from "react";
import { Switch } from "@/components/ui/switch";
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
  CreditCardIcon,
} from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";

import { MonthSelector } from "./releases/MonthSelector";
import { LancamentoItem } from "./releases/LancamentoItem";
import { LancamentosFilters } from "./releases/LancamentosFilters";
import { LancamentoFormDialog } from "./releases/LancamentoFormDialog";

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

const memoryCache = {
  lancamentosPorMes: {} as Record<string, Lancamento[]>,
  categorias: {} as Record<
    string,
    { id: number; nome: string; regra_orcamento?: string }[]
  >,
  formasPagamento: null as { id: number; nome: string }[] | null,
  cartoes: {} as Record<string, any[]>,
};

interface LancamentosProps {
  onNavigate?: (tab: string) => void;
}

export default function Lancamentos({ onNavigate }: LancamentosProps) {
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

  const [categoriasDB, setCategoriasDB] = useState<
    { id: number; nome: string; regra_orcamento?: string }[]
  >(memoryCache.categorias[activeContext] || []);
  const [formasPagamentoDB, setFormasPagamentoDB] = useState(
    memoryCache.formasPagamento || [],
  );
  const [cartoesDB, setCartoesDB] = useState<any[]>(
    memoryCache.cartoes[activeContext] || [],
  );
  const [loading, setLoading] = useState(
    !memoryCache.lancamentosPorMes[cacheKey],
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] =
    useState<Lancamento | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [filtrosCategoria, setFiltrosCategoria] = useState<string[]>([]);
  const [filtrosPagamento, setFiltrosPagamento] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroNatureza, setFiltroNatureza] = useState<string>("todas");
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  // PASSO 1: ESTADO DO MODAL ATUALIZADO
  const [deleteConfig, setDeleteConfig] = useState<{
    isOpen: boolean;
    type: "single" | "bulk" | null;
    id?: number;
    grupoParcelaId?: string | null; // <-- NOVO: Guardar o fio invisível
  }>({ isOpen: false, type: null });

  // <-- NOVO: Estado para rastrear a escolha do usuário no Modal (excluir só 1 ou todas)
  const [excluirTodasParcelas, setExcluirTodasParcelas] = useState(false);

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

      let queryLancamentos = supabase
        .from("lancamentos")
        .select("*")
        .gte("data_vencimento", dataInicio)
        .lte("data_vencimento", dataFim)
        .order("data_vencimento", { ascending: true });

      let queryFixas = supabase.from("despesas_fixas").select("*");

      let queryCat = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", userId)
        .order("nome");
      let queryCartoes = supabase
        .from("cartoes_credito")
        .select("*")
        .eq("user_id", userId)
        .order("nome");

      if (activeContext === "grupo" && groupId) {
        queryLancamentos = queryLancamentos.eq("grupo_id", groupId);
        queryFixas = queryFixas.eq("grupo_id", groupId);
        queryCartoes = supabase
          .from("cartoes_credito")
          .select("*")
          .eq("grupo_id", groupId)
          .order("nome");
      } else {
        queryLancamentos = queryLancamentos
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryFixas = queryFixas.eq("user_id", userId).is("grupo_id", null);
      }

      const [resLancamentos, resFixas, resCat, resPay, resCartoes] =
        await Promise.all([
          queryLancamentos,
          queryFixas,
          !memoryCache.categorias[activeContext]
            ? queryCat
            : Promise.resolve({ data: memoryCache.categorias[activeContext] }),
          !memoryCache.formasPagamento
            ? supabase.from("formas_pagamento").select("*").order("nome")
            : Promise.resolve({ data: memoryCache.formasPagamento }),
          !memoryCache.cartoes[activeContext]
            ? queryCartoes
            : Promise.resolve({ data: memoryCache.cartoes[activeContext] }),
        ]);

      if (resLancamentos.data) {
        const dadosLancamentos = resLancamentos.data as unknown as Lancamento[];
        const dadosFixas = resFixas.data || [];

        const contasFixasJaPagasNoMes = new Set(
          dadosLancamentos
            .filter((l) => l.conta_fixa_id != null)
            .map((l) => l.conta_fixa_id),
        );

        const sombras: Lancamento[] = [];

        dadosFixas.forEach((fixa) => {
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
              cartao_id: fixa.cartao_id,
              isShadow: true,
              status_fixa: fixa.status,
            } as any);
          }
        });

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

      if (resCartoes.data) {
        memoryCache.cartoes[activeContext] = resCartoes.data;
        setCartoesDB(resCartoes.data);
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
    if ((l as any).status_fixa === "pausado" && !mostrarOcultos) return false;

    const matchSearch = l.descricao
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchTipo = filtrosTipo.length === 0 || filtrosTipo.includes(l.tipo);

    const categoriaLancamento = (l.categoria || "").trim().toLowerCase();
    const categoriasSelecionadas = filtrosCategoria.map((c) =>
      c.trim().toLowerCase(),
    );
    const matchCategoria =
      filtrosCategoria.length === 0 ||
      categoriasSelecionadas.includes(categoriaLancamento);

    const pagamentoLancamento = (l.forma_pagamento || "").trim().toLowerCase();
    const pagamentosSelecionados = filtrosPagamento.map((p) =>
      p.trim().toLowerCase(),
    );
    const matchPagamento =
      filtrosPagamento.length === 0 ||
      pagamentosSelecionados.includes(pagamentoLancamento);

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
      (l) => !l.isShadow && (l as any).status_fixa !== "pausado",
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

  // PASSO 2: LÓGICA DE EXCLUSÃO INTERCEPTANDO O FILO INVISÍVEL
  const handleDeleteClick = (id: number) => {
    // Procurar o lançamento na memória para ver se tem o grupo
    const lancamentoParaExcluir = lancamentos.find((l) => l.id === id);

    // Resetar o switch para false toda vez que abrir o modal
    setExcluirTodasParcelas(false);

    setDeleteConfig({
      isOpen: true,
      type: "single",
      id,
      grupoParcelaId: (lancamentoParaExcluir as any)?.grupo_parcela_id || null, // Pega o fio invisível se existir
    });
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

        // PASSO 3: NOVA LÓGICA DE EXCLUSÃO NO BANCO
      } else if (deleteConfig.type === "single" && deleteConfig.id) {
        const isShadow = deleteConfig.id < 0;
        const realId = isShadow ? -deleteConfig.id : deleteConfig.id;

        let query;

        // Se for uma conta fixa (sombra), apagamos da tabela de matrizes
        if (isShadow) {
          const remaining = lancamentos.filter((l) => l.id !== deleteConfig.id);
          setLancamentos(remaining);
          memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
            remaining;

          query = supabase.from("despesas_fixas").delete().eq("id", realId);
          if (activeContext === "grupo" && currentGroupId)
            query = query.eq("grupo_id", currentGroupId);
          else query = query.eq("user_id", userId).is("grupo_id", null);

          await query;
          toast({ title: "Conta Fixa cancelada!" });
        } else {
          // Lançamento normal. Pode ser parcela ou não.
          // Se ele marcou para apagar TODAS as parcelas e temos um grupo_parcela_id
          if (excluirTodasParcelas && deleteConfig.grupoParcelaId) {
            // Tira da tela tudo que for desse grupo (apenas o que estiver no mês visível sumirá agora)
            const remaining = lancamentos.filter(
              (l: any) => l.grupo_parcela_id !== deleteConfig.grupoParcelaId,
            );
            setLancamentos(remaining);
            memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
              remaining;

            // Manda o banco apagar tudo ligado àquele código
            query = supabase
              .from("lancamentos")
              .delete()
              .eq("grupo_parcela_id", deleteConfig.grupoParcelaId);

            if (activeContext === "grupo" && currentGroupId)
              query = query.eq("grupo_id", currentGroupId);
            else query = query.eq("user_id", userId).is("grupo_id", null);

            await query;
            toast({ title: "Todas as parcelas foram excluídas!" });
          } else {
            // Fluxo Padrão: Apaga só o item que ele clicou
            const remaining = lancamentos.filter(
              (l) => l.id !== deleteConfig.id,
            );
            setLancamentos(remaining);
            memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
              remaining;

            query = supabase.from("lancamentos").delete().eq("id", realId);

            if (activeContext === "grupo" && currentGroupId)
              query = query.eq("grupo_id", currentGroupId);
            else query = query.eq("user_id", userId).is("grupo_id", null);

            await query;
            toast({ title: "Excluído com sucesso." });
          }
        }

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
      if (lancamento.isShadow) {
        const { id, isShadow, status_fixa, cartao_id, ...resto } =
          lancamento as any;

        const payloadInsert = { ...resto, cartao_id, pago: true };

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

            <Button
              onClick={() => onNavigate?.("cartoes")}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-xl md:hidden"
              title="Meus Cartões"
            >
              <CreditCardIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

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
              <div className="flex items-center gap-4 sm:gap-6 px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      lancamentosFiltrados.filter(
                        (l) =>
                          !l.isShadow && (l as any).status_fixa !== "pausado",
                      ).length > 0 &&
                      selectedIds.length ===
                        lancamentosFiltrados.filter(
                          (l) =>
                            !l.isShadow && (l as any).status_fixa !== "pausado",
                        ).length
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

                <div className="w-px h-4 bg-border hidden sm:block" />

                <div className="flex items-center gap-2">
                  <Switch
                    id="mostrar-ocultos"
                    checked={mostrarOcultos}
                    onCheckedChange={setMostrarOcultos}
                    className="scale-75 origin-left"
                  />
                  <Label
                    htmlFor="mostrar-ocultos"
                    className="cursor-pointer font-medium text-sm text-muted-foreground select-none"
                  >
                    Mostrar pausadas
                  </Label>
                </div>
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
                {lancamentosFiltrados.map((lancamento) => {
                  const nomeLimpo = (lancamento.categoria || "")
                    .trim()
                    .toLowerCase();
                  const regra = categoriasDB.find(
                    (c: any) => c.nome.trim().toLowerCase() === nomeLimpo,
                  )?.regra_orcamento;

                  let infoFatura:
                    | { mesFormatado: string; ano: number }
                    | undefined;

                  if (lancamento.cartao_id) {
                    const cartao = cartoesDB.find(
                      (c) => c.id === lancamento.cartao_id,
                    );
                    if (cartao) {
                      const dataCompra = new Date(
                        lancamento.data_vencimento + "T12:00:00",
                      );
                      const mesCompra = dataCompra.getMonth();
                      const anoCompra = dataCompra.getFullYear();
                      const diaCompra = dataCompra.getDate();

                      let dataFaturaReal = new Date(anoCompra, mesCompra, 1);
                      if (diaCompra > cartao.dia_fechamento) {
                        dataFaturaReal.setMonth(dataFaturaReal.getMonth() + 1);
                      }

                      const nomeMes = dataFaturaReal.toLocaleString("pt-BR", {
                        month: "long",
                      });
                      const nomeMesCapitalizado =
                        nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

                      infoFatura = {
                        mesFormatado: nomeMesCapitalizado,
                        ano: dataFaturaReal.getFullYear(),
                      };
                    }
                  }

                  return (
                    <LancamentoItem
                      key={lancamento.id}
                      lancamento={lancamento}
                      categoriaRegra={regra}
                      infoFatura={infoFatura}
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
                  );
                })}
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
        cartoesDB={cartoesDB}
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
        {/* PASSO 4: MODAL VISUAL ATUALIZADO COM O SWITCH DE EXCLUSÃO EM CASCATA */}
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

          {/* NOVA SEÇÃO: O Switch aparece só se for uma despesa parcelada do novo modelo */}
          {deleteConfig.type === "single" &&
            deleteConfig.grupoParcelaId &&
            !isShadowDeleting && (
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between mt-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-foreground">
                    Excluir todas as parcelas?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Apagará todos os lançamentos futuros vinculados a esta
                    compra.
                  </p>
                </div>
                <Switch
                  checked={excluirTodasParcelas}
                  onCheckedChange={setExcluirTodasParcelas}
                />
              </div>
            )}

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
