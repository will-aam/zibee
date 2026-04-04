"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  TrendingDown,
  Wallet,
  X,
  Pencil,
  Rocket,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  EditFixedExpenseDialog,
  type DespesaFixa,
} from "./EditFixedExpenseDialog";
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

interface ItemOpcao {
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
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoDia, setNovoDia] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoPagamento, setNovoPagamento] = useState("");
  const [adding, setAdding] = useState(false);

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

  const resetForm = () => {
    setNovoNome("");
    setNovoValor("");
    setNovoDia("");
    setNovaCategoria("");
    setNovoPagamento("");
  };

  const handleAdicionar = async () => {
    if (!userId) return;

    if (!novoNome.trim() || !novoValor || !novoDia) {
      toast({
        title: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const payload = {
        user_id: userId,
        nome: novoNome.trim(),
        valor: Number(novoValor),
        dia_vencimento: Number(novoDia),
        categoria: (novaCategoria || "Contas Fixas").trim(),
        forma_pagamento: (novoPagamento || "Pix").trim(),
      };

      const { error } = await supabase.from("despesas_fixas").insert([payload]);
      if (error) throw error;

      toast({ title: "Despesa fixa adicionada!" });
      resetForm();
      setIsFormOpen(false);

      await fetchData(true);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
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
    if (!userId) return;

    if (nomesLancadosEsteMes.includes(despesa.nome)) return;
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
        const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate();
        dataVencimento.setDate(ultimoDia);
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

  // ---- AQUI O PULO DO GATO: atualiza lista/cache sem refetch ----
  const handleExpenseSaved = (updated: DespesaFixa) => {
    setDespesas((prev) => {
      const next = prev
        .map((d) => (d.id === updated.id ? updated : d))
        .slice()
        .sort((a, b) => a.dia_vencimento - b.dia_vencimento);

      fixasCache.despesas = next;
      return next;
    });

    // se o nome mudou, a checagem de "já lançado no mês" pode ficar defasada.
    // não refetch: apenas remove o nome antigo e adiciona o novo se já existia.
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
      <div className="space-y-6 p-4 md:p-6 pb-24 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Despesas Fixas</h1>
            <p className="text-muted-foreground">
              Gerencie seus gastos recorrentes
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* CARD RESUMO */}
        <Card className="border-red-900/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                    <TrendingDown className="h-7 w-7 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Mensal
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                      {formatMoney(totalComprometido)}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity scale-90 origin-top-right">
                  <Label
                    htmlFor="quinzena-mode"
                    className="text-[10px] text-muted-foreground uppercase cursor-pointer tracking-wider font-semibold"
                  >
                    Quinzenal
                  </Label>
                  <Switch
                    id="quinzena-mode"
                    checked={modoQuinzenal}
                    onCheckedChange={setModoQuinzenal}
                    className="scale-75 data-[state=checked]:bg-red-500"
                  />
                </div>
              </div>

              {modoQuinzenal && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
                  <div className="rounded-xl p-4 border border-blue-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        Dia 05
                      </span>
                    </div>
                    <p className="text-xl font-bold text-blue-500">
                      {formatMoney(totalPagamentoDia05)}
                    </p>
                  </div>

                  <div className="rounded-xl p-4 border border-green-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-green-400" />
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                        Dia 15
                      </span>
                    </div>
                    <p className="text-xl font-bold text-green-500">
                      {formatMoney(totalPagamentoDia15)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* FORM ADD */}
        <div className="space-y-4">
          {!isFormOpen ? (
            <Button
              onClick={() => setIsFormOpen(true)}
              variant="outline"
              className="w-full h-12 border-dashed border-muted-foreground/20 hover:bg-accent hover:border-solid transition-all rounded-xl gap-2 text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              Adicionar Nova Despesa
            </Button>
          ) : (
            <Card className="animate-in zoom-in-95 duration-200 border-primary/20 bg-card/60">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Nova Conta</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFormOpen(false)}
                    className="h-8 w-8 p-0 rounded-full"
                    disabled={adding}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-12 items-end">
                  <div className="md:col-span-3 space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Ex: Internet"
                      autoFocus
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Vencimento (Dia)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      inputMode="numeric"
                      value={novoDia}
                      onChange={(e) => setNovoDia(e.target.value)}
                      placeholder="Dia"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={novaCategoria}
                      onValueChange={setNovaCategoria}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriasDB.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Pagamento</Label>
                    <Select
                      value={novoPagamento}
                      onValueChange={setNovoPagamento}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamentoDB.map((f) => (
                          <SelectItem key={f.id} value={f.nome}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-1">
                    <Button
                      onClick={handleAdicionar}
                      disabled={adding}
                      className="w-full"
                      title="Adicionar"
                    >
                      {adding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* LISTA */}
        {loading && despesas.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {despesas.map((despesa) => {
              const jaLancadoNoMes = nomesLancadosEsteMes.includes(
                despesa.nome,
              );

              return (
                <Card
                  key={despesa.id}
                  className={`relative group transition-colors ${
                    jaLancadoNoMes
                      ? "bg-muted/30 border-dashed"
                      : "hover:border-primary/50"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle
                        className={`text-lg ${
                          jaLancadoNoMes ? "text-muted-foreground" : ""
                        }`}
                      >
                        {despesa.nome}
                      </CardTitle>

                      <div className="flex gap-1">
                        {jaLancadoNoMes ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled
                            className="h-8 w-8 text-muted-foreground cursor-not-allowed"
                            title="Já lançado neste mês"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={loadingId === despesa.id}
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            title="Lançar este mês como Pago"
                            onClick={() => handleLancarAgora(despesa)}
                          >
                            {loadingId === despesa.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Rocket className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditingExpense(despesa);
                            setIsEditDialogOpen(true);
                          }}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => openDeleteDialog(despesa)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CardDescription>
                      Vence todo dia {despesa.dia_vencimento}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div
                      className={`text-2xl font-bold mb-2 ${
                        jaLancadoNoMes ? "text-muted-foreground" : ""
                      }`}
                    >
                      {formatMoney(despesa.valor)}
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      {despesa.categoria && (
                        <span className="bg-secondary px-2 py-1 rounded border">
                          {despesa.categoria}
                        </span>
                      )}
                      {despesa.forma_pagamento && (
                        <span className="bg-secondary px-2 py-1 rounded border">
                          {despesa.forma_pagamento}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {despesas.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground border border-dashed rounded-2xl bg-accent/20">
                Nenhuma despesa fixa cadastrada.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de edição (fora do container principal) */}
      <EditFixedExpenseDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        expense={editingExpense}
        onSaved={handleExpenseSaved}
        categorias={categoriasDB}
        formasPagamento={formasPagamentoDB}
      />

      {/* ALERT DIALOG: confirmar exclusão (fora do container principal) */}
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
                ? `Você tem certeza que deseja remover "${expenseToDelete.nome}"?`
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
