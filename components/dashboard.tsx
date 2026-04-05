"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext"; // <-- Cérebro Global
import { Progress } from "@/components/ui/progress";
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  Target,
  Loader2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const STORAGE_MONTH_KEY = "dashboardFiltroMes";
const STORAGE_FROM_KEY = "dashboardFiltroDe";
const STORAGE_TO_KEY = "dashboardFiltroAte";
const FILTER_EVENT = "dashboard:filter-changed";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}
function monthToRange(anoMes: string) {
  const [ano, mes] = anoMes.split("-");
  const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
  return { from: `${anoMes}-01`, to: `${anoMes}-${pad2(ultimoDia)}` };
}

// CACHE EM MEMÓRIA ATUALIZADO PARA SUPORTAR CONTEXTO (PESSOAL / GRUPO)
const dashboardCache = {
  dataByRange: {} as Record<string, any>,
  totalDespesasFixas: {} as Record<string, number>,
  metaFixada: {} as Record<string, any | null>,
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace(); // <-- Puxando o contexto

  const [mesSelecionado, setMesSelecionado] = useState("todos");

  const readRange = useCallback(() => {
    if (typeof window === "undefined")
      return { from: null, to: null, key: `all_${activeContext}` };

    const from = localStorage.getItem(STORAGE_FROM_KEY);
    const to = localStorage.getItem(STORAGE_TO_KEY);
    if (from || to)
      return {
        from: from || null,
        to: to || null,
        key: `${from}_${to}_${activeContext}`,
      };

    const mes = localStorage.getItem(STORAGE_MONTH_KEY) || mesSelecionado;
    if (!mes || mes === "todos")
      return { from: null, to: null, key: `all_${activeContext}` };

    const range = monthToRange(mes);
    return { ...range, key: `${range.from}_${range.to}_${activeContext}` };
  }, [mesSelecionado, activeContext]);

  const initialRange =
    typeof window !== "undefined"
      ? readRange()
      : { key: `all_${activeContext}` };
  const cachedData = dashboardCache.dataByRange[initialRange.key];

  const [totalDespesas, setTotalDespesas] = useState(
    cachedData?.totalDespesas || 0,
  );
  const [totalReceitas, setTotalReceitas] = useState(
    cachedData?.totalReceitas || 0,
  );
  const [categoriasChart, setCategoriasChart] = useState<any[]>(
    cachedData?.categoriasChart || [],
  );
  const [proximosVencimentos, setProximosVencimentos] = useState<any[]>(
    cachedData?.proximosVencimentos || [],
  );
  const [despesasBrutas, setDespesasBrutas] = useState<any[]>(
    cachedData?.despesasBrutas || [],
  );

  const [totalDespesasFixas, setTotalDespesasFixas] = useState(
    dashboardCache.totalDespesasFixas[activeContext] || 0,
  );
  const [metaFixada, setMetaFixada] = useState<any>(
    dashboardCache.metaFixada[activeContext] || null,
  );

  const [loading, setLoading] = useState(!cachedData);
  const [periodoGrafico, setPeriodoGrafico] = useState<"7D" | "30D" | "ALL">(
    "30D",
  );

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      const { from, to, key } = readRange();
      if (!dashboardCache.dataByRange[key]) setLoading(true);

      // BUSCAR GRUPO ID (SE FOR MODO GRUPO)
      let currentGroupId = null;
      if (activeContext === "grupo") {
        const { data: myGroup } = await supabase
          .from("grupos")
          .select("id")
          .eq("criador_id", userId)
          .maybeSingle();
        if (myGroup) currentGroupId = myGroup.id;
        else {
          const { data: membership } = await supabase
            .from("membros_grupo")
            .select("grupo_id")
            .eq("user_id", userId)
            .eq("status", "Aceito")
            .maybeSingle();
          if (membership) currentGroupId = membership.grupo_id;
        }
        if (!currentGroupId) {
          setLoading(false);
          return;
        } // Se não achou grupo, para.
      }

      let queryDespesas = supabase
        .from("lancamentos")
        .select("*")
        .eq("tipo", "Despesa");
      let queryReceitas = supabase
        .from("lancamentos")
        .select("*")
        .eq("tipo", "Receita")
        .eq("pago", true);
      let queryVencimentos = supabase
        .from("lancamentos")
        .select("*")
        .eq("pago", false)
        .eq("tipo", "Despesa")
        .order("data_vencimento", { ascending: true })
        .limit(5);

      // FILTROS MAGICOS DE CONTEXTO
      if (activeContext === "grupo" && currentGroupId) {
        queryDespesas = queryDespesas.eq("grupo_id", currentGroupId);
        queryReceitas = queryReceitas.eq("grupo_id", currentGroupId);
        queryVencimentos = queryVencimentos.eq("grupo_id", currentGroupId);
      } else {
        queryDespesas = queryDespesas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryReceitas = queryReceitas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryVencimentos = queryVencimentos
          .eq("user_id", userId)
          .is("grupo_id", null);
      }

      if (from) {
        queryDespesas = queryDespesas.gte("data_vencimento", from);
        queryReceitas = queryReceitas.gte("data_vencimento", from);
        queryVencimentos = queryVencimentos.gte("data_vencimento", from);
      }
      if (to) {
        queryDespesas = queryDespesas.lte("data_vencimento", to);
        queryReceitas = queryReceitas.lte("data_vencimento", to);
        queryVencimentos = queryVencimentos.lte("data_vencimento", to);
      }

      const [
        { data: lancamentosData },
        { data: receitasData },
        { data: vencimentosData },
        { data: fixasData },
        { data: metaData },
      ] = await Promise.all([
        queryDespesas,
        queryReceitas,
        queryVencimentos,
        activeContext === "pessoal" &&
        dashboardCache.totalDespesasFixas[activeContext] === undefined
          ? supabase
              .from("despesas_fixas")
              .select("valor")
              .eq("user_id", userId)
          : Promise.resolve({ data: null }),
        activeContext === "pessoal" &&
        dashboardCache.metaFixada[activeContext] === undefined
          ? supabase
              .from("metas")
              .select("*")
              .eq("user_id", userId)
              .eq("fixada", true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const fetchedDespesasBrutas = lancamentosData || [];
      const fetchedTotalDesp =
        lancamentosData?.reduce((acc, curr) => acc + Number(curr.valor), 0) ||
        0;
      const fetchedTotalRec =
        receitasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;

      const categoriasMap = lancamentosData?.reduce((acc: any, curr) => {
        const k = curr.categoria || "Sem categoria";
        acc[k] = (acc[k] || 0) + Number(curr.valor);
        return acc;
      }, {});

      const fetchedCategoriasChart = Object.entries(categoriasMap || {})
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const fetchedVencimentos = vencimentosData || [];

      setDespesasBrutas(fetchedDespesasBrutas);
      setTotalDespesas(fetchedTotalDesp);
      setTotalReceitas(fetchedTotalRec);
      setCategoriasChart(fetchedCategoriasChart);
      setProximosVencimentos(fetchedVencimentos);

      dashboardCache.dataByRange[key] = {
        totalDespesas: fetchedTotalDesp,
        totalReceitas: fetchedTotalRec,
        categoriasChart: fetchedCategoriasChart,
        proximosVencimentos: fetchedVencimentos,
        despesasBrutas: fetchedDespesasBrutas,
      };

      if (activeContext === "pessoal") {
        if (fixasData !== null) {
          const totalFixas = fixasData.reduce(
            (acc, curr) => acc + Number(curr.valor),
            0,
          );
          setTotalDespesasFixas(totalFixas);
          dashboardCache.totalDespesasFixas[activeContext] = totalFixas;
        }
        if (metaData !== null) {
          setMetaFixada(metaData);
          dashboardCache.metaFixada[activeContext] = metaData;
        }
      } else {
        setTotalDespesasFixas(0);
        setMetaFixada(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [readRange, userId, activeContext]);

  useEffect(() => {
    if (userId) fetchDashboardData();
  }, [fetchDashboardData, userId]);

  useEffect(() => {
    const current =
      localStorage.getItem(STORAGE_MONTH_KEY) || getCurrentYearMonth();
    setMesSelecionado(current);
    function onFilterChanged() {
      fetchDashboardData();
    }
    window.addEventListener(FILTER_EVENT, onFilterChanged);
    return () => window.removeEventListener(FILTER_EVENT, onFilterChanged);
  }, [fetchDashboardData]);

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const progressoMeta = useMemo(() => {
    if (!metaFixada) return 0;
    const totalMeta =
      Number(metaFixada.valor_objetivo) || Number(metaFixada.valor_total) || 1;
    const atualMeta =
      Number(metaFixada.valor_atual) ||
      Number(metaFixada.valor_depositado) ||
      0;
    return Math.min((atualMeta / totalMeta) * 100, 100);
  }, [metaFixada]);

  const dadosGraficoEvolucao = useMemo(() => {
    const hoje = new Date();
    const diasFiltrar =
      periodoGrafico === "7D" ? 7 : periodoGrafico === "30D" ? 30 : 999;
    const dataLimite = new Date(
      hoje.getTime() - diasFiltrar * 24 * 60 * 60 * 1000,
    );
    const filtrados = despesasBrutas.filter(
      (d) => new Date(d.data_vencimento) >= dataLimite,
    );
    const agrupado = filtrados.reduce((acc: any, curr) => {
      const d = new Date(curr.data_vencimento);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const dataStr = d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      acc[dataStr] = (acc[dataStr] || 0) + Number(curr.valor);
      return acc;
    }, {});
    return Object.keys(agrupado)
      .sort()
      .map((data) => ({ data, valor: agrupado[data] }));
  }, [despesasBrutas, periodoGrafico]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-10 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      {/* SEÇÃO 1: RESUMO FINANCEIRO - APENAS DESKTOP */}
      <section className="hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-foreground/80">
          Visão Geral {activeContext === "grupo" && "(Casa)"}
        </h2>
        <div className="grid gap-6 grid-cols-3">
          <div className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
              <TrendingUp className="h-4 w-4" /> Entradas Confirmadas
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {formatMoney(totalReceitas)}
            </div>
          </div>
          <div className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
              <TrendingDown className="h-4 w-4" /> Gastos Variáveis
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {formatMoney(totalDespesas)}
            </div>
          </div>
          {activeContext === "pessoal" && (
            <div
              onClick={() => onNavigate && onNavigate("despesas_fixas")}
              className="pb-4 border-b border-border/50 cursor-pointer hover:opacity-70 transition-opacity group"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1 group-hover:text-blue-600 transition-colors">
                <Wallet className="h-4 w-4" /> Contas Fixas Mensais
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {formatMoney(totalDespesasFixas)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 2: EVOLUÇÃO DAS DESPESAS - APENAS DESKTOP */}
      <section className="pt-4 hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground/80">
            Evolução das Despesas
          </h2>
          <div className="flex bg-muted/50 rounded-lg p-1 border border-border/30">
            {(["7D", "30D", "ALL"] as const).map((periodo) => (
              <button
                key={periodo}
                onClick={() => setPeriodoGrafico(periodo)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${periodoGrafico === periodo ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {periodo === "ALL" ? "Tudo" : periodo}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[250px] w-full">
          {dadosGraficoEvolucao.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={1}
            >
              <LineChart
                data={dadosGraficoEvolucao}
                margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border) / 0.4)"
                />
                <XAxis
                  dataKey="data"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `R$${val}`}
                  tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatMoney(value),
                    "Despesas",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl bg-accent/20">
              Sem dados suficientes para o período.
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 3: CATEGORIAS E PRÓXIMOS VENCIMENTOS */}
      <div className="grid gap-12 md:grid-cols-2 pt-4">
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
            <TrendingDown className="h-5 w-5 text-orange-500" /> Onde estou
            gastando?
          </h2>
          <div className="space-y-5">
            {categoriasChart.length > 0 ? (
              categoriasChart.map((item, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {formatMoney(item.value)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-700 ease-out"
                      style={{
                        width:
                          totalDespesas > 0
                            ? `${(item.value / totalDespesas) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground bg-accent/30 p-4 rounded-xl border border-dashed">
                Sem gastos registrados neste período.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
            <AlertCircle className="h-5 w-5 text-blue-500" /> Próximos
            Vencimentos
          </h2>
          <div className="space-y-1">
            {proximosVencimentos.length > 0 ? (
              proximosVencimentos.map((item) => {
                const dataVenc = new Date(item.data_vencimento);
                dataVenc.setMinutes(
                  dataVenc.getMinutes() + dataVenc.getTimezoneOffset(),
                );
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const isAtrasado = dataVenc < hoje;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors rounded-xl px-2"
                  >
                    <div className="space-y-1.5">
                      <p className="font-medium leading-none text-sm text-foreground">
                        {item.descricao}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={`flex items-center gap-1 ${isAtrasado ? "text-destructive font-semibold" : ""}`}
                        >
                          <Calendar className="h-3 w-3" />
                          {dataVenc.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold block text-sm text-foreground">
                        {formatMoney(item.valor)}
                      </span>
                      {isAtrasado && (
                        <span className="text-[10px] text-destructive uppercase font-bold tracking-wider">
                          Vencido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground bg-accent/30 p-4 rounded-xl border border-dashed">
                Tudo pago! Nenhuma conta pendente próxima.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* META FIXADA (Só no modo pessoal) */}
      {activeContext === "pessoal" && metaFixada && (
        <section
          onClick={() => onNavigate && onNavigate("metas")}
          className="mt-8 pt-6 border-t border-border/50 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 group-hover:text-primary transition-colors">
              <Target className="h-4 w-4 text-primary" /> Meta:{" "}
              {metaFixada.nome}
            </h2>
            <span className="text-sm font-bold text-foreground">
              {progressoMeta.toFixed(1)}%
            </span>
          </div>
          <Progress value={progressoMeta} className="h-2.5 mb-3 bg-secondary" />
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>
              {formatMoney(
                Number(
                  metaFixada.valor_atual || metaFixada.valor_depositado || 0,
                ),
              )}
            </span>
            <span>
              Objetivo:{" "}
              {formatMoney(
                Number(
                  metaFixada.valor_objetivo || metaFixada.valor_total || 0,
                ),
              )}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
