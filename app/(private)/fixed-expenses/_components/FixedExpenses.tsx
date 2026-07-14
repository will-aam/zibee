// app/(private)/fixed-expenses/_components/FixedExpenses.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";
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

import { SummaryCard } from "./SummaryCard";
import { ExpenseCard } from "./ExpenseCard";
import {
  EditFixedExpenseDialog,
  type DespesaFixa,
} from "./EditFixedExpenseDialog";

export interface ItemOpcao {
  id: number;
  nome: string;
}

const fixasCache = {
  userId: null as string | null,
  context: null as string | null,
  despesas: null as DespesaFixa[] | null,
  categorias: null as ItemOpcao[] | null,
  pagamentos: null as ItemOpcao[] | null,
};

function formatMoney(val: number) {
  return (val ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DespesasFixas() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  // ADICIONE ESTES CONSOLE.LOG AQUI:
  console.log("--- DEBUG TYPE OF COMPONENTS ---");
  console.log("SummaryCard:", typeof SummaryCard);
  console.log("ExpenseCard:", typeof ExpenseCard);
  console.log("EditFixedExpenseDialog:", typeof EditFixedExpenseDialog);
  console.log("AlertDialog:", typeof AlertDialog);
  console.log("Button:", typeof Button);
  console.log("ArrowPathIcon:", typeof ArrowPathIcon);
  console.log("--------------------------------");

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [modoQuinzenal, setModoQuinzenal] = useState(false);

  const isCacheValid =
    fixasCache.userId === userId && fixasCache.context === activeContext;

  const [despesas, setDespesas] = useState<DespesaFixa[]>(
    isCacheValid && fixasCache.despesas ? fixasCache.despesas : [],
  );

  const [categoriasDB, setCategoriasDB] = useState<ItemOpcao[]>(
    isCacheValid && fixasCache.categorias ? fixasCache.categorias : [],
  );
  const [formasPagamentoDB, setFormasPagamentoDB] = useState<ItemOpcao[]>(
    isCacheValid && fixasCache.pagamentos ? fixasCache.pagamentos : [],
  );

  const [loading, setLoading] = useState(
    !(isCacheValid && fixasCache.despesas),
  );

  const [editingExpense, setEditingExpense] = useState<DespesaFixa | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<DespesaFixa | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const openDeleteDialog = (d: DespesaFixa) => {
    setExpenseToDelete(d);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setExpenseToDelete(null);
  };

  const fetchData = useCallback(
    async (force = false) => {
      if (!userId) return;

      if (
        fixasCache.userId !== userId ||
        fixasCache.context !== activeContext
      ) {
        fixasCache.userId = userId;
        fixasCache.context = activeContext;
        fixasCache.despesas = null;
        if (!force) {
          setDespesas([]);
        }
      }

      if (!force && fixasCache.despesas) setLoading(false);
      else setLoading(true);

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

        const needOptions =
          force || !fixasCache.categorias || !fixasCache.pagamentos;

        let queryFixas = supabase
          .from("despesas_fixas")
          .select("*")
          .order("dia_vencimento", { ascending: true });

        if (activeContext === "grupo" && groupId) {
          queryFixas = queryFixas.eq("grupo_id", groupId);
        } else {
          queryFixas = queryFixas.eq("user_id", userId).is("grupo_id", null);
        }

        const queries: any[] = [
          queryFixas,
          needOptions
            ? supabase.from("categorias").select("*").order("nome")
            : Promise.resolve({ data: fixasCache.categorias }),
          needOptions
            ? supabase.from("formas_pagamento").select("*").order("nome")
            : Promise.resolve({ data: fixasCache.pagamentos }),
        ];

        const [resFixas, resCat, resPay] = await Promise.all(queries);

        if (resFixas?.data) {
          setDespesas(resFixas.data);
          fixasCache.despesas = resFixas.data;
        }

        if (resCat?.data) {
          setCategoriasDB(resCat.data);
          fixasCache.categorias = resCat.data;
        }
        if (resPay?.data) {
          setFormasPagamentoDB(resPay.data);
          fixasCache.pagamentos = resPay.data;
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, activeContext, currentGroupId],
  );

  useEffect(() => {
    if (userId) fetchData(false);
  }, [userId, activeContext, fetchData]);

  const totalComprometido = useMemo(
    () => despesas.reduce((acc, curr) => acc + Number(curr.valor), 0),
    [despesas],
  );
  const totalPrimeiraQuinzena = useMemo(
    () =>
      despesas
        .filter((d) => d.dia_vencimento <= 14)
        .reduce((acc, curr) => acc + Number(curr.valor), 0),
    [despesas],
  );
  const totalSegundaQuinzena = useMemo(
    () =>
      despesas
        .filter((d) => d.dia_vencimento >= 15)
        .reduce((acc, curr) => acc + Number(curr.valor), 0),
    [despesas],
  );

  const confirmDelete = async () => {
    if (!userId || !expenseToDelete) return;

    setDeleting(true);
    const id = expenseToDelete.id;
    const prev = despesas;
    const next = prev.filter((d) => d.id !== id);

    setDespesas(next);
    fixasCache.despesas = next;

    try {
      let query = supabase.from("despesas_fixas").delete().eq("id", id);

      if (activeContext === "grupo" && currentGroupId) {
        query = query.eq("grupo_id", currentGroupId);
      } else {
        query = query.eq("user_id", userId).is("grupo_id", null);
      }

      const { error } = await query;
      if (error) throw error;
      toast({ title: "Removido com sucesso" });
      setDeleteOpen(false);
      setExpenseToDelete(null);
    } catch (err: any) {
      setDespesas(prev);
      fixasCache.despesas = prev;
      toast({
        title: "Erro ao remover",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExpenseSaved = (updated: DespesaFixa) => {
    setDespesas((prev) => {
      const next = prev
        .map((d) => (d.id === updated.id ? updated : d))
        .slice()
        .sort((a, b) => a.dia_vencimento - b.dia_vencimento);
      fixasCache.despesas = next;
      return next;
    });

    toast({
      title: "Atualizado",
      description: "Alterações aplicadas na lista.",
    });
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in p-4 sm:p-8">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            className="gap-2 shrink-0 rounded-xl"
          >
            <ArrowPathIcon className="h-4 w-4" /> Atualizar
          </Button>
        </div>

        <SummaryCard
          totalComprometido={totalComprometido}
          totalPrimeiraQuinzena={totalPrimeiraQuinzena}
          totalSegundaQuinzena={totalSegundaQuinzena}
          modoQuinzenal={modoQuinzenal}
          setModoQuinzenal={setModoQuinzenal}
          formatMoney={formatMoney}
        />

        {loading && despesas.length === 0 ? (
          <div className="flex justify-center py-10">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/70" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2 w-full">
            {despesas.map((despesa) => (
              <ExpenseCard
                key={despesa.id}
                despesa={despesa}
                onEdit={(d: DespesaFixa) => {
                  setEditingExpense(d);
                  setIsEditDialogOpen(true);
                }}
                onDelete={openDeleteDialog}
                formatMoney={formatMoney}
              />
            ))}

            {despesas.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-3xl bg-card/50">
                <p className="text-muted-foreground font-medium mb-1">
                  Nenhuma conta fixa cadastrada.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Adicione contas fixas pelo botão "+" no topo da tela.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <EditFixedExpenseDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        expense={editingExpense}
        onSaved={handleExpenseSaved}
        categorias={categoriasDB}
        formasPagamento={formasPagamentoDB}
        activeContext={activeContext}
        groupId={currentGroupId}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) =>
          open ? setDeleteOpen(true) : closeDeleteDialog()
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {expenseToDelete
                ? `Você tem certeza que deseja remover "${expenseToDelete.descricao || expenseToDelete.nome}" do seu planejamento? Lançamentos passados não serão alterados.`
                : "Você tem certeza?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />{" "}
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
