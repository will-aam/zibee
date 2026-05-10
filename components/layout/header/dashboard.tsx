"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

// IMPORTANDO OS COMPONENTES
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { ExpenseEvolutionChart } from "@/components/dashboard/ExpenseEvolutionChart";
import { ExpenseCategories } from "@/components/dashboard/ExpenseCategories";
import { UpcomingBills } from "@/components/dashboard/UpcomingBills";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { MonthTurnoverModal } from "@/components/dashboard/MonthTurnoverModal";

import {
  FireIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";

import {
  ChartPieIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const STORAGE_MONTH_KEY = "dashboardFiltroMes";
const STORAGE_FROM_KEY = "dashboardFiltroDe";
const STORAGE_TO_KEY = "dashboardFiltroAte";
const FILTER_EVENT = "dashboard:filter-changed";
const PRIVACY_STORAGE_KEY = "mobile-dashboard-values-hidden";

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

const dashboardCache = {
  dataByRange: {} as Record<string, any>,
  totalDespesasFixas: {} as Record<string, number>,
  metaFixada: {} as Record<string, any | null>,
  listaFixas: {} as Record<string, any[]>,
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [mesSelecionado, setMesSelecionado] = useState("todos");
  const [hidden, setHidden] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const loadPrivacyState = useCallback(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      setHidden(saved === "true");
    } catch {}
  }, []);

  useEffect(() => {
    loadPrivacyState();
    window.addEventListener("zibee:privacy-toggled", loadPrivacyState);
    return () =>
      window.removeEventListener("zibee:privacy-toggled", loadPrivacyState);
  }, [loadPrivacyState]);

  const toggleHidden = () => {
    const newVal = !hidden;
    setHidden(newVal);
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, String(newVal));
      window.dispatchEvent(new Event("zibee:privacy-toggled"));
    } catch {}
  };

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

  // NOVO ESTADO: Guarda apenas o valor das fixas que já venceram no tempo
  const [totalFixasPagas, setTotalFixasPagas] = useState(0);

  const [listaFixas, setListaFixas] = useState<any[]>(
    dashboardCache.listaFixas[activeContext] || [],
  );
  const [metaFixada, setMetaFixada] = useState<any>(
    dashboardCache.metaFixada[activeContext] || null,
  );

  const [categoriasComLimite, setCategoriasComLimite] = useState<any[]>([]);

  const [loading, setLoading] = useState(!cachedData);
  const [periodoGrafico, setPeriodoGrafico] = useState<"7D" | "30D" | "ALL">(
    "30D",
  );

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    try {
      const { from, to, key } = readRange();
      if (!dashboardCache.dataByRange[key]) setLoading(true);

      let groupId = null;

      if (activeContext === "grupo") {
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

        if (!groupId) {
          setLoading(false);
          return;
        }
      }

      setCurrentGroupId(groupId);

      let queryDespesasVariaveis = supabase
        .from("lancamentos")
        .select("*")
        .eq("tipo", "Despesa")
        .is("conta_fixa_id", null);

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
        .is("cartao_id", null)
        .order("data_vencimento", { ascending: true })
        .limit(5);

      let queryFixasDashboard = supabase
        .from("despesas_fixas")
        .select("*")
        .eq("status", "ativo")
        .order("dia_vencimento", { ascending: true });

      let queryCartoes = supabase.from("cartoes_credito").select("*");

      let queryCategorias = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", userId);

      if (activeContext === "grupo" && groupId) {
        queryDespesasVariaveis = queryDespesasVariaveis.eq("grupo_id", groupId);
        queryReceitas = queryReceitas.eq("grupo_id", groupId);
        queryVencimentos = queryVencimentos.eq("grupo_id", groupId);
        queryFixasDashboard = queryFixasDashboard.eq("grupo_id", groupId);
        queryCartoes = queryCartoes.eq("grupo_id", groupId);
      } else {
        queryDespesasVariaveis = queryDespesasVariaveis
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryReceitas = queryReceitas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryVencimentos = queryVencimentos
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryFixasDashboard = queryFixasDashboard
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryCartoes = queryCartoes.eq("user_id", userId).is("grupo_id", null);
      }

      if (from) {
        queryDespesasVariaveis = queryDespesasVariaveis.gte(
          "data_vencimento",
          from,
        );
        queryReceitas = queryReceitas.gte("data_vencimento", from);
        queryVencimentos = queryVencimentos.gte("data_vencimento", from);
      }
      if (to) {
        queryDespesasVariaveis = queryDespesasVariaveis.lte(
          "data_vencimento",
          to,
        );
        queryReceitas = queryReceitas.lte("data_vencimento", to);
        queryVencimentos = queryVencimentos.lte("data_vencimento", to);
      }

      const [
        { data: variaveisData },
        { data: receitasData },
        { data: vencimentosData },
        { data: fixasData },
        { data: metaData },
        { data: cartoesData },
        { data: categoriasData },
      ] = await Promise.all([
        queryDespesasVariaveis,
        queryReceitas,
        queryVencimentos,
        queryFixasDashboard,
        activeContext === "pessoal" &&
        dashboardCache.metaFixada[activeContext] === undefined
          ? supabase
              .from("metas")
              .select("*")
              .eq("user_id", userId)
              .eq("fixada", true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        queryCartoes,
        queryCategorias,
      ]);

      const fetchedDespesasBrutas = variaveisData || [];
      const fetchedTotalVariaveis =
        variaveisData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const fetchedTotalRec =
        receitasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;

      const dadosFixasValidos = fixasData || [];
      const fetchedTotalFixas =
        dadosFixasValidos.reduce((acc, curr) => acc + Number(curr.valor), 0) ||
        0;

      // =========================================================
      // A MÁGICA DO FILTRO DO TEMPO ACONTECE AQUI
      // =========================================================
      const today = new Date();
      const currentMonthStr = getCurrentYearMonth(); // Ex: "2026-05"
      // Pega o mês que o usuário está olhando no filtro
      const viewedMonthStr = from ? from.substring(0, 7) : currentMonthStr;

      let fetchedTotalFixasPagas = 0;

      if (viewedMonthStr < currentMonthStr) {
        // Se estiver olhando um mês passado (ex: Abril), TODAS as contas já venceram
        fetchedTotalFixasPagas = fetchedTotalFixas;
      } else if (viewedMonthStr > currentMonthStr) {
        // Se estiver olhando um mês futuro (ex: Junho), NENHUMA conta venceu ainda
        fetchedTotalFixasPagas = 0;
      } else {
        // Se estiver no mês atual (Maio), checa o dia de hoje contra o dia do vencimento
        const currentDay = today.getDate();
        fetchedTotalFixasPagas = dadosFixasValidos.reduce((acc, curr) => {
          if (Number(curr.dia_vencimento) <= currentDay) {
            return acc + Number(curr.valor);
          }
          return acc;
        }, 0);
      }
      // =========================================================

      const todosOsGastos = [...fetchedDespesasBrutas, ...dadosFixasValidos];

      const categoriasMap = todosOsGastos.reduce((acc: any, curr) => {
        const k = curr.categoria || "Sem categoria";
        if (!acc[k]) acc[k] = { total: 0, items: [] };
        acc[k].total += Number(curr.valor);
        acc[k].items.push(curr);
        return acc;
      }, {});

      const fetchedCategoriasChart = Object.entries(categoriasMap || {})
        .map(([name, data]: any) => ({
          name,
          value: Number(data.total),
          items: data.items.sort(
            (a: any, b: any) =>
              new Date(a.data_vencimento || a.dia_vencimento).getTime() -
              new Date(b.data_vencimento || b.dia_vencimento).getTime(),
          ),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      let fetchedVencimentos = vencimentosData || [];

      if (cartoesData && cartoesData.length > 0) {
        const faturasInjetaveis: any[] = [];

        cartoesData.forEach((cartao) => {
          const comprasPendentesCartao = todosOsGastos.filter(
            (d) => d.cartao_id === cartao.id && !d.pago,
          );

          if (comprasPendentesCartao.length === 0) return;

          const faturasAgrupadas: Record<string, number> = {};

          comprasPendentesCartao.forEach((compra) => {
            let dataBaseStr = compra.data_vencimento;

            if (!dataBaseStr) {
              const [anoF, mesF] = (
                readRange().from || getCurrentYearMonth() + "-01"
              ).split("-");
              dataBaseStr = `${anoF}-${mesF}-${String(compra.dia_vencimento).padStart(2, "0")}`;
            }

            const dataCompra = new Date(dataBaseStr + "T12:00:00");
            if (isNaN(dataCompra.getTime())) return;

            let mesFatura = dataCompra.getMonth();
            let anoFatura = dataCompra.getFullYear();

            if (dataCompra.getDate() > cartao.dia_fechamento) mesFatura++;
            if (cartao.dia_vencimento <= cartao.dia_fechamento) mesFatura++;

            if (mesFatura > 11) {
              mesFatura = 0;
              anoFatura++;
            }

            const dataVencimentoReal = new Date(
              anoFatura,
              mesFatura,
              cartao.dia_vencimento,
              12,
              0,
              0,
            );

            const chaveIso = dataVencimentoReal.toISOString();

            if (!faturasAgrupadas[chaveIso]) faturasAgrupadas[chaveIso] = 0;
            faturasAgrupadas[chaveIso] += Number(compra.valor);
          });

          Object.entries(faturasAgrupadas).forEach(([dataIso, totalValor]) => {
            faturasInjetaveis.push({
              id: `fatura-${cartao.id}-${dataIso}`,
              descricao: `Fatura ${cartao.nome}`,
              valor: totalValor,
              data_vencimento: dataIso,
              pago: false,
              isFatura: true,
            });
          });
        });

        fetchedVencimentos = [...fetchedVencimentos, ...faturasInjetaveis]
          .sort(
            (a, b) =>
              new Date(a.data_vencimento).getTime() -
              new Date(b.data_vencimento).getTime(),
          )
          .slice(0, 5);
      }

      const fixasPagasNoMes = new Set(
        fetchedDespesasBrutas
          .filter((d) => d.conta_fixa_id != null)
          .map((d) => d.conta_fixa_id),
      );

      const gastosParaLimitesMap: Record<string, { total: number }> = {};

      fetchedDespesasBrutas.forEach((item) => {
        const cat = (item.categoria || "Sem categoria").trim();
        if (!gastosParaLimitesMap[cat])
          gastosParaLimitesMap[cat] = { total: 0 };
        gastosParaLimitesMap[cat].total += Number(item.valor);
      });

      dadosFixasValidos.forEach((fixa) => {
        if (!fixasPagasNoMes.has(fixa.id)) {
          const cat = (fixa.categoria || "Sem categoria").trim();
          if (!gastosParaLimitesMap[cat])
            gastosParaLimitesMap[cat] = { total: 0 };
          gastosParaLimitesMap[cat].total += Number(fixa.valor);
        }
      });

      const fetchedCategoriasLimite = (categoriasData || [])
        .filter((c) => c.teto_gastos && Number(c.teto_gastos) > 0)
        .map((c) => {
          const gastoAtual = gastosParaLimitesMap[c.nome.trim()]?.total || 0;
          return {
            ...c,
            gasto: gastoAtual,
          };
        })
        .sort((a, b) => Number(b.teto_gastos) - Number(a.teto_gastos));

      setDespesasBrutas(fetchedDespesasBrutas);
      setTotalDespesas(fetchedTotalVariaveis);
      setTotalReceitas(fetchedTotalRec);
      setCategoriasChart(fetchedCategoriasChart);
      setProximosVencimentos(fetchedVencimentos);
      setTotalDespesasFixas(fetchedTotalFixas);
      setTotalFixasPagas(fetchedTotalFixasPagas); // NOVO: Atualiza o estado
      setListaFixas(dadosFixasValidos);
      setCategoriasComLimite(fetchedCategoriasLimite);

      dashboardCache.dataByRange[key] = {
        totalDespesas: fetchedTotalVariaveis,
        totalReceitas: fetchedTotalRec,
        categoriasChart: fetchedCategoriasChart,
        proximosVencimentos: fetchedVencimentos,
        despesasBrutas: fetchedDespesasBrutas,
      };

      if (activeContext === "pessoal") {
        dashboardCache.totalDespesasFixas[activeContext] = fetchedTotalFixas;
        dashboardCache.listaFixas[activeContext] = dadosFixasValidos;

        if (metaData !== null) {
          setMetaFixada(metaData);
          dashboardCache.metaFixada[activeContext] = metaData;
        }
      } else {
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

    window.addEventListener(FILTER_EVENT, fetchDashboardData);
    return () => window.removeEventListener(FILTER_EVENT, fetchDashboardData);
  }, [fetchDashboardData]);

  const togglePagoLancamento = async (
    lancamentoId: number,
    currentStatus: boolean,
  ) => {
    try {
      const novoStatus = !currentStatus;

      let query = supabase
        .from("lancamentos")
        .update({ pago: novoStatus })
        .eq("id", lancamentoId);

      if (activeContext === "grupo" && currentGroupId)
        query = query.eq("grupo_id", currentGroupId);
      else query = query.eq("user_id", userId).is("grupo_id", null);

      await query;
      fetchDashboardData();
      window.dispatchEvent(new Event("zibee:transaction-changed"));
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
    }
  };

  const formatMoney = useCallback(
    (val: number) => {
      if (hidden) return "R$ ****";
      return val.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    },
    [hidden],
  );

  const saldoGeral = useMemo(() => {
    if (!totalReceitas || totalReceitas <= 0) return 0;
    return totalReceitas - totalDespesas - totalDespesasFixas;
  }, [totalReceitas, totalDespesas, totalDespesasFixas]);

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

  const totalCategorizado = categoriasComLimite.reduce(
    (acc, cat) => acc + Number(cat.teto_gastos),
    0,
  );

  const categoryColors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#a855f7",
    "#f59e0b",
    "#ec4899",
    "#14b8a6",
  ];

  const renderCategoryBudgets = () => {
    const totalLimite = categoriasComLimite.reduce(
      (acc, cat) => acc + Number(cat.teto_gastos),
      0,
    );
    const totalGastoLimites = categoriasComLimite.reduce(
      (acc, cat) => acc + (cat.gasto || 0),
      0,
    );

    const porcentagemUsoGeral =
      totalLimite > 0
        ? Math.min((totalGastoLimites / totalLimite) * 100, 100)
        : 0;

    return (
      <section className="pt-6 border-t border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
            <ChartPieIcon className="h-4 w-4 text-primary" /> Planejamento de
            Gastos
          </h2>
          {categoriasComLimite.length > 0 && (
            <button
              onClick={() => onNavigate && onNavigate("receitas")}
              className="text-xs text-primary hover:underline font-medium"
            >
              Gerenciar Limites
            </button>
          )}
        </div>

        {categoriasComLimite.length === 0 ? (
          <div className="bg-muted/20 border border-dashed rounded-3xl p-8 text-center flex flex-col items-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <ShieldExclamationIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">
              Crie um planejamento
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Defina limites por categoria (ex: 30% Moradia) e acompanhe seu
              progresso para não estourar o orçamento.
            </p>
            <Button
              onClick={() => onNavigate && onNavigate("receitas")}
              className="rounded-xl px-6 h-11 shadow-sm"
            >
              Configurar Limites
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  Gasto vs Planejado
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground">
                    {formatMoney(totalGastoLimites)}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground font-medium">
                    / {formatMoney(totalLimite)}
                  </p>
                </div>
              </div>

              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                <svg
                  viewBox="0 0 36 36"
                  className="w-full h-full transform -rotate-90"
                >
                  <path
                    className="text-muted/30"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className={`${totalGastoLimites > totalLimite ? "text-red-500" : "text-primary"} transition-all duration-500`}
                    strokeDasharray={`${porcentagemUsoGeral}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-[11px] sm:text-xs font-bold ${totalGastoLimites > totalLimite ? "text-red-500" : ""}`}
                  >
                    {porcentagemUsoGeral.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {categoriasComLimite.map((cat, idx) => {
                const color = categoryColors[idx % categoryColors.length];
                const gasto = cat.gasto || 0;
                const limite = Number(cat.teto_gastos);
                const pct =
                  limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;
                const isOverBudget = gasto > limite;

                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-sm font-semibold">{cat.nome}</p>
                      </div>
                      <div className="text-right flex items-baseline gap-1">
                        <span
                          className={`text-sm font-bold ${isOverBudget ? "text-red-500" : "text-foreground"}`}
                        >
                          {formatMoney(gasto)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          / {formatMoney(limite)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isOverBudget ? "#ef4444" : color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-10 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <MonthTurnoverModal />
      <section className="hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground/80">
            Visão Geral {activeContext === "grupo" && "(Grupo)"}
          </h2>
          <button
            onClick={toggleHidden}
            className="p-2 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground active:scale-95"
            title={hidden ? "Mostrar valores" : "Ocultar valores"}
          >
            {hidden ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* MÁGICA FINAL: Passando a nova variável totalFixasPagas */}
        <DashboardSummaryCards
          totalReceitas={totalReceitas}
          totalVariaveis={totalDespesas}
          totalFixas={totalDespesasFixas}
          listaFixas={listaFixas}
          saldoGeral={saldoGeral}
          hidden={hidden}
          formatMoney={formatMoney}
          activeContext={activeContext}
          totalFixasPagas={totalFixasPagas}
        />
      </section>

      <div className="space-y-8 md:hidden">
        <ExpenseCategories
          categoriasChart={categoriasChart}
          expandedCategory={expandedCategory}
          setExpandedCategory={setExpandedCategory}
          totalDespesas={totalDespesas}
          totalDespesasFixas={totalDespesasFixas}
          formatMoney={formatMoney}
          togglePagoLancamento={togglePagoLancamento}
        />

        <UpcomingBills
          proximosVencimentos={proximosVencimentos}
          formatMoney={formatMoney}
        />

        <PaymentMethodsChart
          despesas={despesasBrutas}
          fixas={listaFixas}
          formatMoney={formatMoney}
          hidden={hidden}
        />

        {activeContext === "pessoal" && metaFixada && (
          <section
            onClick={() => onNavigate && onNavigate("metas")}
            className="mt-2 pt-6 border-t border-border/50 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 group-hover:text-primary transition-colors">
                <FireIcon className="h-4 w-4 text-primary" /> Meta:{" "}
                {metaFixada.nome}
              </h2>
              <span className="text-sm font-bold text-foreground">
                {progressoMeta.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={progressoMeta}
              className="h-2.5 mb-3 bg-secondary"
            />
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

        {renderCategoryBudgets()}
      </div>

      <div className="hidden md:block space-y-12">
        <div className="pt-4">
          <ExpenseEvolutionChart
            dadosGraficoEvolucao={dadosGraficoEvolucao}
            periodoGrafico={periodoGrafico}
            setPeriodoGrafico={setPeriodoGrafico}
            formatMoney={formatMoney}
            hidden={hidden}
          />
        </div>

        <div className="grid gap-12 md:grid-cols-2 pt-2">
          <ExpenseCategories
            categoriasChart={categoriasChart}
            expandedCategory={expandedCategory}
            setExpandedCategory={setExpandedCategory}
            totalDespesas={totalDespesas}
            totalDespesasFixas={totalDespesasFixas}
            formatMoney={formatMoney}
            togglePagoLancamento={togglePagoLancamento}
          />

          <PaymentMethodsChart
            despesas={despesasBrutas}
            fixas={listaFixas}
            formatMoney={formatMoney}
            hidden={hidden}
          />
        </div>

        <div className="pt-2">
          <UpcomingBills
            proximosVencimentos={proximosVencimentos}
            formatMoney={formatMoney}
          />
        </div>

        {activeContext === "pessoal" && metaFixada && (
          <section
            onClick={() => onNavigate && onNavigate("metas")}
            className="mt-2 pt-6 border-t border-border/50 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 group-hover:text-primary transition-colors">
                <FireIcon className="h-4 w-4 text-primary" /> Meta:{" "}
                {metaFixada.nome}
              </h2>
              <span className="text-sm font-bold text-foreground">
                {progressoMeta.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={progressoMeta}
              className="h-2.5 mb-3 bg-secondary"
            />
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

        {renderCategoryBudgets()}
      </div>
    </div>
  );
}
