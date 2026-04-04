"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import type { Lancamento } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Filter, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// COMPONENTES
import { MonthSelector } from "./lancamentos/MonthSelector";
import { LancamentoItem } from "./lancamentos/LancamentoItem";
import { LancamentosFilters } from "./lancamentos/LancamentosFilters";
import { LancamentoFormDialog } from "./lancamentos/LancamentoFormDialog";

// CACHE EM MEMÓRIA (Stale-While-Revalidate)
// Guarda os dados para evitar telas de loading ao trocar de abas
const memoryCache = {
  lancamentosPorMes: {} as Record<string, Lancamento[]>,
  categorias: null as { id: number; nome: string }[] | null,
  formasPagamento: null as { id: number; nome: string }[] | null,
};

export default function Lancamentos() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  // Data e Mês de Referência
  const [date, setDate] = useState<Date>(new Date());
  const [filtroMes, setFiltroMes] = useState(
    new Date().toISOString().slice(0, 7),
  );

  // Estados inicializados pelo cache (para renderização instantânea)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(
    memoryCache.lancamentosPorMes[filtroMes] || [],
  );
  const [categoriasDB, setCategoriasDB] = useState(
    memoryCache.categorias || [],
  );
  const [formasPagamentoDB, setFormasPagamentoDB] = useState(
    memoryCache.formasPagamento || [],
  );

  // Só exibe loading se o mês selecionado não estiver no cache
  const [loading, setLoading] = useState(
    !memoryCache.lancamentosPorMes[filtroMes],
  );

  // Controle do Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] =
    useState<Lancamento | null>(null);

  // Seleção e Filtros
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [filtrosCategoria, setFiltrosCategoria] = useState<string[]>([]);
  const [filtrosPagamento, setFiltrosPagamento] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  // Quando a data muda, atualiza o mês e resgata do cache se possível
  useEffect(() => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, "0");
      const novoMes = `${ano}-${mes}`;

      setFiltroMes(novoMes);

      if (memoryCache.lancamentosPorMes[novoMes]) {
        setLancamentos(memoryCache.lancamentosPorMes[novoMes]);
        setLoading(false); // Já temos os dados
      } else {
        setLoading(true); // Precisamos buscar
      }
    }
  }, [date]);

  // Busca Inteligente de Dados
  const fetchAllData = useCallback(async () => {
    if (!userId) return;

    try {
      const [ano, mes] = filtroMes.split("-");
      const dataInicio = `${filtroMes}-01`;
      const dataFim = `${filtroMes}-${new Date(parseInt(ano), parseInt(mes), 0).getDate()}`;

      // Promise.all executa as buscas em paralelo (muito mais rápido)
      const [resLancamentos, resCat, resPay] = await Promise.all([
        supabase
          .from("lancamentos")
          .select("*")
          .eq("user_id", userId)
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim)
          .order("data_vencimento", { ascending: true }),
        !memoryCache.categorias
          ? supabase.from("categorias").select("*").order("nome")
          : Promise.resolve({ data: memoryCache.categorias }),
        !memoryCache.formasPagamento
          ? supabase.from("formas_pagamento").select("*").order("nome")
          : Promise.resolve({ data: memoryCache.formasPagamento }),
      ]);

      // Atualiza Lançamentos
      if (resLancamentos.data) {
        const dados = resLancamentos.data as unknown as Lancamento[];
        memoryCache.lancamentosPorMes[filtroMes] = dados;
        setLancamentos(dados);
      }

      // Atualiza Opções GLOBAIS
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
  }, [filtroMes, userId, toast]);

  // Dispara a busca sempre que o mês ou o usuário mudar
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- LÓGICA DE FILTRO ---
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

  // --- AÇÕES OTIMISTAS (Atualizam a UI e o Cache antes mesmo do banco responder) ---
  const handleSelectAll = () => {
    if (
      selectedIds.length === lancamentosFiltrados.length &&
      lancamentosFiltrados.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(lancamentosFiltrados.map((l) => l.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !confirm("Excluir itens selecionados?"))
      return;
    try {
      // 1. Otimista: remove da tela e do cache imediatamente
      const remaining = lancamentos.filter((l) => !selectedIds.includes(l.id));
      setLancamentos(remaining);
      memoryCache.lancamentosPorMes[filtroMes] = remaining;
      setSelectedIds([]);

      // 2. Banco
      await supabase
        .from("lancamentos")
        .delete()
        .in("id", selectedIds)
        .eq("user_id", userId);
      toast({ title: `${selectedIds.length} excluídos.` });
    } catch {
      fetchAllData(); // Se der erro, restaura
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      // 1. Otimista
      const remaining = lancamentos.filter((l) => l.id !== id);
      setLancamentos(remaining);
      memoryCache.lancamentosPorMes[filtroMes] = remaining;

      // 2. Banco
      await supabase
        .from("lancamentos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      toast({ title: "Excluído com sucesso" });
    } catch {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const togglePago = async (lancamento: Lancamento) => {
    try {
      const novoStatus = !lancamento.pago;

      // 1. Otimista
      const updated = lancamentos.map((l) =>
        l.id === lancamento.id ? { ...l, pago: novoStatus } : l,
      );
      setLancamentos(updated);
      memoryCache.lancamentosPorMes[filtroMes] = updated;

      // 2. Banco
      await supabase
        .from("lancamentos")
        .update({ pago: novoStatus })
        .eq("id", lancamento.id)
        .eq("user_id", userId);
    } catch {
      fetchAllData();
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  // --- MODAL ---
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
      {/* HEADER LIMPO E NÃO-FLUTUANTE (Fixado no topo mas sem bordas pesadas) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
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
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <LancamentoFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchAllData} // Atualiza a lista quando salvar
        lancamentoToEdit={lancamentoEditando}
        userId={userId}
        categoriasDB={categoriasDB}
        formasPagamentoDB={formasPagamentoDB}
      />

      {/* CONTROLES: SEARCH + FILTROS + SELECT ALL */}
      <div className="flex flex-col gap-4">
        {/* Barra de Busca Minimalista */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
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

        {/* Ações em Massa (Só aparece se tiver algo filtrado/selecionado) */}
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
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir (
              {selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* LISTA DE LANÇAMENTOS */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
          </div>
        ) : lancamentosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-2xl bg-accent/20">
            <Filter className="h-10 w-10 text-muted-foreground/30 mb-3" />
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
                Limpar todos os filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* O LancamentoItem renderiza cada linha. Assumindo que ele já é clean. */}
            {lancamentosFiltrados.map((lancamento) => (
              <LancamentoItem
                key={lancamento.id}
                lancamento={lancamento}
                isSelected={selectedIds.includes(lancamento.id)}
                onSelect={() => {
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
                onDelete={() => handleDelete(lancamento.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
