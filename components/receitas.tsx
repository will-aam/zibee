"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonthSelector } from "./releases/MonthSelector";
import { cn } from "@/lib/utils";

import {
  PlusIcon as PlusSolid,
  TrashIcon as TrashSolid,
  ArrowTrendingUpIcon as TrendingUpSolid,
  PencilIcon as PencilSolid,
  XMarkIcon as XSolid,
  ArrowPathIcon,
  HomeIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  BeakerIcon,
} from "@heroicons/react/24/solid";

import { ChartPieIcon } from "@heroicons/react/24/outline";

interface ReceitaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_recebimento: number;
  user_id: string;
}

function avatarUrl(style: string, seed: string) {
  const safeSeed = encodeURIComponent(seed || "Zibee");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=96`;
}

const memoryCache = {
  receitas: null as ReceitaFixa[] | null,
  totalDespesasFixas: null as number | null,
  variaveisPorMes: {} as Record<string, number>,
  avatares: {} as Record<string, string>,
};

export default function Receitas() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  const [receitas, setReceitas] = useState<ReceitaFixa[]>(
    memoryCache.receitas || [],
  );
  const [totalDespesasFixas, setTotalDespesasFixas] = useState(
    memoryCache.totalDespesasFixas || 0,
  );
  const [totalVariaveis, setTotalVariaveis] = useState(0);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>(
    memoryCache.avatares || {},
  );

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState<Date>(new Date());
  const [mesReferencia, setMesReferencia] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");

  // ESTADOS DO SIMULADOR (Laboratório Financeiro - Apenas Local)
  const [simulacoes, setSimulacoes] = useState<
    { id: string; nome: string; valor: number }[]
  >([]);
  const [simulacaoNome, setSimulacaoNome] = useState("");
  const [simulacaoValor, setSimulacaoValor] = useState("");

  const SIMULADOR_STORAGE_KEY = "zibee_simulador_data";

  // Carrega as simulações do LocalStorage ao abrir a página
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIMULADOR_STORAGE_KEY);
      if (saved) setSimulacoes(JSON.parse(saved));
    } catch (e) {
      console.error("Erro ao carregar simulações locais");
    }
  }, []);

  useEffect(() => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, "0");
      const novoMes = `${ano}-${mes}`;
      setMesReferencia(novoMes);

      const cacheKey = `${novoMes}_${activeContext}`;
      if (memoryCache.variaveisPorMes[cacheKey] !== undefined) {
        setTotalVariaveis(memoryCache.variaveisPorMes[cacheKey]);
      }
    }
  }, [date, activeContext]);

  const fetchAllData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);

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

      const [ano, mes] = mesReferencia.split("-");
      const inicio = `${mesReferencia}-01`;
      const fim = `${mesReferencia}-${new Date(Number(ano), Number(mes), 0).getDate()}`;

      let queryVariaveis = supabase
        .from("lancamentos")
        .select("valor")
        .eq("tipo", "Despesa")
        .is("conta_fixa_id", null)
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim);
      let queryReceitas = supabase
        .from("receitas_fixas")
        .select("*")
        .order("valor", { ascending: false });
      let queryFixas = supabase
        .from("despesas_fixas")
        .select("valor")
        .eq("status", "ativo");

      if (activeContext === "grupo" && groupId) {
        queryVariaveis = queryVariaveis.eq("grupo_id", groupId);
        queryReceitas = queryReceitas.eq("grupo_id", groupId);
        queryFixas = queryFixas.eq("grupo_id", groupId);
      } else {
        queryVariaveis = queryVariaveis
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryReceitas = queryReceitas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryFixas = queryFixas.eq("user_id", userId).is("grupo_id", null);
      }

      const [resReceitas, resFixas, resVariaveis] = await Promise.all([
        queryReceitas,
        queryFixas,
        queryVariaveis,
      ]);

      if (resReceitas.data) {
        memoryCache.receitas = resReceitas.data;
        setReceitas(resReceitas.data);

        if (activeContext === "grupo") {
          const uniqueUserIds = Array.from(
            new Set(resReceitas.data.map((r) => r.user_id)),
          );
          if (uniqueUserIds.length > 0) {
            const { data: avatars } = await supabase
              .from("user_profile_settings_ba")
              .select("user_id, avatar_seed")
              .in("user_id", uniqueUserIds);
            const map: Record<string, string> = { ...avatarMap };
            avatars?.forEach((a) => (map[a.user_id] = a.avatar_seed));
            memoryCache.avatares = map;
            setAvatarMap(map);
          }
        }
      }

      if (resFixas.data) {
        const somaFixas = resFixas.data.reduce(
          (acc, item) => acc + Number(item.valor),
          0,
        );
        memoryCache.totalDespesasFixas = somaFixas;
        setTotalDespesasFixas(somaFixas);
      }

      if (resVariaveis.data) {
        const somaVariaveis = resVariaveis.data.reduce(
          (acc, item) => acc + Number(item.valor),
          0,
        );
        const cacheKey = `${mesReferencia}_${activeContext}`;
        memoryCache.variaveisPorMes[cacheKey] = somaVariaveis;
        setTotalVariaveis(somaVariaveis);
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados", error);
    } finally {
      setLoading(false);
    }
  }, [userId, mesReferencia, activeContext, currentGroupId, avatarMap]);

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
        grupo_id: activeContext === "grupo" ? currentGroupId : null,
        nome: novoNome,
        valor: Number(novoValor),
      };

      if (editingId) {
        let query = supabase
          .from("receitas_fixas")
          .update(payload)
          .eq("id", editingId);
        if (activeContext === "grupo" && currentGroupId)
          query = query.eq("grupo_id", currentGroupId);
        else query = query.eq("user_id", userId).is("grupo_id", null);
        await query;
        toast({ title: "Renda atualizada!" });
      } else {
        await supabase.from("receitas_fixas").insert([payload]);
        toast({ title: "Renda adicionada!" });
      }

      resetForm();
      fetchAllData();
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
      setReceitas((prev) => prev.filter((r) => r.id !== id));
      let query = supabase.from("receitas_fixas").delete().eq("id", id);
      if (activeContext === "grupo" && currentGroupId)
        query = query.eq("grupo_id", currentGroupId);
      else query = query.eq("user_id", userId).is("grupo_id", null);
      await query;
      toast({ title: "Removido" });
      memoryCache.receitas =
        memoryCache.receitas?.filter((r) => r.id !== id) || null;
    } catch (error) {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const adicionarSimulacao = () => {
    if (!simulacaoNome || !simulacaoValor) {
      toast({ title: "Preencha o nome e o valor", variant: "destructive" });
      return;
    }

    const val = Number(simulacaoValor);

    // Validações de segurança para evitar bugs no layout
    if (isNaN(val) || val <= 0) {
      toast({
        title: "Digite um valor válido e maior que zero.",
        variant: "destructive",
      });
      return;
    }
    if (val > 9999999) {
      toast({
        title: "O valor simulado é muito alto.",
        variant: "destructive",
      });
      return;
    }
    if (simulacaoNome.length > 30) {
      toast({
        title: "Nome muito longo (máximo 30 caracteres).",
        variant: "destructive",
      });
      return;
    }

    const novasSimulacoes = [
      ...simulacoes,
      { id: Date.now().toString(), nome: simulacaoNome, valor: val },
    ];

    setSimulacoes(novasSimulacoes);
    localStorage.setItem(
      SIMULADOR_STORAGE_KEY,
      JSON.stringify(novasSimulacoes),
    ); // Salva no local
    setSimulacaoNome("");
    setSimulacaoValor("");
  };

  const removerSimulacao = (id: string) => {
    const novasSimulacoes = simulacoes.filter((s) => s.id !== id);
    setSimulacoes(novasSimulacoes);
    localStorage.setItem(
      SIMULADOR_STORAGE_KEY,
      JSON.stringify(novasSimulacoes),
    ); // Atualiza no local
  };

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // MATEMÁTICA DO ORÇAMENTO
  const totalReceitasBase = receitas.reduce((acc, item) => acc + item.valor, 0);
  const sobraAposFixas = totalReceitasBase - totalDespesasFixas;
  const saldoFinalReal = sobraAposFixas - totalVariaveis;

  // MATEMÁTICA DO SIMULADOR
  const totalSimulado = simulacoes.reduce((acc, curr) => acc + curr.valor, 0);
  const saldoComSimulacao = saldoFinalReal - totalSimulado;

  // MATEMÁTICA 50/30/20
  const idealNecessidades = totalReceitasBase * 0.5;
  const idealDesejos = totalReceitasBase * 0.3;
  const idealPoupanca = totalReceitasBase * 0.2;

  const pctNecessidades =
    idealNecessidades > 0 ? (totalDespesasFixas / idealNecessidades) * 100 : 0;
  const pctDesejos =
    idealDesejos > 0 ? (totalVariaveis / idealDesejos) * 100 : 0;

  if (loading && !memoryCache.receitas && activeContext === "pessoal") {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      {" "}
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">
            {activeContext === "pessoal" ? (
              <>
                <span className="sm:hidden">Planejador</span>
                <span className="hidden sm:inline">
                  Planejador de Orçamento
                </span>
              </>
            ) : (
              <>
                <span className="sm:hidden">Orçamento</span>
                <span className="hidden sm:inline">Orçamento do Grupo</span>
              </>
            )}
          </h1>

          <div className="shrink-0">
            <MonthSelector date={date} setDate={setDate} />
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          <span className="sm:hidden">Planeje seu mês e simule cenários.</span>
          <span className="hidden sm:inline">
            Planeje seu mês, aplique regras financeiras e simule cenários.
          </span>
        </p>
      </div>
      {/* --- BLOCO 1: TETO DE GASTOS (CHAPADO NA TELA) --- */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Teto de Gastos do Mês
        </h2>
        <div className="flex flex-col text-sm sm:text-base font-medium">
          <div className="flex justify-between items-center py-3 border-b border-border/40">
            <span className="text-green-600 dark:text-green-500 flex items-center gap-2">
              <TrendingUpSolid className="h-4 w-4" /> Entradas (Renda Base)
            </span>
            <span className="text-foreground">
              {formatMoney(totalReceitasBase)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border/40">
            <span className="text-muted-foreground flex items-center gap-2">
              (-) Contas Fixas Reais
            </span>
            <span className="text-foreground">
              {formatMoney(totalDespesasFixas)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border/40">
            <span className="text-muted-foreground flex items-center gap-2">
              (-) Gastos Variáveis Acumulados
            </span>
            <span className="text-foreground">
              {formatMoney(totalVariaveis)}
            </span>
          </div>
          <div className="flex justify-between items-center py-4 mt-2">
            <span className="font-bold text-lg text-foreground">
              Saldo Livre Atual
            </span>
            <span
              className={cn(
                "text-2xl font-bold tracking-tight",
                saldoFinalReal >= 0
                  ? "text-green-600 dark:text-green-500"
                  : "text-destructive",
              )}
            >
              {formatMoney(saldoFinalReal)}
            </span>
          </div>
        </div>
      </section>
      {/* --- BLOCO 2: RENDAS FIXAS COM SCROLL INVISÍVEL --- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <h3 className="font-semibold text-lg tracking-tight">
            Composição da Renda
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
              <PlusSolid className="h-4 w-4 mr-1.5" /> Adicionar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <XSolid className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
          )}
        </div>

        {isFormOpen && (
          <div className="bg-card border rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
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
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Salvar"
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* LISTA COM ROLAGEM MÁXIMA DE ~4 ITENS */}
        <div className="max-h-[260px] overflow-y-auto scrollbar-hide pr-1">
          <div className="flex flex-col">
            {receitas.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground bg-accent/30 rounded-xl border border-dashed">
                Nenhuma renda base cadastrada para os cálculos.
              </div>
            ) : (
              receitas.map((item) => {
                const userSeed =
                  activeContext === "grupo" ? avatarMap[item.user_id] : null;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-border/50 group last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-500 shrink-0 overflow-hidden">
                        {activeContext === "grupo" && userSeed ? (
                          <img
                            src={avatarUrl("bottts-neutral", userSeed)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <TrendingUpSolid className="h-4 w-4" />
                        )}
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
                        {(activeContext === "pessoal" ||
                          item.user_id === userId) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleEdit(item)}
                            >
                              <PencilSolid className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleExcluir(item.id)}
                            >
                              <TrashSolid className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-border/50" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Análise do orçamento
          </span>
        </div>
      </div>
      {/* --- BLOCO 3: REGRA 50/30/20 (A EDUCAÇÃO FINANCEIRA) --- */}
      <section className="space-y-4 pt-6">
        <div>
          <h3 className="font-semibold text-lg tracking-tight flex items-center gap-2">
            <ChartPieIcon className="h-5 w-5 text-primary" />
            Regra 50/30/20
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Como seu orçamento atual se comporta diante da regra de ouro
            financeira.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* POTE 50: NECESSIDADES */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <HomeIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground leading-none">
                  50% Necessidades básicas
                </h4>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Fixas
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-muted-foreground">
                  Real: {formatMoney(totalDespesasFixas)}
                </span>
                <span className="text-muted-foreground">
                  Ideal: {formatMoney(idealNecessidades)}
                </span>
              </div>
              <Progress
                value={Math.min(pctNecessidades, 100)}
                className={cn(
                  "h-2.5",
                  pctNecessidades > 100
                    ? "bg-destructive/20 [&>div]:bg-destructive"
                    : "bg-blue-500/20 [&>div]:bg-blue-500",
                )}
              />
              {pctNecessidades > 100 && (
                <p className="text-xs text-destructive mt-2 font-medium">
                  Você estourou o limite seguro para contas fixas!
                </p>
              )}
            </div>
          </div>

          {/* POTE 30: DESEJOS */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <ShoppingBagIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground leading-none">
                  30% Desejos pessoais
                </h4>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Variáveis
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-muted-foreground">
                  Real: {formatMoney(totalVariaveis)}
                </span>
                <span className="text-muted-foreground">
                  Ideal: {formatMoney(idealDesejos)}
                </span>
              </div>
              <Progress
                value={Math.min(pctDesejos, 100)}
                className={cn(
                  "h-2.5",
                  pctDesejos > 100
                    ? "bg-destructive/20 [&>div]:bg-destructive"
                    : "bg-orange-500/20 [&>div]:bg-orange-500",
                )}
              />
              {pctDesejos > 100 && (
                <p className="text-xs text-destructive mt-2 font-medium">
                  Os gastos variáveis já passaram do ideal.
                </p>
              )}
            </div>
          </div>

          {/* POTE 20: POUPANÇA */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <BanknotesIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground leading-none">
                  20% Poupança
                </h4>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Metas e Reservas
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-muted-foreground">
                  Ideal reservar:
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatMoney(idealPoupanca)}
              </div>
              {/* FEEDBACK DINÂMICO DA POUPANÇA */}
              {saldoFinalReal >= idealPoupanca ? (
                <p className="text-xs text-green-600 dark:text-green-500 mt-2 font-medium">
                  Excelente! Seu saldo livre atual permite guardar este valor.
                </p>
              ) : saldoFinalReal > 0 ? (
                <p className="text-xs text-orange-500 mt-2 font-medium leading-relaxed">
                  Atenção: Seu saldo atual ({formatMoney(saldoFinalReal)}) não
                  cobre o ideal porque os outros gastos passaram do limite.
                  Guarde o que sobrou!
                </p>
              ) : (
                <p className="text-xs text-destructive mt-2 font-medium leading-relaxed">
                  Sem saldo livre. Reveja seus gastos variáveis para conseguir
                  poupar no próximo mês.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* --- BLOCO 4: SIMULADOR DE CENÁRIOS ("E SE...") --- */}
      {/* O !mt-6 força a seção a ignorar o gap gigante da página e colar nos cards acima */}
      {/* <section className="mt-6!">
        <div className="bg-muted/30 border border-dashed rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
              <BeakerIcon className="h-5 w-5 text-primary" />
              Simulador: E se eu comprar...?
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Adicione compras teóricas para testar como o seu saldo final
              reagiria.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 relative z-10">
            <Input
              value={simulacaoNome}
              onChange={(e) => setSimulacaoNome(e.target.value)}
              placeholder="O que você quer comprar?"
              className="bg-background"
              maxLength={30}
            />
            <Input
              type="number"
              value={simulacaoValor}
              onChange={(e) => setSimulacaoValor(e.target.value)}
              placeholder="Valor (R$)"
              // Remove as setas do input e impede que o scroll do mouse altere o valor
              className="bg-background sm:w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onWheel={(e) => e.currentTarget.blur()}
            />
            <Button onClick={adicionarSimulacao} variant="secondary">
              Adicionar
            </Button>
          </div>

          {simulacoes.length > 0 && (
            <div className="space-y-2 relative z-10 bg-background rounded-xl p-3 border">
              {simulacoes.map((sim, index) => (
                <div
                  key={sim.id}
                  className={cn(
                    "flex justify-between items-center text-sm py-2",
                    index !== simulacoes.length - 1 && "border-b",
                  )}
                >
                  <span className="font-medium text-foreground">
                    {sim.nome}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-destructive font-semibold">
                      -{formatMoney(sim.valor)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removerSimulacao(sim.id)}
                    >
                      <XSolid className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-border/50 relative z-10">
            <span className="font-bold text-muted-foreground">
              Novo Saldo Simulado:
            </span>
            <span
              className={cn(
                "text-2xl font-bold tracking-tight",
                saldoComSimulacao >= 0
                  ? "text-green-600 dark:text-green-500"
                  : "text-destructive",
              )}
            >
              {formatMoney(saldoComSimulacao)}
            </span>
          </div>
        </div>
      </section> */}
    </div>
  );
}
