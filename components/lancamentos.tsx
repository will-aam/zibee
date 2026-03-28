// components/lancamentos.tsx
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import type { Lancamento } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
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
import { LancamentoFormDialog } from "./lancamentos/LancamentoFormDialog"; // <--- NOVO FORMULÁRIO COMPONENTIZADO

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const session = authClient.useSession();
  const userId = session.data?.user.id;

  // Controle do Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] =
    useState<Lancamento | null>(null);

  // Seleção e Opções
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<
    { id: number; nome: string }[]
  >([]);
  const [formasPagamentoDB, setFormasPagamentoDB] = useState<
    { id: number; nome: string }[]
  >([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [filtrosCategoria, setFiltrosCategoria] = useState<string[]>([]);
  const [filtrosPagamento, setFiltrosPagamento] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  // Data
  const [date, setDate] = useState<Date>(new Date());
  const [filtroMes, setFiltroMes] = useState(
    new Date().toISOString().slice(0, 7),
  );

  useEffect(() => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, "0");
      setFiltroMes(`${ano}-${mes}`);
    }
  }, [date]);

  const fetchOpcoes = useCallback(async () => {
    try {
      const { data: cat } = await supabase
        .from("categorias")
        .select("*")
        .order("nome");
      if (cat) setCategoriasDB(cat);

      const { data: pay } = await supabase
        .from("formas_pagamento")
        .select("*")
        .order("nome");
      if (pay) setFormasPagamentoDB(pay);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchLancamentos = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setSelectedIds([]);
      const [ano, mes] = filtroMes.split("-");
      const dataInicio = `${filtroMes}-01`;
      const dataFim = `${filtroMes}-${new Date(parseInt(ano), parseInt(mes), 0).getDate()}`;

      const { data, error } = await supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .gte("data_vencimento", dataInicio)
        .lte("data_vencimento", dataFim)
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      setLancamentos(data as unknown as Lancamento[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filtroMes, toast, userId]);

  useEffect(() => {
    if (userId) {
      fetchLancamentos();
      fetchOpcoes();
    }
  }, [fetchLancamentos, fetchOpcoes, userId]);

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

  // --- AÇÕES DE LISTA ---
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
      await supabase
        .from("lancamentos")
        .delete()
        .in("id", selectedIds)
        .eq("user_id", userId);
      toast({ title: `${selectedIds.length} excluídos.` });
      setLancamentos((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await supabase
        .from("lancamentos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      setLancamentos((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Excluído com sucesso" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const togglePago = async (lancamento: Lancamento) => {
    try {
      const novoStatus = !lancamento.pago;
      setLancamentos((prev) =>
        prev.map((l) =>
          l.id === lancamento.id ? { ...l, pago: novoStatus } : l,
        ),
      );
      await supabase
        .from("lancamentos")
        .update({ pago: novoStatus })
        .eq("id", lancamento.id)
        .eq("user_id", userId);
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  // Funções para abrir o Modal
  const handleNovoLancamento = () => {
    setLancamentoEditando(null); // Reseta para criar novo
    setIsDialogOpen(true);
  };

  const handleEdit = (lancamento: Lancamento) => {
    setLancamentoEditando(lancamento); // Passa os dados para o modal
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto pb-24 overflow-x-hidden w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-10 bg-background/95 backdrop-blur-md py-2 -mx-4 px-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MonthSelector date={date} setDate={setDate} />

          <Button
            onClick={handleNovoLancamento}
            size="icon"
            className="shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* FORMULÁRIO COMPONENTIZADO */}
      <LancamentoFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchLancamentos}
        lancamentoToEdit={lancamentoEditando}
        userId={userId}
        categoriasDB={categoriasDB}
        formasPagamentoDB={formasPagamentoDB}
      />

      {/* CONTROLES: SELECT ALL + SEARCH + FILTROS */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={
                lancamentosFiltrados.length > 0 &&
                selectedIds.length === lancamentosFiltrados.length
              }
              onCheckedChange={handleSelectAll}
            />
            <Label
              htmlFor="select-all"
              className="cursor-pointer font-medium text-sm"
            >
              Selecionar Todos
            </Label>
          </div>
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8"
            >
              <Trash2 className="h-3 w-3 mr-2" /> Excluir ({selectedIds.length})
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lançamentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30"
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
      </div>

      {/* LISTA DE LANÇAMENTOS */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : lancamentosFiltrados.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">
                Nenhum lançamento encontrado.
              </p>
              {(filtrosTipo.length > 0 ||
                filtrosCategoria.length > 0 ||
                searchQuery) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery("");
                    setFiltrosTipo([]);
                    setFiltrosCategoria([]);
                    setFiltrosPagamento([]);
                    setFiltroStatus(null);
                  }}
                >
                  Limpar tudo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          lancamentosFiltrados.map((lancamento) => (
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
          ))
        )}
      </div>
    </div>
  );
}
