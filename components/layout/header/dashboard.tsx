"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  FireIcon,
  ArrowPathIcon,
  WalletIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// ============================================================================
// SUBCOMPONENTE: CARDS DE RESUMO DO DASHBOARD
// ============================================================================
function DashboardSummaryCards({
  totalReceitas,
  totalVariaveis,
  totalFixas,
  listaFixas,
  saldoGeral,
  hidden,
  formatMoney,
  activeContext,
}: any) {
  const [isFixasModalOpen, setIsFixasModalOpen] = useState(false);

  return (
    <>
      <div
        className={`grid gap-6 ${activeContext === "pessoal" ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {/* 1. ENTRADAS CONFIRMADAS */}
        <div className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
            <ArrowTrendingUpIcon className="h-4 w-4" /> Entradas Confirmadas
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {formatMoney(totalReceitas)}
          </div>
        </div>

        {/* 2. GASTOS VARIÁVEIS (Isolado de fixas) */}
        <div className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
            <ArrowTrendingDownIcon className="h-4 w-4" /> Gastos Variáveis
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {formatMoney(totalVariaveis)}
          </div>
        </div>

        {/* 3. CONTAS FIXAS MENSAIS (SOMENTE PESSOAL) */}
        {activeContext === "pessoal" && (
          <div
            onClick={() => setIsFixasModalOpen(true)}
            className="pb-4 border-b border-border/50 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
              <WalletIcon className="h-4 w-4" /> Contas Fixas
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {formatMoney(totalFixas)}
            </div>
          </div>
        )}

        {/* 4. SALDO GERAL */}
        <div className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            Saldo Geral Previsto
          </div>
          <div
            className={`text-3xl font-bold tracking-tight ${
              saldoGeral >= 0 ? "text-foreground" : "text-destructive"
            }`}
          >
            {totalReceitas > 0 ? formatMoney(saldoGeral) : "****"}
          </div>
          {totalReceitas <= 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sem entradas confirmadas
            </p>
          )}
        </div>
      </div>

      {/* MODAL INFORMATIVO DE CONTAS FIXAS */}
      <Dialog open={isFixasModalOpen} onOpenChange={setIsFixasModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 gap-0">
          <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <WalletIcon className="h-6 w-6 text-blue-500" />
              Minhas Contas Fixas
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {listaFixas.length > 0 ? (
              <div className="flex flex-col">
                {listaFixas.map((fixa: any) => (
                  <div
                    key={fixa.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/30 border-b border-border/40 last:border-0 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {fixa.descricao || fixa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="h-3 w-3" /> Dia{" "}
                        {fixa.dia_vencimento}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatMoney(fixa.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma conta fixa ativa no momento.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
// ============================================================================

export default function Dashboard({ onNavigate }: DashboardProps) {
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [mesSelecionado, setMesSelecionado] = useState("todos");
  const [hidden, setHidden] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null); // Guardar estado do grupo para o Checkbox

  // ESTADO DO ACORDEÃO (Qual categoria está aberta?)
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
  const [listaFixas, setListaFixas] = useState<any[]>(
    dashboardCache.listaFixas[activeContext] || [],
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
        .is("cartao_id", null) // <-- MÁGICA 1: Esconde as comprinhas de cartão dos vencimentos
        .order("data_vencimento", { ascending: true })
        .limit(5);

      let queryFixasDashboard = supabase
        .from("despesas_fixas")
        .select("*")
        .eq("status", "ativo")
        .order("dia_vencimento", { ascending: true });

      let queryCartoes = supabase // <-- Busca os cartões
        .from("cartoes_credito")
        .select("*");

      if (activeContext === "grupo" && groupId) {
        queryDespesasVariaveis = queryDespesasVariaveis.eq("grupo_id", groupId);
        queryReceitas = queryReceitas.eq("grupo_id", groupId);
        queryVencimentos = queryVencimentos.eq("grupo_id", groupId);
        queryFixasDashboard = queryFixasDashboard.eq("grupo_id", groupId);
        queryCartoes = queryCartoes.eq("grupo_id", groupId); // <-- Aqui
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
        queryCartoes = queryCartoes.eq("user_id", userId).is("grupo_id", null); // <-- E Aqui
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
        { data: cartoesData }, // <-- RECEBE AQUI
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
        queryCartoes, // <-- CHAMA AQUI
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

      const todosOsGastos = [
        ...(variaveisData || []),
        ...(dadosFixasValidos || []),
      ];

      // 1. Agrupando categorias e guardando os itens (Acordeão)
      const categoriasMap = todosOsGastos.reduce((acc: any, curr) => {
        const k = curr.categoria || "Sem categoria";
        if (!acc[k]) acc[k] = { total: 0, items: [] };

        acc[k].total += Number(curr.valor);
        acc[k].items.push(curr);
        return acc;
      }, {});

      // 2. Formatando para o gráfico e ordenando os itens de cada categoria por data
      const fetchedCategoriasChart = Object.entries(categoriasMap || {})
        .map(([name, data]: any) => {
          return {
            name,
            value: Number(data.total),
            items: data.items.sort((a: any, b: any) => {
              const dateA = new Date(
                a.data_vencimento || a.dia_vencimento,
              ).getTime();
              const dateB = new Date(
                b.data_vencimento || b.dia_vencimento,
              ).getTime();
              return dateA - dateB;
            }),
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Mostra até as 6 maiores categorias

      // --- 3. A MÁGICA DOS VENCIMENTOS DE CARTÃO ---
      let fetchedVencimentos = vencimentosData || [];

      // Calcular faturas dinâmicas e injetar na lista de Vencimentos
      if (cartoesData && cartoesData.length > 0) {
        const faturasInjetaveis: any[] = [];

        cartoesData.forEach((cartao) => {
          // Busca todas as despesas deste cartão que AINDA NÃO FORAM PAGAS
          const comprasPendentesCartao = todosOsGastos.filter(
            (d) => d.cartao_id === cartao.id && !d.pago,
          );

          if (comprasPendentesCartao.length > 0) {
            // Vamos agrupar as compras pelas suas datas REAIS de vencimento de fatura
            const faturasAgrupadas: Record<string, number> = {};

            comprasPendentesCartao.forEach((compra) => {
              // SEGURANÇA NA DATA: Garante que temos uma string válida de data
              let dataBaseStr = compra.data_vencimento;
              if (!dataBaseStr) {
                // Se for uma conta fixa que veio sem data completa, montamos uma
                const [anoF, mesF] = (
                  readRange().from || getCurrentYearMonth() + "-01"
                ).split("-");
                dataBaseStr = `${anoF}-${mesF}-${String(compra.dia_vencimento).padStart(2, "0")}`;
              }

              const dataCompra = new Date(dataBaseStr + "T12:00:00");

              // Se a data ainda for inválida, aborta para não quebrar a tela
              if (isNaN(dataCompra.getTime())) return;

              let mesFatura = dataCompra.getMonth();
              let anoFatura = dataCompra.getFullYear();

              // REGRA 1: Se comprou DEPOIS do fechamento, a fatura pula pro mês seguinte
              if (dataCompra.getDate() > cartao.dia_fechamento) {
                mesFatura++;
              }

              // REGRA 2: Se o dia de Vencimento for menor ou igual ao de Fechamento
              if (cartao.dia_vencimento <= cartao.dia_fechamento) {
                mesFatura++;
              }

              // Ajusta o ano se o mês passar de Dezembro (mês 11)
              if (mesFatura > 11) {
                mesFatura = 0;
                anoFatura++;
              }

              // Descobrimos o dia exato em que a fatura dessa compra vai vencer
              const dataVencimentoReal = new Date(
                anoFatura,
                mesFatura,
                cartao.dia_vencimento,
                12, // Forçamos meio-dia para garantir estabilidade no ISO
                0,
                0,
              );

              const chaveIso = dataVencimentoReal.toISOString();

              // Somamos o valor da compra dentro da sua respectiva fatura (gaveta)
              if (!faturasAgrupadas[chaveIso]) {
                faturasAgrupadas[chaveIso] = 0;
              }
              faturasAgrupadas[chaveIso] += Number(compra.valor);
            });

            // Transforma os grupos em itens visuais para o Dashboard
            Object.entries(faturasAgrupadas).forEach(
              ([dataIso, totalValor]) => {
                faturasInjetaveis.push({
                  id: `fatura-${cartao.id}-${dataIso}`,
                  descricao: `Fatura ${cartao.nome}`,
                  valor: totalValor,
                  data_vencimento: dataIso,
                  pago: false,
                  isFatura: true, // Flag para não exibir checkbox de pagar
                });
              },
            );
          }
        });

        // Junta as faturas com as contas normais e ordena quem vence primeiro
        fetchedVencimentos = [...fetchedVencimentos, ...faturasInjetaveis]
          .sort(
            (a, b) =>
              new Date(a.data_vencimento).getTime() -
              new Date(b.data_vencimento).getTime(),
          )
          .slice(0, 5);
      }

      setDespesasBrutas(fetchedDespesasBrutas);
      setTotalDespesas(fetchedTotalVariaveis);
      setTotalReceitas(fetchedTotalRec);
      setCategoriasChart(fetchedCategoriasChart);
      setProximosVencimentos(fetchedVencimentos);

      setTotalDespesasFixas(fetchedTotalFixas);
      setListaFixas(dadosFixasValidos);

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
    function onFilterChanged() {
      fetchDashboardData();
    }
    window.addEventListener(FILTER_EVENT, onFilterChanged);
    return () => window.removeEventListener(FILTER_EVENT, onFilterChanged);
  }, [fetchDashboardData]);

  // Função para marcar como pago direto do Dashboard
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

      if (activeContext === "grupo" && currentGroupId) {
        query = query.eq("grupo_id", currentGroupId);
      } else {
        query = query.eq("user_id", userId).is("grupo_id", null);
      }

      await query;
      // Atualiza os dados da tela
      fetchDashboardData();
      // Emite evento para que outras abas (Lançamentos) saibam que algo mudou
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-10 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      {/* SEÇÃO 1: RESUMO FINANCEIRO - APENAS DESKTOP */}
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

        <DashboardSummaryCards
          totalReceitas={totalReceitas}
          totalVariaveis={totalDespesas}
          totalFixas={totalDespesasFixas}
          listaFixas={listaFixas}
          saldoGeral={saldoGeral}
          hidden={hidden}
          formatMoney={formatMoney}
          activeContext={activeContext}
        />
      </section>

      {/* SEÇÃO 2: EVOLUÇÃO DAS DESPESAS - APENAS DESKTOP */}
      <section className="pt-4 hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground/80">
            Evolução dos Gastos Variáveis
          </h2>
          <div className="flex bg-muted/50 rounded-lg p-1 border border-border/30">
            {(["7D", "30D", "ALL"] as const).map((periodo) => (
              <button
                key={periodo}
                onClick={() => setPeriodoGrafico(periodo)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  periodoGrafico === periodo
                    ? "bg-background shadow-sm text-foreground"
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dadosGraficoEvolucao}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
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
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={85}
                  tickFormatter={(val) => (hidden ? "****" : `R$ ${val}`)}
                  tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatMoney(value),
                    "Despesas",
                  ]}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    backgroundColor: "hsl(var(--background))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="oklch(0.65 0.15 230)"
                  strokeWidth={4}
                  dot={{ r: 4, fill: "oklch(0.65 0.15 230)", strokeWidth: 0 }}
                  activeDot={{
                    r: 6,
                    strokeWidth: 0,
                    fill: "oklch(0.65 0.15 230)",
                  }}
                  animationDuration={1500}
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

      {/* SEÇÃO 3: CATEGORIAS EM ACORDEÃO E PRÓXIMOS VENCIMENTOS */}
      <div className="grid gap-12 md:grid-cols-2 pt-4">
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
            <ArrowTrendingDownIcon className="h-5 w-5 text-orange-500" /> Onde
            estou gastando?
          </h2>
          <div className="space-y-4">
            {categoriasChart.length > 0 ? (
              categoriasChart.map((item, index) => {
                const isExpanded = expandedCategory === item.name;
                return (
                  <div key={index} className="space-y-1.5 transition-all">
                    {/* CABEÇALHO DA CATEGORIA (Clicável) */}
                    <div
                      className="flex items-center justify-between text-sm cursor-pointer select-none hover:opacity-80 py-1"
                      onClick={() =>
                        setExpandedCategory(isExpanded ? null : item.name)
                      }
                    >
                      <span className="font-medium text-foreground flex items-center gap-2">
                        <ChevronDownIcon
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-300",
                            isExpanded && "rotate-180",
                          )}
                        />
                        {item.name}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        {formatMoney(item.value)}
                      </span>
                    </div>

                    {/* BARRA DE PROGRESSO */}
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-700 ease-out"
                        style={{
                          width:
                            totalDespesas + totalDespesasFixas > 0
                              ? `${(item.value / (totalDespesas + totalDespesasFixas)) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>

                    {/* CONTEÚDO EXPANDIDO (Lista de despesas) */}
                    {isExpanded && (
                      <div className="pt-2 pb-2 pl-6 pr-2 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                        {item.items.map((despesa: any, idx: number) => {
                          const isFixedTemplate = !!despesa.dia_vencimento; // Verifica se é uma conta fixa recorrente
                          const isPago = despesa.pago;
                          const dataDisplay = isFixedTemplate
                            ? `Todo dia ${despesa.dia_vencimento}`
                            : new Date(
                                despesa.data_vencimento,
                              ).toLocaleDateString("pt-BR", {
                                timeZone: "UTC",
                              });

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs border-b border-border/40 last:border-0 pb-2 last:pb-0"
                            >
                              <div className="flex items-center gap-3">
                                {/* Exibe Checkbox se NÃO for fixa e NÃO for do cartão */}
                                {!isFixedTemplate && !despesa.cartao_id ? (
                                  <Checkbox
                                    checked={isPago}
                                    onCheckedChange={() =>
                                      togglePagoLancamento(despesa.id, isPago)
                                    }
                                    className="h-4 w-4 rounded-md"
                                  />
                                ) : (
                                  <WalletIcon
                                    className="h-4 w-4 text-blue-500/60"
                                    title={
                                      despesa.cartao_id
                                        ? "Compra no Cartão"
                                        : "Conta Fixa"
                                    }
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span
                                    className={cn(
                                      "font-medium",
                                      isPago &&
                                        "line-through text-muted-foreground",
                                    )}
                                  >
                                    {despesa.descricao || despesa.nome}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {dataDisplay} {isFixedTemplate && " (Fixa)"}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "font-semibold",
                                  isPago
                                    ? "text-muted-foreground"
                                    : "text-foreground",
                                )}
                              >
                                {formatMoney(Number(despesa.valor))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground bg-accent/30 p-4 rounded-xl border border-dashed">
                Sem gastos registrados neste período.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
            <ExclamationCircleIcon className="h-5 w-5 text-blue-500" /> Próximos
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
                          <CalendarIcon className="h-3 w-3" />
                          {dataVenc.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold block text-sm text-foreground">
                        {formatMoney(item.valor)}
                      </span>
                      {isAtrasado && !item.isFatura && (
                        <span className="text-[10px] text-destructive uppercase font-bold tracking-wider">
                          Vencido
                        </span>
                      )}
                      {item.isFatura && (
                        <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
                          Fatura
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
              <FireIcon className="h-4 w-4 text-primary" /> Meta:{" "}
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
