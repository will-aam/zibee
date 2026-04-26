"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { MonthSelector } from "./releases/MonthSelector";
import { cn } from "@/lib/utils";

// Importando Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Importando as Tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
} from "@heroicons/react/24/solid";

import {
  ChartPieIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface ReceitaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_recebimento: number;
  user_id: string;
}

interface CategoriaComLimite {
  id: number;
  nome: string;
  teto_gastos?: number;
}

function avatarUrl(style: string, seed: string) {
  const safeSeed = encodeURIComponent(seed || "Zibee");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=96`;
}

const memoryCache = {
  receitas: null as ReceitaFixa[] | null,
  fixasPorMes: {} as Record<string, number>, // Agora as fixas entram no cache mensal
  variaveisPorMes: {} as Record<string, number>,
  gastosPorCategoria: {} as Record<string, Record<string, number>>,
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
  const [totalDespesasFixas, setTotalDespesasFixas] = useState(0);
  const [totalVariaveis, setTotalVariaveis] = useState(0);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>(
    memoryCache.avatares || {},
  );

  const [categorias, setCategorias] = useState<CategoriaComLimite[]>([]);
  const [gastosCategorizados, setGastosCategorizados] = useState<
    Record<string, number>
  >({});

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

  // Modais do Limite de Categoria
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [categoriaEditando, setCategoriaEditando] =
    useState<CategoriaComLimite | null>(null);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [novoLimite, setNovoLimite] = useState("");

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
      if (memoryCache.fixasPorMes[cacheKey] !== undefined) {
        setTotalDespesasFixas(memoryCache.fixasPorMes[cacheKey]);
      }
      if (memoryCache.gastosPorCategoria[cacheKey]) {
        setGastosCategorizados(memoryCache.gastosPorCategoria[cacheKey]);
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

      // BUSCA 1: Lançamentos Reais (Variáveis + Contas Fixas já consolidadas no mês)
      let queryDespesas = supabase
        .from("lancamentos")
        .select("valor, categoria, conta_fixa_id")
        .eq("tipo", "Despesa")
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim);
      // BUSCA 2: Contas Fixas ativas para pegarmos as Sombras
      let queryFixas = supabase
        .from("despesas_fixas")
        .select("id, valor, categoria")
        .eq("status", "ativo");

      let queryReceitas = supabase
        .from("receitas_fixas")
        .select("*")
        .order("valor", { ascending: false });
      let queryCategorias = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", userId)
        .order("nome");

      if (activeContext === "grupo" && groupId) {
        queryDespesas = queryDespesas.eq("grupo_id", groupId);
        queryReceitas = queryReceitas.eq("grupo_id", groupId);
        queryFixas = queryFixas.eq("grupo_id", groupId);
      } else {
        queryDespesas = queryDespesas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryReceitas = queryReceitas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryFixas = queryFixas.eq("user_id", userId).is("grupo_id", null);
      }

      const [resReceitas, resFixas, resDespesas, resCategorias] =
        await Promise.all([
          queryReceitas,
          queryFixas,
          queryDespesas,
          queryCategorias,
        ]);

      if (resCategorias.data) setCategorias(resCategorias.data);

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

      // MOTOR DE PROCESSAMENTO (MÁGICA DO ORÇAMENTO)
      if (resDespesas.data && resFixas.data) {
        let somaFixas = 0;
        let somaVariaveis = 0;
        const agrupadoPorCategoria: Record<string, number> = {};

        // Descobre quais contas fixas já foram materializadas (lançamentos reais) neste mês
        const fixasPagasNoMes = new Set(
          resDespesas.data
            .filter((d) => d.conta_fixa_id != null)
            .map((d) => d.conta_fixa_id),
        );

        // 1. Processa Lançamentos Reais (Variáveis e Fixas já consolidadas)
        resDespesas.data.forEach((item) => {
          const val = Number(item.valor);
          const cat = item.categoria ? item.categoria.trim() : "Outros";

          agrupadoPorCategoria[cat] = (agrupadoPorCategoria[cat] || 0) + val;

          if (item.conta_fixa_id) {
            somaFixas += val;
          } else {
            somaVariaveis += val;
          }
        });

        // 2. Processa as Sombras (Contas fixas que ainda não foram pagas/consolidadas)
        resFixas.data.forEach((fixa) => {
          if (!fixasPagasNoMes.has(fixa.id)) {
            const val = Number(fixa.valor);
            const cat = fixa.categoria ? fixa.categoria.trim() : "Outros";

            agrupadoPorCategoria[cat] = (agrupadoPorCategoria[cat] || 0) + val;
            somaFixas += val;
          }
        });

        // 3. Atualiza Cache e Estado
        const cacheKey = `${mesReferencia}_${activeContext}`;
        memoryCache.fixasPorMes[cacheKey] = somaFixas;
        memoryCache.variaveisPorMes[cacheKey] = somaVariaveis;
        memoryCache.gastosPorCategoria[cacheKey] = agrupadoPorCategoria;

        setTotalDespesasFixas(somaFixas);
        setTotalVariaveis(somaVariaveis);
        setGastosCategorizados(agrupadoPorCategoria);
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
    } catch (error) {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  // --- SALVAR O LIMITE DA CATEGORIA ---
  const handleSaveLimit = async () => {
    const idAlvo = categoriaEditando
      ? categoriaEditando.id
      : Number(selectedCategoriaId);
    if (!idAlvo) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const val = Number(novoLimite) || 0;
      const { error } = await supabase
        .from("categorias")
        .update({ teto_gastos: val })
        .eq("id", idAlvo);

      if (error) throw error;

      toast({ title: val > 0 ? "Limite atualizado!" : "Limite removido." });
      setIsLimitModalOpen(false);
      fetchAllData();
    } catch (error) {
      toast({ title: "Erro ao atualizar limite", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalReceitasBase = receitas.reduce((acc, item) => acc + item.valor, 0);
  const sobraAposFixas = totalReceitasBase - totalDespesasFixas;
  const saldoFinalReal = sobraAposFixas - totalVariaveis;

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

  // Filtragem de categorias: As rastreadas e as disponíveis para rastrear
  const categoriasRastreadas = categorias.filter(
    (c) => c.teto_gastos && c.teto_gastos > 0,
  );
  const categoriasDisponiveis = categorias.filter(
    (c) => !c.teto_gastos || c.teto_gastos === 0,
  );

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">
            {activeContext === "pessoal"
              ? "Planejamento Financeiro"
              : "Planejamento do Grupo"}
          </h1>
          <div className="shrink-0">
            <MonthSelector date={date} setDate={setDate} />
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Acompanhe suas metas, regras e limites orçamentários.
        </p>
      </div>

      <Tabs defaultValue="planejador" className="w-full">
        {/* MENU TABS */}
        <div className="w-full bg-muted/30 p-1 rounded-2xl mb-6 overflow-x-auto scrollbar-hide flex items-center shadow-inner">
          <TabsList className="flex h-auto w-max min-w-full bg-transparent justify-start sm:justify-center gap-1 p-0 m-0">
            <TabsTrigger
              value="planejador"
              className="rounded-xl whitespace-nowrap text-xs sm:text-sm px-4 py-2.5"
            >
              Planejador
            </TabsTrigger>
            <TabsTrigger
              value="analise"
              className="rounded-xl whitespace-nowrap text-xs sm:text-sm px-4 py-2.5"
            >
              Análise 50/30/20
            </TabsTrigger>
            <TabsTrigger
              value="limites"
              className="rounded-xl whitespace-nowrap text-xs sm:text-sm px-4 py-2.5"
            >
              Limites e Margens
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="planejador"
          className="space-y-8 mt-0 outline-none animate-in fade-in"
        >
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

            <div className="max-h-[260px] overflow-y-auto scrollbar-hide pr-1">
              <div className="flex flex-col">
                {receitas.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground bg-accent/30 rounded-xl border border-dashed">
                    Nenhuma renda base cadastrada para os cálculos.
                  </div>
                ) : (
                  receitas.map((item) => {
                    const userSeed =
                      activeContext === "grupo"
                        ? avatarMap[item.user_id]
                        : null;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-border/50 group last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 shrink-0 overflow-hidden">
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
        </TabsContent>

        <TabsContent
          value="analise"
          className="space-y-6 mt-0 outline-none animate-in fade-in"
        >
          <div>
            <h3 className="font-semibold text-lg tracking-tight flex items-center gap-2">
              <ChartPieIcon className="h-5 w-5 text-primary" /> Regra 50/30/20
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Como seu orçamento se comporta diante da regra de ouro financeira.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <HomeIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground leading-none">
                    50% Necessidades
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
                    Estourou o limite seguro!
                  </p>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                  <ShoppingBagIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground leading-none">
                    30% Desejos
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
                    Gastos variáveis passaram do ideal.
                  </p>
                )}
              </div>
            </div>

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
                    Metas
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
                {saldoFinalReal >= idealPoupanca ? (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    Excelente! Saldo livre cobre o ideal.
                  </p>
                ) : saldoFinalReal > 0 ? (
                  <p className="text-xs text-orange-500 mt-2 font-medium">
                    Atenção: Saldo atual ({formatMoney(saldoFinalReal)}) não
                    cobre o ideal.
                  </p>
                ) : (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    Sem saldo livre para poupar este mês.
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="limites"
          className="space-y-6 mt-0 outline-none animate-in fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg tracking-tight flex items-center gap-2">
                <ShieldExclamationIcon className="h-5 w-5 text-primary" />{" "}
                Limites por Categoria
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha categorias específicas para acompanhar e defina limites
                para não estourar o orçamento.
              </p>
            </div>

            <Button
              className="rounded-xl shrink-0"
              onClick={() => {
                setCategoriaEditando(null);
                setSelectedCategoriaId("");
                setNovoLimite("");
                setIsLimitModalOpen(true);
              }}
            >
              <PlusSolid className="w-4 h-4 mr-2" /> Adicionar Categoria
            </Button>
          </div>

          <div className="grid gap-4">
            {categoriasRastreadas.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center text-sm text-muted-foreground bg-accent/30 rounded-3xl border border-dashed">
                <ShieldExclamationIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-foreground">
                  Nenhum limite definido ainda.
                </p>
                <p className="text-xs mb-4">
                  Clique no botão acima para começar a monitorar seus gastos.
                </p>
              </div>
            ) : (
              categoriasRastreadas.map((cat) => {
                const nomeLimpo = cat.nome.trim();
                const limite = cat.teto_gastos || 0;
                const gasto = gastosCategorizados[nomeLimpo] || 0;

                const margem = limite - gasto;
                const percentualGasto = limite > 0 ? (gasto / limite) * 100 : 0;

                let progressColor = "bg-primary/20 [&>div]:bg-primary";
                let statusIcon = null;
                let statusText = "";
                let textColor = "text-muted-foreground";

                if (percentualGasto >= 100) {
                  progressColor = "bg-destructive/20 [&>div]:bg-destructive";
                  statusIcon = (
                    <ShieldExclamationIcon className="w-4 h-4 text-destructive" />
                  );
                  statusText = "Limite Estourado!";
                  textColor = "text-destructive";
                } else if (percentualGasto >= 80) {
                  progressColor = "bg-orange-500/20 [&>div]:bg-orange-500";
                  statusIcon = (
                    <ShieldExclamationIcon className="w-4 h-4 text-orange-500" />
                  );
                  statusText = "Atenção, quase no limite.";
                  textColor = "text-orange-500";
                } else {
                  progressColor = "bg-green-500/20 [&>div]:bg-green-500";
                  statusIcon = (
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  );
                  statusText = "Dentro do limite.";
                  textColor = "text-green-600";
                }

                return (
                  <div
                    key={cat.id}
                    className="bg-card border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-bold text-foreground text-lg leading-none">
                            {cat.nome}
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] uppercase font-bold tracking-wider rounded-full px-2"
                            onClick={() => {
                              setCategoriaEditando(cat);
                              setNovoLimite(String(limite));
                              setIsLimitModalOpen(true);
                            }}
                          >
                            <PencilSolid className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-muted-foreground">
                              Gasto:{" "}
                              <strong className="text-foreground">
                                {formatMoney(gasto)}
                              </strong>
                            </span>
                            <span className="text-muted-foreground">
                              Limite: {formatMoney(limite)}
                            </span>
                          </div>

                          <Progress
                            value={Math.min(percentualGasto, 100)}
                            className={cn("h-2.5", progressColor)}
                          />

                          <div className="flex items-center justify-between mt-2">
                            <div
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold",
                                textColor,
                              )}
                            >
                              {statusIcon} {statusText}
                            </div>
                            <span
                              className={cn(
                                "text-xs font-bold",
                                margem >= 0
                                  ? "text-green-600"
                                  : "text-destructive",
                              )}
                            >
                              {margem >= 0
                                ? `Margem: +${formatMoney(margem)}`
                                : `Passou: ${formatMoney(Math.abs(margem))}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL PARA DEFINIR LIMITE DE CATEGORIA */}
      <Dialog open={isLimitModalOpen} onOpenChange={setIsLimitModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {categoriaEditando ? "Editar Limite" : "Adicionar Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            {!categoriaEditando && (
              <div className="space-y-2">
                <Label>Qual categoria deseja monitorar?</Label>
                <Select
                  value={selectedCategoriaId}
                  onValueChange={setSelectedCategoriaId}
                >
                  <SelectTrigger className="h-12 bg-muted/20">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    {categoriasDisponiveis.length === 0 && (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Todas as categorias já estão monitoradas.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {categoriaEditando && (
              <p className="text-sm text-muted-foreground">
                Qual é o valor máximo que você deseja gastar com{" "}
                <strong>{categoriaEditando.nome}</strong> por mês?
              </p>
            )}

            <div className="space-y-2">
              <Label>Limite (R$)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={novoLimite}
                onChange={(e) => setNovoLimite(e.target.value)}
                className="text-xl py-6"
                autoFocus={!!categoriaEditando}
              />
              {categoriaEditando && (
                <p className="text-xs text-muted-foreground">
                  Deixe 0 para remover a categoria do monitoramento.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLimitModalOpen(false)}
              className="rounded-xl h-11"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveLimit}
              disabled={
                isSaving || (!categoriaEditando && !selectedCategoriaId)
              }
              className="rounded-xl h-11"
            >
              {isSaving ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
