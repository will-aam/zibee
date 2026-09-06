"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCardIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PagamentoItem {
  id: number;
  nome: string;
}

let cachedPagamentos: PagamentoItem[] | null = null;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PagamentosModal({ open, onClose }: Props) {
  const { toast } = useToast();

  const [formasPagamento, setFormasPagamento] = useState<PagamentoItem[]>(
    cachedPagamentos || []
  );
  const [isLoadingData, setIsLoadingData] = useState(!cachedPagamentos);
  const [novaForma, setNovaForma] = useState("");
  const [isAddingForma, setIsAddingForma] = useState(false);

  const fetchData = useCallback(async (forceUpdate = false) => {
    if (!forceUpdate && cachedPagamentos) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    const { data } = await supabase.from("formas_pagamento").select("*").order("nome");

    if (data) {
      cachedPagamentos = data;
      setFormasPagamento(data);
    }
    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleAddForma = async () => {
    if (!novaForma.trim()) return;
    setIsAddingForma(true);
    const { error } = await supabase
      .from("formas_pagamento")
      .insert([{ nome: novaForma.trim() }]);

    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      await fetchData(true);
      setNovaForma("");
      toast({ title: "Forma de pagamento adicionada!" });
      window.dispatchEvent(new Event("zibee:payment-methods-changed"));
    }
    setIsAddingForma(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-3xl z-[90]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <CreditCardIcon className="h-5 w-5 text-primary" />
            </div>
            Formas de Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-5">
          <div className="flex gap-3">
            <Input
              placeholder="Ex: Pix, Cartão, Dinheiro..."
              value={novaForma}
              onChange={(e) => setNovaForma(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddForma()}
              className="h-12 rounded-xl flex-1"
            />
            <Button
              disabled={!novaForma.trim() || isAddingForma}
              onClick={handleAddForma}
              className="h-12 rounded-xl px-4 w-auto font-semibold"
            >
              {isAddingForma ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {isLoadingData && formasPagamento.length === 0 ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
            ) : formasPagamento.length === 0 ? (
              <p className="text-sm text-muted-foreground w-full text-center">Nenhuma forma criada.</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
