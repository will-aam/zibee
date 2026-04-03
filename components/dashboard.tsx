"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
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

export default function Dashboard({ onNavigate }: DashboardProps) {
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const [mesSelecionado, setMesSelecionado] = useState("todos");
  const [loading, setLoading] = useState(true);

  // Totais e Dados
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesasFixas, setTotalDespesasFixas] = useState(0);
  const [categoriasChart, setCategoriasChart] = useState<any[]>([]);
  const [proximosVencimentos, setProximosVencimentos] = useState<any[]>([]);
  const [metaFixada, setMetaFixada] = useState<any>(null);
  const [progressoMeta, setProgressoMeta] = useState(0);

  // Dados brutos para o gráfico de evolução
  const [despesasBrutas, setDespesasBrutas] = useState<any[]>([]);

  // Filtro local do gráfico em linha (ex: "7D", "30D")
  const [periodoGrafico, setPeriodoGrafico] = useState<"7D" | "30D" | "ALL">(
    "30D",
  );

  const readRange = useCallback(() => {
    const from = localStorage.getItem(STORAGE_FROM_KEY);
    const to = localStorage.getItem(STORAGE_TO_KEY);
    if (from || to) return { from: from || null, to: to || null };
    const mes = localStorage.getItem(STORAGE_MONTH_KEY) || mesSelecionado;
    if (!mes || mes === "todos") return { from: null, to: null };
    return monthToRange(mes);
  }, [mesSelecionado]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { from, to } = readRange();

      let queryDespesas = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo", "Despesa");
      let queryReceitas = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo", "Receita")
        .eq("pago", true);
      let queryVencimentos = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .eq("pago", false)
        .eq("tipo", "Despesa")
        .order("data_vencimento", { ascending: true })
        .limit(5);

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
      ] = await Promise.all([queryDespesas, queryReceitas, queryVencimentos]);

      setDespesasBrutas(lancamentosData || []);

      const totalDesp =
        lancamentosData?.reduce((acc, curr) => acc + Number(curr.valor), 0) ||
        0;
      setTotalDespesas(totalDesp);

      const totalRec =
        receitasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      setTotalReceitas(totalRec);

      const categoriasMap = lancamentosData?.reduce((acc: any, curr) => {
        const key = curr.categoria || "Sem categoria";
        acc[key] = (acc[key] || 0) + Number(curr.valor);
        return acc;
      }, {});
      setCategoriasChart(
        Object.entries(categoriasMap || {})
          .map(([name, value]) => ({ name, value: Number(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      );

      setProximosVencimentos(vencimentosData || []);

      const { data: fixasData } = await supabase
        .from("despesas_fixas")
        .select("valor")
        .eq("user_id", userId);
      setTotalDespesasFixas(
        fixasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0,
      );

      const { data: metaData } = await supabase
        .from("metas")
        .select("*")
        .eq("user_id", userId)
        .eq("fixada", true)
        .maybeSingle();
      if (metaData) {
        setMetaFixada(metaData);
        const totalMeta =
          Number(metaData.valor_objetivo) || Number(metaData.valor_total) || 1;
        const atualMeta =
          Number(metaData.valor_atual) ||
          Number(metaData.valor_depositado) ||
          0;
        setProgressoMeta(Math.min((atualMeta / totalMeta) * 100, 100));
      } else {
        setMetaFixada(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [readRange, userId]);

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
      const dataStr = new Date(curr.data_vencimento).toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "2-digit" },
      );
      acc[dataStr] = (acc[dataStr] || 0) + Number(curr.valor);
      return acc;
    }, {});

    return Object.keys(agrupado)
      .sort()
      .map((data) => ({
        data,
        valor: agrupado[data],
      }));
  }, [despesasBrutas, periodoGrafico]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 bg-background">
      {/* SEÇÃO 1: RESUMO FINANCEIRO - APENAS DESKTOP */}
      <section className="hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-foreground/80">
          Visão Geral
        </h2>
        <div className="grid gap-6 grid-cols-3">
          <div className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
              <TrendingUp className="h-4 w-4" /> Entradas Confirmadas
            </div>
            <div className="text-3xl font-light text-foreground">
              {formatMoney(totalReceitas)}
            </div>
          </div>

          <div className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-red-500 mb-1">
              <TrendingDown className="h-4 w-4" /> Gastos Variáveis
            </div>
            <div className="text-3xl font-light text-foreground">
              {formatMoney(totalDespesas)}
            </div>
          </div>

          <div
            onClick={() => onNavigate && onNavigate("despesas_fixas")}
            className="pb-4 border-b border-border/50 cursor-pointer hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
              <Wallet className="h-4 w-4" /> Contas Fixas Mensais
            </div>
            <div className="text-3xl font-light text-foreground">
              {formatMoney(totalDespesasFixas)}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: EVOLUÇÃO DAS DESPESAS - APENAS DESKTOP */}
      <section className="pt-4 hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground/80">
            Evolução das Despesas
          </h2>
          <div className="flex bg-muted rounded-md p-1">
            {(["7D", "30D", "ALL"] as const).map((periodo) => (
              <button
                key={periodo}
                onClick={() => setPeriodoGrafico(periodo)}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                  periodoGrafico === periodo
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
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
                  stroke="rgba(255,255,255,0.1)"
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
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    backgroundColor: "var(--background)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f97316" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados suficientes para o período.
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 3: CATEGORIAS E PRÓXIMOS VENCIMENTOS - MOBILE E DESKTOP */}
      <div className="grid gap-12 md:grid-cols-2 pt-4">
        {/* Onde estou gastando? */}
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
                    <span className="text-muted-foreground">
                      {formatMoney(item.value)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
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
              <div className="text-sm text-muted-foreground">
                Sem gastos neste período.
              </div>
            )}
          </div>
        </section>

        {/* Contas a Pagar */}
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
            <AlertCircle className="h-5 w-5 text-blue-500" /> Próximos
            Vencimentos
          </h2>
          <div className="space-y-0">
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
                    className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors -mx-2 px-2 rounded-md"
                  >
                    <div className="space-y-1">
                      <p className="font-medium leading-none text-sm text-foreground">
                        {item.descricao}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={`flex items-center gap-1 ${isAtrasado ? "text-red-500 font-medium" : ""}`}
                        >
                          <Calendar className="h-3 w-3" />
                          {dataVenc.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium block text-sm text-foreground">
                        {formatMoney(item.valor)}
                      </span>
                      {isAtrasado && (
                        <span className="text-[10px] text-red-500 uppercase font-bold">
                          Vencido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground">
                Tudo pago! Nenhuma conta pendente próxima.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* META FIXADA */}
      {metaFixada && (
        <section
          onClick={() => onNavigate && onNavigate("metas")}
          className="mt-8 pt-6 border-t border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
              <Target className="h-4 w-4 text-primary" /> Meta:{" "}
              {metaFixada.nome}
            </h2>
            <span className="text-sm font-medium text-foreground">
              {progressoMeta.toFixed(1)}%
            </span>
          </div>
          <Progress value={progressoMeta} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
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
