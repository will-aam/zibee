"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext"; // <-- Cérebro Global
import type { Lancamento } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

// CACHE EM MEMÓRIA
const memoryCache = {
  lancamentosPorMes: {} as Record<string, Lancamento[]>,
  categorias: null as { id: number; nome: string }[] | null,
  formasPagamento: null as { id: number; nome: string }[] | null,
};

export default function Lancamentos() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace(); // <-- Puxando o contexto

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  const [date, setDate] = useState<Date>(new Date());
  const [filtroMes, setFiltroMes] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const cacheKey = `${filtroMes}_${activeContext}`;
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(
    memoryCache.lancamentosPorMes[cacheKey] || [],
  );
  const [categoriasDB, setCategoriasDB] = useState(
    memoryCache.categorias || [],
  );
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
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [filtrosCategoria, setFiltrosCategoria] = useState<string[]>([]);
  const [filtrosPagamento, setFiltrosPagamento] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

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
      // 1. BUSCAR GRUPO ID (SE FOR MODO GRUPO)
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
      const dataFim = `${filtroMes}-${new Date(parseInt(ano), parseInt(mes), 0).getDate()}`;

      let queryLancamentos = supabase
        .from("lancamentos")
        .select("*")
        .gte("data_vencimento", dataInicio)
        .lte("data_vencimento", dataFim)
        .order("data_vencimento", { ascending: true });

      // FILTRO DO CONTEXTO
      if (activeContext === "grupo" && groupId) {
        queryLancamentos = queryLancamentos.eq("grupo_id", groupId);
      } else {
        queryLancamentos = queryLancamentos
          .eq("user_id", userId)
          .is("grupo_id", null);
      }

      const [resLancamentos, resCat, resPay] = await Promise.all([
        queryLancamentos,
        !memoryCache.categorias
          ? supabase.from("categorias").select("*").order("nome")
          : Promise.resolve({ data: memoryCache.categorias }),
        !memoryCache.formasPagamento
          ? supabase.from("formas_pagamento").select("*").order("nome")
          : Promise.resolve({ data: memoryCache.formasPagamento }),
      ]);

      if (resLancamentos.data) {
        const dados = resLancamentos.data as unknown as Lancamento[];
        memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] = dados;
        setLancamentos(dados);
      }
      if (resCat.data && !memoryCache.categorias) {
        memoryCache.categorias = resCat.data;
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
    return (
      matchSearch &&
      matchTipo &&
      matchCategoria &&
      matchPagamento &&
      matchStatus
    );
  });

  const handleSelectAll = () => {
    if (
      selectedIds.length === lancamentosFiltrados.length &&
      lancamentosFiltrados.length > 0
    )
      setSelectedIds([]);
    else setSelectedIds(lancamentosFiltrados.map((l) => l.id));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !confirm("Excluir itens selecionados?"))
      return;
    try {
      const remaining = lancamentos.filter((l) => !selectedIds.includes(l.id));
      setLancamentos(remaining);
      memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
        remaining;
      setSelectedIds([]);

      let query = supabase.from("lancamentos").delete().in("id", selectedIds);
      if (activeContext === "grupo" && currentGroupId)
        query = query.eq("grupo_id", currentGroupId);
      else query = query.eq("user_id", userId).is("grupo_id", null);

      await query;
      toast({ title: `${selectedIds.length} excluídos.` });
    } catch {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      const remaining = lancamentos.filter((l) => l.id !== id);
      setLancamentos(remaining);
      memoryCache.lancamentosPorMes[`${filtroMes}_${activeContext}`] =
        remaining;

      let query = supabase.from("lancamentos").delete().eq("id", id);
      if (activeContext === "grupo" && currentGroupId)
        query = query.eq("grupo_id", currentGroupId);
      else query = query.eq("user_id", userId).is("grupo_id", null);

      await query;
      toast({ title: "Excluído com sucesso" });
    } catch {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const togglePago = async (lancamento: Lancamento) => {
    try {
      const novoStatus = !lancamento.pago;
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

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto pb-24 overflow-x-hidden w-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lançamentos{" "}
            {activeContext === "grupo" && (
              <span className="text-primary">(Grupo)</span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            Controle de receitas e despesas
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MonthSelector date={date} setDate={setDate} />
          <Button
            onClick={handleNovoLancamento}
            size="icon"
            className="shrink-0 h-10 w-10 rounded-xl"
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
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
        // NOVOS PROPS PARA O FORMULÁRIO ENVIAR PRO GRUPO CORRETO
        activeContext={activeContext}
        groupId={currentGroupId}
      />

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
          categoriasOptions={categoriasDB}
          pagamentoOptions={formasPagamentoDB}
        />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="select-all"
              checked={
                lancamentosFiltrados.length > 0 &&
                selectedIds.length === lancamentosFiltrados.length
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
              onClick={handleBulkDelete}
              className="h-8 rounded-lg animate-in zoom-in-95"
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
              filtroStatus) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFiltrosTipo([]);
                  setFiltrosCategoria([]);
                  setFiltrosPagamento([]);
                  setFiltroStatus(null);
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
                  if (selectedIds.includes(lancamento.id))
                    setSelectedIds((prev) =>
                      prev.filter((id) => id !== lancamento.id),
                    );
                  else setSelectedIds((prev) => [...prev, lancamento.id]);
                }}
                onTogglePago={() => togglePago(lancamento)}
                onEdit={() => handleEdit(lancamento)}
                onDelete={() => handleDelete(lancamento.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
