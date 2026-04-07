//componentes/Configurações.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TagIcon,
  CreditCardIcon,
  CalendarIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "@/lib/supabase";
import { InstallButton } from "@/components/ui/install-button";
import { QuickActionCard } from "@/components/config/QuickActionCard";
import { ThemeToggleCard } from "@/components/config/ThemeToggleCard";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ConfiguracoesProps {
  onNavigate?: (tab: string) => void;
}

interface ListItem {
  id: number;
  nome: string;
}

let cachedCategorias: ListItem[] | null = null;
let cachedPagamentos: ListItem[] | null = null;

export default function Configuracoes({ onNavigate }: ConfiguracoesProps) {
  const { toast } = useToast();

  const [categorias, setCategorias] = useState<ListItem[]>(
    cachedCategorias || [],
  );
  const [formasPagamento, setFormasPagamento] = useState<ListItem[]>(
    cachedPagamentos || [],
  );
  const [isLoadingData, setIsLoadingData] = useState(
    !cachedCategorias || !cachedPagamentos,
  );

  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaForma, setNovaForma] = useState("");

  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [isAddingForma, setIsAddingForma] = useState(false);

  const fetchData = useCallback(async (forceUpdate = false) => {
    if (!forceUpdate && cachedCategorias && cachedPagamentos) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const [{ data: catData }, { data: payData }] = await Promise.all([
      supabase.from("categorias").select("*").order("nome"),
      supabase.from("formas_pagamento").select("*").order("nome"),
    ]);

    if (catData) {
      cachedCategorias = catData;
      setCategorias(catData);
    }
    if (payData) {
      cachedPagamentos = payData;
      setFormasPagamento(payData);
    }
    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (
    table: "categorias" | "formas_pagamento",
    nome: string,
    setLoadingState: React.Dispatch<React.SetStateAction<boolean>>,
    clearInput: () => void,
  ) => {
    if (!nome.trim()) return;

    setLoadingState(true);
    const { error } = await supabase
      .from(table)
      .insert([{ nome: nome.trim() }]);

    if (error) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
      setLoadingState(false);
      throw error;
    }

    await fetchData(true);
    clearInput();
    setLoadingState(false);
    toast({ title: "Adicionado com sucesso!" });
  };

  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      {/* CABEÇALHO */}
      <div className="pb-2 flex justify-between items-center border-b">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <InstallButton />
      </div>

      {/* CARDS DE AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-2 gap-3">
        <ThemeToggleCard />
        <QuickActionCard
          icon={CalendarIcon}
          label="Despesas Fixas"
          onClick={() => onNavigate && onNavigate("despesas_fixas")}
        />
      </div>

      {/* ÁREA LIMPA SEM CARDS: CATEGORIAS E PAGAMENTOS */}
      <div className="space-y-8 pt-2">
        {/* SESSÃO: CATEGORIAS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <TagIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Categorias (Global)
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {isLoadingData && categorias.length === 0 ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              categorias.map((c) => (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-medium hover:bg-secondary cursor-default select-none"
                >
                  {c.nome}
                </Badge>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <Input
              placeholder="Nova categoria global..."
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleAdd(
                  "categorias",
                  novaCategoria,
                  setIsAddingCategoria,
                  () => setNovaCategoria(""),
                )
              }
              className="h-10 rounded-xl"
            />
            <Button
              disabled={!novaCategoria.trim() || isAddingCategoria}
              onClick={() =>
                handleAdd(
                  "categorias",
                  novaCategoria,
                  setIsAddingCategoria,
                  () => setNovaCategoria(""),
                )
              }
              className="h-10 rounded-xl px-4"
            >
              {isAddingCategoria ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </section>

        <hr className="border-border/50" />

        {/* SESSÃO: FORMAS DE PAGAMENTO */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <CreditCardIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Formas de Pagamento (Global)
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {isLoadingData && formasPagamento.length === 0 ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              formasPagamento.map((p) => (
                <Badge
                  key={p.id}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-medium hover:bg-secondary cursor-default select-none"
                >
                  {p.nome}
                </Badge>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <Input
              placeholder="Nova forma de pagamento..."
              value={novaForma}
              onChange={(e) => setNovaForma(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleAdd("formas_pagamento", novaForma, setIsAddingForma, () =>
                  setNovaForma(""),
                )
              }
              className="h-10 rounded-xl"
            />
            <Button
              disabled={!novaForma.trim() || isAddingForma}
              onClick={() =>
                handleAdd("formas_pagamento", novaForma, setIsAddingForma, () =>
                  setNovaForma(""),
                )
              }
              className="h-10 rounded-xl px-4"
            >
              {isAddingForma ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
