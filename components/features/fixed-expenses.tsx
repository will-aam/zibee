"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
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

// Importando os componentes filhos
import { SummaryCard } from "./fixed-expenses/SummaryCard";
import { ExpenseCard } from "./fixed-expenses/ExpenseCard";
import { AddExpenseForm } from "./fixed-expenses/AddExpenseForm";
import {
  EditFixedExpenseDialog,
  type DespesaFixa,
} from "./fixed-expenses/EditFixedExpenseDialog";

export interface ItemOpcao {
  id: number;
  nome: string;
}

const fixasCache = {
  userId: null as string | null,
  despesas: null as DespesaFixa[] | null,
  categorias: null as ItemOpcao[] | null,
  pagamentos: null as ItemOpcao[] | null,
  nomesLancadosMesKey: "" as string,
  nomesLancadosEsteMes: null as string[] | null,
};

function formatMoney(val: number) {
  return (val ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(d: Date) {
  const y = d.getFullYear();
  const mIndex = d.getMonth();
  const m = String(mIndex + 1).padStart(2, "0");
  const start = `${y}-${m}-01`;
  const lastDay = new Date(y, mIndex + 1, 0).getDate();
  const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export default function DespesasFixas() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const [modoQuinzenal, setModoQuinzenal] = useState(false);

  const [despesas, setDespesas] = useState<DespesaFixa[]>(
    fixasCache.userId === userId && fixasCache.despesas
      ? fixasCache.despesas
      : [],
  );

  const hojeKey = useMemo(() => monthKey(new Date()), []);
  const [nomesLancadosEsteMes, setNomesLancadosEsteMes] = useState<string[]>(
    fixasCache.userId === userId &&
      fixasCache.nomesLancadosEsteMes &&
      fixasCache.nomesLancadosMesKey === hojeKey
      ? fixasCache.nomesLancadosEsteMes
      : [],
  );

  const [categoriasDB, setCategoriasDB] = useState<ItemOpcao[]>(
    fixasCache.userId === userId && fixasCache.categorias
      ? fixasCache.categorias
      : [],
  );
  const [formasPagamentoDB, setFormasPagamentoDB] = useState<ItemOpcao[]>(
    fixasCache.userId === userId && fixasCache.pagamentos
      ? fixasCache.pagamentos
      : [],
  );

  const [loading, setLoading] = useState(
    !(fixasCache.userId === userId && fixasCache.despesas),
  );
  const [loadingId, setLoadingId] = useState<number | null>(null);

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

      if (fixasCache.userId && fixasCache.userId !== userId) {
        fixasCache.userId = userId;
        fixasCache.despesas = null;
        fixasCache.categorias = null;
        fixasCache.pagamentos = null;
        fixasCache.nomesLancadosEsteMes = null;
        fixasCache.nomesLancadosMesKey = "";
      }
      fixasCache.userId = userId;

      if (!force && fixasCache.despesas) setLoading(false);
      else setLoading(true);

      try {
        const { start, end } = monthRange(new Date());
        const thisKey = monthKey(new Date());

        const needOptions =
          force || !fixasCache.categorias || !fixasCache.pagamentos;
        const needLancados =
          force ||
          !fixasCache.nomesLancadosEsteMes ||
          fixasCache.nomesLancadosMesKey !== thisKey;

        const queries: any[] = [
          supabase
            .from("despesas_fixas")
            .select("*")
            .eq("user_id", userId)
            .order("dia_vencimento", { ascending: true }),
          needLancados
            ? supabase
                .from("lancamentos")
                .select("descricao")
                .eq("user_id", userId)
                .gte("data_vencimento", start)
                .lte("data_vencimento", end)
            : Promise.resolve({ data: fixasCache.nomesLancadosEsteMes }),
          needOptions
            ? supabase.from("categorias").select("*").order("nome")
            : Promise.resolve({ data: fixasCache.categorias }),
          needOptions
            ? supabase.from("formas_pagamento").select("*").order("nome")
            : Promise.resolve({ data: fixasCache.pagamentos }),
        ];

        const [resFixas, resLancados, resCat, resPay] =
          await Promise.all(queries);

        if (resFixas?.data) {
          setDespesas(resFixas.data);
          fixasCache.despesas = resFixas.data;
        }

        if (resLancados?.data) {
          const nomes = (resLancados.data as any[]).map((l) => l.descricao);
          setNomesLancadosEsteMes(nomes);
          fixasCache.nomesLancadosEsteMes = nomes;
          fixasCache.nomesLancadosMesKey = thisKey;
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
    [userId],
  );

  useEffect(() => {
    if (userId) fetchData(false);
  }, [userId, fetchData]);

  const totalComprometido = useMemo(
    () => despesas.reduce((acc, curr) => acc + Number(curr.valor), 0),
    [despesas],
  );
  const totalPagamentoDia05 = useMemo(
    () =>
      despesas
        .filter((d) => d.dia_vencimento <= 10)
        .reduce((acc, curr) => acc + Number(curr.valor), 0),
    [despesas],
  );
  const totalPagamentoDia15 = useMemo(
    () =>
      despesas
        .filter((d) => d.dia_vencimento > 10)
        .reduce((acc, curr) => acc + Number(curr.valor), 0),
    [despesas],
  );

  const handleAdicionar = async (
    data: Omit<DespesaFixa, "id" | "user_id" | "created_at">,
  ) => {
    if (!userId) return;
    try {
      const payload = { ...data, user_id: userId };
      const { error } = await supabase.from("despesas_fixas").insert([payload]);

      if (error) throw error;

      toast({ title: "Despesa fixa adicionada!" });
      await fetchData(true);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!userId || !expenseToDelete) return;

    setDeleting(true);
    const id = expenseToDelete.id;
    const prev = despesas;
    const next = prev.filter((d) => d.id !== id);

    setDespesas(next);
    fixasCache.despesas = next;

    try {
      const { error } = await supabase
        .from("despesas_fixas")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
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

  const handleLancarAgora = async (despesa: DespesaFixa) => {
    if (!userId || nomesLancadosEsteMes.includes(despesa.nome)) return;
    setLoadingId(despesa.id);

    try {
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth();
      const dataVencimento = new Date(
        anoAtual,
        mesAtual,
        despesa.dia_vencimento,
      );

      if (dataVencimento.getMonth() !== mesAtual) {
        dataVencimento.setDate(new Date(anoAtual, mesAtual + 1, 0).getDate());
      }

      const dataFormatada = dataVencimento.toISOString().split("T")[0];

      const { error } = await supabase.from("lancamentos").insert([
        {
          user_id: userId,
          descricao: despesa.nome,
          valor: despesa.valor,
          tipo: "Despesa",
          categoria: despesa.categoria || "Contas Fixas",
          forma_pagamento: despesa.forma_pagamento || "Pix",
          data_vencimento: dataFormatada,
          pago: true,
        },
      ]);

      if (error) throw error;

      setNomesLancadosEsteMes((prev) => {
        const next = [...prev, despesa.nome];
        fixasCache.nomesLancadosEsteMes = next;
        fixasCache.nomesLancadosMesKey = monthKey(new Date());
        return next;
      });

      toast({
        title: "Lançamento realizado!",
        description: `${despesa.nome} foi lançado para este mês.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao lançar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
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

    setNomesLancadosEsteMes((prev) => {
      if (!editingExpense) return prev;
      const oldName = editingExpense.nome;
      const newName = updated.nome;
      if (oldName === newName) return prev;

      const hadOld = prev.includes(oldName);
      const withoutOld = prev.filter((n) => n !== oldName);
      const next = hadOld ? [...withoutOld, newName] : withoutOld;

      fixasCache.nomesLancadosEsteMes = next;
      fixasCache.nomesLancadosMesKey = monthKey(new Date());
      return next;
    });

    toast({
      title: "Atualizado",
      description: "Alterações aplicadas na lista.",
    });
  };

  return (
    <>
      <div className="space-y-8 p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Despesas Fixas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus gastos recorrentes
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            className="gap-2 shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* COMPONENTES EXTRAÍDOS */}
        <SummaryCard
          totalComprometido={totalComprometido}
          totalPagamentoDia05={totalPagamentoDia05}
          totalPagamentoDia15={totalPagamentoDia15}
          modoQuinzenal={modoQuinzenal}
          setModoQuinzenal={setModoQuinzenal}
          formatMoney={formatMoney}
        />

        <AddExpenseForm
          categorias={categoriasDB}
          pagamentos={formasPagamentoDB}
          onAdd={handleAdicionar}
        />

        {/* LISTA */}
        {loading && despesas.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {despesas.map((despesa) => (
              <ExpenseCard
                key={despesa.id}
                despesa={despesa}
                jaLancadoNoMes={nomesLancadosEsteMes.includes(despesa.nome)}
                loadingId={loadingId}
                onLancar={handleLancarAgora}
                onEdit={(d: DespesaFixa) => {
                  setEditingExpense(d);
                  setIsEditDialogOpen(true);
                }}
                onDelete={openDeleteDialog}
                formatMoney={formatMoney}
              />
            ))}

            {despesas.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-xl bg-card/30">
                Nenhuma despesa fixa cadastrada.
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
                ? `Você tem certeza que deseja remover "${expenseToDelete.nome}"? Esta ação não pode ser desfeita.`
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removendo...
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
