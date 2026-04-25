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

// Tipagens
interface CategoriaItem {
  id: number;
  nome: string;
  regra_orcamento: string;
}

interface PagamentoItem {
  id: number;
  nome: string;
}

// OTIMIZAÇÃO: Cache mantido fora do componente para não recarregar os dados à toa
let cachedCategorias: CategoriaItem[] | null = null;
let cachedPagamentos: PagamentoItem[] | null = null;

export default function System() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  // Estados de Listagem
  const [categorias, setCategorias] = useState<CategoriaItem[]>(
    cachedCategorias || [],
  );
  const [formasPagamento, setFormasPagamento] = useState<PagamentoItem[]>(
    cachedPagamentos || [],
  );
  const [isLoadingData, setIsLoadingData] = useState(
    !cachedCategorias || !cachedPagamentos,
  );

  // Estados de Criação
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaRegra, setNovaRegra] = useState("50");
  const [novaForma, setNovaForma] = useState("");
  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [isAddingForma, setIsAddingForma] = useState(false);

  // Estados do Modal de Edição de Categoria
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
    const { error } = await supabase
      .from("categorias")
      .insert([
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
      toast({ title: "Categoria adicionada!" });
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
      toast({ title: "Forma de pagamento adicionada!" });
    }
    setIsAddingForma(false);
  };

  // --- FUNÇÕES DO MODAL ---
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
    <div className="animate-in fade-in duration-300 flex flex-col">
      {/* SESSÃO: CATEGORIAS */}
      <section className="px-5 py-6 border-b border-border/30 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <TagIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Categorias
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Organizadas pela Regra 50/30/20
            </p>
          </div>
        </div>

        {/* FORMULÁRIO RESPONSIVO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Input
            placeholder="Nova categoria..."
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            className="h-12 rounded-xl w-full sm:flex-1"
          />
          <Select value={novaRegra} onValueChange={setNovaRegra}>
            <SelectTrigger className="h-12 rounded-xl w-full sm:w-[220px]">
              <SelectValue placeholder="Classificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">Necessidade (50%)</SelectItem>
              <SelectItem value="30">Desejo (30%)</SelectItem>
              <SelectItem value="20">Poupança (20%)</SelectItem>
              <SelectItem value="renda">Entrada / Renda</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={!novaCategoria.trim() || isAddingCategoria}
            onClick={handleAddCategoria}
            className="h-12 rounded-xl px-6 w-full sm:w-auto font-semibold"
          >
            {isAddingCategoria ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <PlusIcon className="h-5 w-5 sm:mr-1.5" />
                <span className="hidden sm:inline">Adicionar</span>
              </>
            )}
          </Button>
        </div>

        {/* LISTA DE TAGS */}
        <div className="flex flex-wrap gap-2 pt-2">
          {isLoadingData && categorias.length === 0 ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria criada.
            </p>
          ) : (
            categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => openEditModal(c)}
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground/90 select-none transition-all hover:bg-muted/80 hover:border-primary/30 cursor-pointer group active:scale-95 shadow-sm"
                title="Clique para editar"
              >
                {c.nome}
                <span className="ml-1.5 text-[11px] font-bold text-blue-500/80 dark:text-blue-400/80 group-hover:text-primary transition-colors uppercase">
                  {getRegraLabel(c.regra_orcamento)}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* SESSÃO: FORMAS DE PAGAMENTO */}
      <section className="px-5 py-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <CreditCardIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Pagamentos
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Suas formas de pagamento
            </p>
          </div>
        </div>

        {/* FORMULÁRIO RESPONSIVO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Input
            placeholder="Nova forma (Ex: Pix, Cartão, Dinheiro)..."
            value={novaForma}
            onChange={(e) => setNovaForma(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddForma()}
            className="h-12 rounded-xl w-full sm:flex-1"
          />
          <Button
            disabled={!novaForma.trim() || isAddingForma}
            onClick={handleAddForma}
            className="h-12 rounded-xl px-6 w-full sm:w-auto font-semibold"
          >
            {isAddingForma ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <PlusIcon className="h-5 w-5 mr-1.5" /> Adicionar
              </>
            )}
          </Button>
        </div>

        {/* LISTA DE TAGS */}
        <div className="flex flex-wrap gap-2 pt-2">
          {isLoadingData && formasPagamento.length === 0 ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : formasPagamento.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma forma criada.
            </p>
          ) : (
            formasPagamento.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-muted/40 border border-border/50 text-sm font-medium text-foreground/90 select-none shadow-sm"
              >
                {p.nome}
              </span>
            ))
          )}
        </div>
      </section>

      {/* MODAL DE EDIÇÃO DE CATEGORIA (Mantido funcional e alinhado ao novo design) */}
      <Dialog
        open={!!editingCategoria}
        onOpenChange={(open) => !open && closeEditModal()}
      >
        <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Categoria</label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classificação</label>
              <Select value={editRegra} onValueChange={setEditRegra}>
                <SelectTrigger className="h-12 rounded-xl">
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

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 mt-2 pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-12 font-semibold"
              onClick={handleDeleteCategoria}
              disabled={isDeletingCategoria || isUpdatingCategoria}
            >
              {isDeletingCategoria ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <TrashIcon className="h-5 w-5 mr-2" /> Excluir
                </>
              )}
            </Button>
            <Button
              className="w-full sm:w-auto rounded-xl px-6 h-12 font-semibold"
              onClick={handleUpdateCategoria}
              disabled={
                !editNome.trim() || isUpdatingCategoria || isDeletingCategoria
              }
            >
              {isUpdatingCategoria && (
                <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
