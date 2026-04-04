"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  Calculator,
  Pencil,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonthSelector } from "./releases/MonthSelector";

interface ReceitaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_recebimento: number;
}

// CACHE EM MEMÓRIA (Stale-While-Revalidate)
// Garante que a transição entre abas seja instantânea, consultando o banco só em background
const memoryCache = {
  receitas: null as ReceitaFixa[] | null,
  totalDespesasFixas: null as number | null,
  variaveisPorMes: {} as Record<string, number>,
};

export default function Receitas() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  // Estados com inicialização pelo cache (se existir)
  const [receitas, setReceitas] = useState<ReceitaFixa[]>(
    memoryCache.receitas || [],
  );
  const [totalDespesasFixas, setTotalDespesasFixas] = useState(
    memoryCache.totalDespesasFixas || 0,
  );
  const [totalVariaveis, setTotalVariaveis] = useState(0);

  // Loading inicial (só mostra se não tiver nada no cache)
  const [loading, setLoading] = useState(!memoryCache.receitas);
  const [isSaving, setIsSaving] = useState(false);

  // Controle de Data
  const [date, setDate] = useState<Date>(new Date());
  const [mesReferencia, setMesReferencia] = useState(
    new Date().toISOString().slice(0, 7),
  );

  // Formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");

  // Atualiza a string do mês referência quando a data muda
  useEffect(() => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, "0");
      const novoMes = `${ano}-${mes}`;
      setMesReferencia(novoMes);

      // Se já tivermos o total variável deste mês no cache, aplicamos imediatamente
      if (memoryCache.variaveisPorMes[novoMes] !== undefined) {
        setTotalVariaveis(memoryCache.variaveisPorMes[novoMes]);
      }
    }
  }, [date]);

  // Busca Inteligente em Paralelo
  const fetchAllData = useCallback(async () => {
    if (!userId) return;

    try {
      const [ano, mes] = mesReferencia.split("-");
      const inicio = `${mesReferencia}-01`;
      const fim = `${mesReferencia}-${new Date(Number(ano), Number(mes), 0).getDate()}`;

      // Executa as 3 queries ao mesmo tempo para máxima velocidade
      const [resReceitas, resFixas, resVariaveis] = await Promise.all([
        supabase
          .from("receitas_fixas")
          .select("*")
          .eq("user_id", userId)
          .order("valor", { ascending: false }),
        supabase.from("despesas_fixas").select("valor").eq("user_id", userId),
        supabase
          .from("lancamentos")
          .select("valor")
          .eq("user_id", userId)
          .eq("tipo", "Despesa")
          .gte("data_vencimento", inicio)
          .lte("data_vencimento", fim),
      ]);

      // Atualiza Receitas
      if (resReceitas.data) {
        memoryCache.receitas = resReceitas.data;
        setReceitas(resReceitas.data);
      }

      // Atualiza Fixas
      if (resFixas.data) {
        const somaFixas = resFixas.data.reduce(
          (acc, item) => acc + Number(item.valor),
          0,
        );
        memoryCache.totalDespesasFixas = somaFixas;
        setTotalDespesasFixas(somaFixas);
      }

      // Atualiza Variáveis do Mês Selecionado
      if (resVariaveis.data) {
        const somaVariaveis = resVariaveis.data.reduce(
          (acc, item) => acc + Number(item.valor),
          0,
        );
        memoryCache.variaveisPorMes[mesReferencia] = somaVariaveis;
        setTotalVariaveis(somaVariaveis);
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados", error);
    } finally {
      setLoading(false);
    }
  }, [userId, mesReferencia]);

  // Dispara a busca silenciosa toda vez que a aba ou o mês muda
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetForm = () => {
    setNovoNome("");
    setNovoValor("");
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (item: ReceitaFixa) => {
    setNovoNome(item.nome);
    setNovoValor(String(item.valor));
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!userId || !novoNome || !novoValor) {
      toast({ title: "Preencha nome e valor", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        user_id: userId,
        nome: novoNome,
        valor: Number(novoValor),
      };

      if (editingId) {
        await supabase
          .from("receitas_fixas")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId);
        toast({ title: "Renda atualizada!" });
      } else {
        await supabase.from("receitas_fixas").insert([payload]);
        toast({ title: "Renda adicionada!" });
      }

      resetForm();
      fetchAllData(); // Refetch silencioso para atualizar listas
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!userId) return;
    try {
      // Otimização UI (Remove instantaneamente da tela)
      setReceitas((prev) => prev.filter((r) => r.id !== id));

      // Remove do banco em background
      await supabase
        .from("receitas_fixas")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      toast({ title: "Removido" });

      // Atualiza o cache para refletir
      memoryCache.receitas =
        memoryCache.receitas?.filter((r) => r.id !== id) || null;
    } catch (error) {
      fetchAllData(); // Se der erro, restaura o dado original
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  // CÁLCULOS FINAIS
  const totalReceitas = receitas.reduce((acc, item) => acc + item.valor, 0);
  const sobraAposFixas = totalReceitas - totalDespesasFixas;
  const saldoFinal = sobraAposFixas - totalVariaveis;

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-8 p-4 md:p-6 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Resumo Financeiro</h1>
        <p className="text-muted-foreground text-sm">
          Visão mensal das suas finanças
        </p>
      </div>

      {/* --- BLOCO 1: RESUMO FINANCEIRO (Flat Design) --- */}
      <section className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 font-semibold text-primary">
            <Calculator className="h-5 w-5" />
            Balanço Mensal
          </h2>
          <div className="w-auto scale-90 origin-right -mr-2">
            <MonthSelector date={date} setDate={setDate} />
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center text-green-600 dark:text-green-500 font-medium">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Entradas Fixas
            </span>
            <span>{formatMoney(totalReceitas)}</span>
          </div>

          <div className="flex justify-between items-center text-destructive/90">
            <span className="flex items-center gap-2 pl-2 border-l-2 border-destructive/20">
              (-) Contas Fixas
            </span>
            <span>{formatMoney(totalDespesasFixas)}</span>
          </div>

          <div className="flex justify-between items-center text-orange-500/90">
            <span className="flex items-center gap-2 pl-2 border-l-2 border-orange-500/20">
              (-) Gastos do Mês ({format(date, "MMM/yy", { locale: ptBR })})
            </span>
            <span>{formatMoney(totalVariaveis)}</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-primary/10 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Saldo Previsto
            </p>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${saldoFinal >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}`}
          >
            {formatMoney(saldoFinal)}
          </div>
        </div>
      </section>

      {/* --- BLOCO 2: RENDAS FIXAS --- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <h3 className="font-semibold text-lg tracking-tight">
            Minhas Rendas Fixas
          </h3>
          {!isFormOpen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
          )}
        </div>

        {/* Formulário Inline */}
        {isFormOpen && (
          <div className="bg-card border rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              {editingId ? "Editar Renda" : "Nova Renda"}
            </p>
            <div className="grid gap-3 sm:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="ex: Salário"
                  autoFocus
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  type="number"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  placeholder="0.00"
                  className="h-10"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Salvar"
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Lista Limpa */}
        <div className="flex flex-col">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : receitas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground bg-accent/30 rounded-xl border border-dashed">
              Nenhuma renda fixa cadastrada.
            </div>
          ) : (
            receitas.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-border/50 group last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-500 shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="font-medium text-sm sm:text-base">
                    {item.nome}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm sm:text-base text-foreground">
                    {formatMoney(item.valor)}
                  </span>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleExcluir(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
