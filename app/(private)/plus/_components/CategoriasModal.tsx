"use client";

import { useState, useEffect, useCallback } from "react";
import { TagIcon, PlusIcon, ArrowPathIcon, TrashIcon } from "@heroicons/react/24/solid";
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

interface CategoriaItem {
  id: number;
  nome: string;
  regra_orcamento: string;
}

let cachedCategorias: CategoriaItem[] | null = null;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CategoriasModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const [categorias, setCategorias] = useState<CategoriaItem[]>(
    cachedCategorias || []
  );
  const [isLoadingData, setIsLoadingData] = useState(!cachedCategorias);

  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaRegra, setNovaRegra] = useState("50");
  const [isAddingCategoria, setIsAddingCategoria] = useState(false);

  const [editingCategoria, setEditingCategoria] = useState<CategoriaItem | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editRegra, setEditRegra] = useState("50");
  const [isUpdatingCategoria, setIsUpdatingCategoria] = useState(false);
  const [isDeletingCategoria, setIsDeletingCategoria] = useState(false);

  const fetchData = useCallback(async (forceUpdate = false) => {
    if (!userId || (!forceUpdate && cachedCategorias)) {
      if (cachedCategorias) setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .eq("user_id", userId)
      .order("nome");

    if (data) {
      cachedCategorias = data as CategoriaItem[];
      setCategorias(data as CategoriaItem[]);
    }
    setIsLoadingData(false);
  }, [userId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleAddCategoria = async () => {
    if (!novaCategoria.trim() || !userId) return;
    setIsAddingCategoria(true);
    const { error } = await supabase
      .from("categorias")
      .insert([{ nome: novaCategoria.trim(), user_id: userId, regra_orcamento: novaRegra }]);

    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      await fetchData(true);
      setNovaCategoria("");
      setNovaRegra("50");
      toast({ title: "Categoria adicionada!" });
    }
    setIsAddingCategoria(false);
  };

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
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
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
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      await fetchData(true);
      toast({ title: "Categoria removida!" });
      closeEditModal();
    }
    setIsDeletingCategoria(false);
  };

  const getRegraLabel = (regra: string) => {
    switch (regra) {
      case "50": return " • 50%";
      case "30": return " • 30%";
      case "20": return " • 20%";
      case "renda": return " • Entrada";
      default: return "";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-3xl z-[90] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <TagIcon className="h-5 w-5 text-primary" />
              </div>
              Categorias
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-5">
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Nova categoria..."
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                className="h-12 rounded-xl"
              />
              <div className="flex gap-3">
                <Select value={novaRegra} onValueChange={setNovaRegra}>
                  <SelectTrigger className="h-12 rounded-xl flex-1">
                    <SelectValue placeholder="Classificação" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="50">Necessidade (50%)</SelectItem>
                    <SelectItem value="30">Desejo (30%)</SelectItem>
                    <SelectItem value="20">Poupança (20%)</SelectItem>
                    <SelectItem value="renda">Entrada / Renda</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  disabled={!novaCategoria.trim() || isAddingCategoria}
                  onClick={handleAddCategoria}
                  className="h-12 rounded-xl px-4 w-auto font-semibold"
                >
                  {isAddingCategoria ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <PlusIcon className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {isLoadingData && categorias.length === 0 ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              ) : categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground w-full text-center">Nenhuma categoria criada.</p>
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCategoria} onOpenChange={(o) => !o && closeEditModal()}>
        <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-3xl z-[100]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Categoria</label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classificação</label>
              <Select value={editRegra} onValueChange={setEditRegra}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
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
              {isDeletingCategoria ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><TrashIcon className="h-5 w-5 mr-2" /> Excluir</>}
            </Button>
            <Button
              className="w-full sm:w-auto rounded-xl px-6 h-12 font-semibold"
              onClick={handleUpdateCategoria}
              disabled={!editNome.trim() || isUpdatingCategoria || isDeletingCategoria}
            >
              {isUpdatingCategoria && <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
