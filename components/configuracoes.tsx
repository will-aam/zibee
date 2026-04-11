"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TagIcon,
  CreditCardIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { InstallButton } from "@/components/ui/install-button";
import { ThemeToggleCard } from "@/components/config/ThemeToggleCard";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfiguracoesProps {
  onNavigate?: (tab: string) => void;
}

interface CategoriaItem {
  id: number;
  nome: string;
  regra_orcamento: string;
}

interface PagamentoItem {
  id: number;
  nome: string;
}

let cachedCategorias: CategoriaItem[] | null = null;
let cachedPagamentos: PagamentoItem[] | null = null;

export default function Configuracoes({ onNavigate }: ConfiguracoesProps) {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const [categorias, setCategorias] = useState<CategoriaItem[]>(
    cachedCategorias || [],
  );
  const [formasPagamento, setFormasPagamento] = useState<PagamentoItem[]>(
    cachedPagamentos || [],
  );
  const [isLoadingData, setIsLoadingData] = useState(
    !cachedCategorias || !cachedPagamentos,
  );

  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaRegra, setNovaRegra] = useState("50"); // Padrão: Necessidade
  const [novaForma, setNovaForma] = useState("");

  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [isAddingForma, setIsAddingForma] = useState(false);

  // ESTADOS DO MODAL DE EDIÇÃO DE CATEGORIA
  const [editingCategoria, setEditingCategoria] =
    useState<CategoriaItem | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editRegra, setEditRegra] = useState("50");
  const [isUpdatingCategoria, setIsUpdatingCategoria] = useState(false);
  const [isDeletingCategoria, setIsDeletingCategoria] = useState(false);

  const fetchData = useCallback(
    async (forceUpdate = false) => {
      if (!userId) return;

      if (!forceUpdate && cachedCategorias && cachedPagamentos) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      const [{ data: catData }, { data: payData }] = await Promise.all([
        supabase
          .from("categorias")
          .select("*")
          .eq("user_id", userId)
          .order("nome"),
        supabase.from("formas_pagamento").select("*").order("nome"),
      ]);

      if (catData) {
        cachedCategorias = catData as CategoriaItem[];
        setCategorias(catData as CategoriaItem[]);
      }
      if (payData) {
        cachedPagamentos = payData;
        setFormasPagamento(payData);
      }
      setIsLoadingData(false);
    },
    [userId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- FUNÇÕES DE ADIÇÃO ---
  const handleAddCategoria = async () => {
    if (!novaCategoria.trim() || !userId) return;

    setIsAddingCategoria(true);
    const { error } = await supabase.from("categorias").insert([
      {
        nome: novaCategoria.trim(),
        user_id: userId,
        regra_orcamento: novaRegra,
      },
    ]);

    if (error) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchData(true);
      setNovaCategoria("");
      setNovaRegra("50");
      toast({ title: "Categoria adicionada com sucesso!" });
    }
    setIsAddingCategoria(false);
  };

  const handleAddForma = async () => {
    if (!novaForma.trim()) return;

    setIsAddingForma(true);
    const { error } = await supabase
      .from("formas_pagamento")
      .insert([{ nome: novaForma.trim() }]);

    if (error) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchData(true);
      setNovaForma("");
      toast({ title: "Forma adicionada com sucesso!" });
    }
    setIsAddingForma(false);
  };

  // --- FUNÇÕES DE EDIÇÃO/EXCLUSÃO DE CATEGORIA ---
  const openEditModal = (categoria: CategoriaItem) => {
    setEditingCategoria(categoria);
    setEditNome(categoria.nome);
    setEditRegra(categoria.regra_orcamento);
  };

  const closeEditModal = () => {
    setEditingCategoria(null);
    setEditNome("");
    setEditRegra("50");
  };

  const handleUpdateCategoria = async () => {
    if (!editingCategoria || !editNome.trim()) return;

    setIsUpdatingCategoria(true);
    const { error } = await supabase
      .from("categorias")
      .update({ nome: editNome.trim(), regra_orcamento: editRegra })
      .eq("id", editingCategoria.id);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchData(true);
      toast({ title: "Categoria atualizada!" });
      closeEditModal();
    }
    setIsUpdatingCategoria(false);
  };

  const handleDeleteCategoria = async () => {
    if (!editingCategoria) return;

    setIsDeletingCategoria(true);
    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id", editingCategoria.id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchData(true);
      toast({ title: "Categoria removida!" });
      closeEditModal();
    }
    setIsDeletingCategoria(false);
  };

  // --- HELPERS DE UI ---
  const getRegraLabel = (regra: string) => {
    switch (regra) {
      case "50":
        return " • 50%";
      case "30":
        return " • 30%";
      case "20":
        return " • 20%";
      case "renda":
        return " • Entrada";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="p-4 space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-24">
        {/* CABEÇALHO */}
        <div className="pb-2 flex justify-between items-center border-b">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <InstallButton />
        </div>

        {/* CARDS DE AÇÕES RÁPIDAS */}
        <div className="grid grid-cols-2 gap-3">
          <ThemeToggleCard />
        </div>

        <div className="space-y-8 pt-2">
          {/* SESSÃO: CATEGORIAS */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <TagIcon className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight leading-none">
                  Minhas Categorias
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Classificadas para a Regra 50/30/20
                </p>
              </div>
            </div>

            {/* FORMULÁRIO EM CIMA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl">
              <Input
                placeholder="Nome da categoria..."
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                className="h-10 rounded-xl w-full sm:flex-1"
              />
              <Select value={novaRegra} onValueChange={setNovaRegra}>
                <SelectTrigger className="h-10 rounded-xl w-full sm:w-[220px]">
                  <SelectValue placeholder="Classificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Necessidade (50%)</SelectItem>
                  <SelectItem value="30">Desejo (30%)</SelectItem>
                  <SelectItem value="20">Poupança (20%)</SelectItem>
                  <SelectItem value="renda">Entrada</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={!novaCategoria.trim() || isAddingCategoria}
                onClick={handleAddCategoria}
                className="h-10 rounded-xl px-4 w-full sm:w-auto"
              >
                {isAddingCategoria ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </>
                )}
              </Button>
            </div>

            {/* LISTA DE TAGS EM BAIXO */}
            <div className="flex flex-wrap gap-2 pt-1">
              {isLoadingData && categorias.length === 0 ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma categoria criada ainda.
                </p>
              ) : (
                categorias.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openEditModal(c)}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/30 border border-border/50 text-sm text-foreground/90 select-none transition-colors hover:bg-muted/60 hover:border-primary/30 cursor-pointer group active:scale-95"
                    title="Clique para editar"
                  >
                    {c.nome}
                    <span className="ml-1.5 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:text-primary transition-colors">
                      {getRegraLabel(c.regra_orcamento)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <hr className="border-border/50" />

          {/* SESSÃO: FORMAS DE PAGAMENTO */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">
                Formas de Pagamento
              </h2>
            </div>

            {/* FORMULÁRIO EM CIMA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-sm">
              <Input
                placeholder="Nova forma de pagamento..."
                value={novaForma}
                onChange={(e) => setNovaForma(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddForma()}
                className="h-10 rounded-xl w-full"
              />
              <Button
                disabled={!novaForma.trim() || isAddingForma}
                onClick={handleAddForma}
                className="h-10 rounded-xl px-4 w-full sm:w-auto"
              >
                {isAddingForma ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* LISTA DE TAGS EM BAIXO */}
            <div className="flex flex-wrap gap-2 pt-1">
              {isLoadingData && formasPagamento.length === 0 ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : formasPagamento.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma forma de pagamento criada ainda.
                </p>
              ) : (
                formasPagamento.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/30 border border-border/50 text-sm text-foreground/90 select-none transition-colors hover:bg-muted/50"
                  >
                    {p.nome}
                  </span>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE CATEGORIA */}
      <Dialog
        open={!!editingCategoria}
        onOpenChange={(open) => !open && closeEditModal()}
      >
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Categoria</label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classificação</label>
              <Select value={editRegra} onValueChange={setEditRegra}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Necessidade (50%)</SelectItem>
                  <SelectItem value="30">Desejo (30%)</SelectItem>
                  <SelectItem value="20">Poupança (20%)</SelectItem>
                  <SelectItem value="renda">Entrada / Renda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={handleDeleteCategoria}
              disabled={isDeletingCategoria || isUpdatingCategoria}
            >
              {isDeletingCategoria ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
            <Button
              className="rounded-xl px-6"
              onClick={handleUpdateCategoria}
              disabled={
                !editNome.trim() || isUpdatingCategoria || isDeletingCategoria
              }
            >
              {isUpdatingCategoria ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
