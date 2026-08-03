"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MonthTurnoverModal } from "@/app/(private)/dashboard/_components/MonthTurnoverModal";
import { TrophyIcon, CalendarIcon, ArrowRightIcon } from "@heroicons/react/24/solid";

interface Fechamento {
  id: string;
  mes_ano: string;
  saldo_calculado: number;
  nomeMes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FechamentosListModal({ open, onClose }: Props) {
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const [fechamentos, setFechamentos] = React.useState<Fechamento[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedMesAno, setSelectedMesAno] = React.useState<string | null>(null);

  const fetchFechamentos = React.useCallback(async () => {
    if (!userId || !open) return;
    setIsLoading(true);

    try {
      // Fetch all resolved fechamentos
      const { data: fechamentosData, error: fError } = await supabase
        .from("fechamentos_mes")
        .select("*")
        .eq("user_id", userId)
        .eq("resolvido", true);

      if (fError) throw fError;

      // Fetch all system adjustment transactions to see which ones were processed
      const { data: lancamentosData, error: lError } = await supabase
        .from("lancamentos")
        .select("descricao")
        .eq("user_id", userId)
        .eq("forma_pagamento", "Ajuste do Sistema");

      if (lError) throw lError;

      const processedDescriptions = new Set(
        lancamentosData?.map((l) => l.descricao.toLowerCase()) || []
      );

      const ignoredFechamentos = (fechamentosData || [])
        .map((f) => {
          const [y, m] = f.mes_ano.split("-");
          const date = new Date(Number(y), Number(m) - 1, 1);
          const nomeMes = format(date, "MMMM", { locale: ptBR });
          return {
            ...f,
            nomeMes,
          };
        })
        .filter((f) => {
          // If a transaction exists like "saldo positivo de julho" or "déficit de julho", it was processed.
          const nomeMesLower = f.nomeMes.toLowerCase();
          const hasTransaction = Array.from(processedDescriptions).some(
            (desc) => desc.includes(`de ${nomeMesLower}`)
          );
          return !hasTransaction;
        })
        .sort((a, b) => b.mes_ano.localeCompare(a.mes_ano));

      setFechamentos(ignoredFechamentos);
    } catch (error) {
      console.error("Erro ao buscar fechamentos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, open]);

  React.useEffect(() => {
    fetchFechamentos();
  }, [fetchFechamentos]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl z-[90]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <TrophyIcon className="h-6 w-6 text-primary" />
              Revisar Fechamentos
            </DialogTitle>
            <DialogDescription className="pt-2">
              Abaixo estão os meses em que você não somou o saldo ou optou por não ver o aviso. Selecione para decidir o que fazer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 min-h-[150px]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="text-sm text-muted-foreground animate-pulse">Carregando...</span>
              </div>
            ) : fechamentos.length === 0 ? (
              <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed">
                <CalendarIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhum fechamento pendente de decisão.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fechamentos.map((f) => (
                  <Button
                    key={f.id}
                    variant="outline"
                    className="w-full justify-between h-14 rounded-2xl px-4 hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedMesAno(f.mes_ano)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.saldo_calculado >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex flex-col">
                        <span className="font-bold capitalize">{f.nomeMes} {f.mes_ano.split("-")[0]}</span>
                        <span className="text-xs text-muted-foreground">
                          Saldo: {Math.abs(f.saldo_calculado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                    </div>
                    <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Renders MonthTurnoverModal dynamically if a month is selected */}
      {selectedMesAno && (
        <MonthTurnoverModal
          forcedMesAno={selectedMesAno}
          onClose={() => {
            setSelectedMesAno(null);
            fetchFechamentos(); // refresh list
          }}
        />
      )}
    </>
  );
}
