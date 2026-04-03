// components/dashboard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  Target,
  Loader2,
  AlertCircle,
  Wallet,
  ArrowRight,
} from "lucide-react";

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  // --- USER SESSION ---
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  // --- ESTADOS DO FILTRO ---
  const [mesSelecionado, setMesSelecionado] = useState("todos");
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);

  // --- ESTADOS DE DADOS ---
  const [loading, setLoading] = useState(true);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesasFixas, setTotalDespesasFixas] = useState(0);

  // Gráfico
  const [categoriasChart, setCategoriasChart] = useState<any[]>([]);

  const [proximosVencimentos, setProximosVencimentos] = useState<any[]>([]);
  const [metaFixada, setMetaFixada] = useState<any>(null);
  const [progressoMeta, setProgressoMeta] = useState(0);

  // 1. Formatar mês
  const formatarMesLegivel = (anoMes: string) => {
    if (anoMes === "todos") return "Todos os períodos";
    const [ano, mes] = anoMes.split("-");
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    const nomeMes = data.toLocaleString("pt-BR", { month: "long" });
    return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de ${ano}`;
  };

  // 2. Buscar meses disponíveis
  const fetchMeses = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("data_vencimento")
        .eq("user_id", userId)
        .order("data_vencimento", { ascending: false });

      if (error) throw error;

      if (data) {
        const mesesSet = new Set<string>();
        data.forEach((item) => {
          if (item.data_vencimento) {
            mesesSet.add(item.data_vencimento.slice(0, 7));
          }
        });
        setMesesDisponiveis(Array.from(mesesSet));
      }
    } catch (error: any) {
      console.error("Erro ao buscar meses:", error.message);
    }
  }, [userId]);

  // 3. Inicialização Filtro
  useEffect(() => {
    if (userId) {
      fetchMeses();
    }
    const filtroSalvo = localStorage.getItem("dashboardFiltroMes");
    if (filtroSalvo) {
      setMesSelecionado(filtroSalvo);
    }
  }, [userId, fetchMeses]);

  const handleFiltroChange = (valor: string) => {
    setMesSelecionado(valor);
    localStorage.setItem("dashboardFiltroMes", valor);
  };

  // 4. Buscar Dados do Dashboard
  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // --- Queries Base ---
      // Despesas (Mantém a lógica de ver o comprometimento total, pago ou não)
      let queryDespesas = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo", "Despesa");

      // Receitas (ALTERAÇÃO AQUI: Só o que já entrou no bolso)
      let queryReceitas = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo", "Receita")
        .eq("pago", true); // <--- TRAVA DE SEGURANÇA: Só soma se estiver marcado como recebido

      // Vencimentos (Contas a Pagar)
      let queryVencimentos = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .eq("pago", false)
        .eq("tipo", "Despesa")
        .order("data_vencimento", { ascending: true })
        .limit(5);

      // --- Aplicar Filtro de Mês ---
      if (mesSelecionado !== "todos") {
        const [ano, mes] = mesSelecionado.split("-");
        const dataInicio = `${mesSelecionado}-01`;
        const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
        const dataFim = `${mesSelecionado}-${ultimoDia}`;

        queryDespesas = queryDespesas
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim);

        queryReceitas = queryReceitas
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim);

        queryVencimentos = queryVencimentos
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim);
      }

      // Executar Queries
      const { data: lancamentosData } = await queryDespesas;
      const { data: receitasData } = await queryReceitas;
      const { data: vencimentosData } = await queryVencimentos;

      // A) Total Despesas
      const totalDesp =
        lancamentosData?.reduce((acc, curr) => acc + Number(curr.valor), 0) ||
        0;
      setTotalDespesas(totalDesp);

      // B) Total Receitas
      const totalRec =
        receitasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      setTotalReceitas(totalRec);

      // C) Cálculo das Categorias
      const categoriasMap = lancamentosData?.reduce((acc: any, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + Number(curr.valor);
        return acc;
      }, {});

      const chartData = Object.entries(categoriasMap || {})
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setCategoriasChart(chartData);

      // D) Próximos Vencimentos
      setProximosVencimentos(vencimentosData || []);

      // E) Despesas Fixas
      const { data: fixasData } = await supabase
        .from("despesas_fixas")
        .select("valor")
        .eq("user_id", userId);

      const totalFixas =
        fixasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      setTotalDespesasFixas(totalFixas);

      // F) Meta Fixada
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

        const porcentagem = Math.min((atualMeta / totalMeta) * 100, 100);
        setProgressoMeta(porcentagem);
      } else {
        setMetaFixada(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [mesSelecionado, userId]);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, userId]);

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER + FILTRO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-[200px]">
          <Select value={mesSelecionado} onValueChange={handleFiltroChange}>
            <SelectTrigger className="w-full">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              {mesesDisponiveis.map((mes) => (
                <SelectItem key={mes} value={mes}>
                  {formatarMesLegivel(mes)}
                </SelectItem>
              ))}
              {mesesDisponiveis.length === 0 && mesSelecionado !== "todos" && (
                <SelectItem value={mesSelecionado}>
                  {formatarMesLegivel(mesSelecionado)}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TOTAIS (3 COLUNAS) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {/* 1. RECEITAS (Verde) - AGORA SÓ CONFIRMADAS */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Entradas Confirmadas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(totalReceitas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Já recebido em conta
            </p>
          </CardContent>
        </Card>

        {/* 2. DESPESAS VARIÁVEIS (Vermelho) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gastos Variáveis
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatMoney(totalDespesas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        {/* 3. DESPESAS FIXAS (Azul) */}
        <Card
          onClick={() => onNavigate && onNavigate("despesas_fixas")}
          className="cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contas Fixas Mensais
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatMoney(totalDespesasFixas)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Recorrência mensal
              <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* META FIXADA */}
      {metaFixada && (
        <Card
          onClick={() => onNavigate && onNavigate("metas")}
          className="border-l-4 border-l-primary shadow-sm bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Meta: {metaFixada.nome}
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Progresso</span>
                <span>{progressoMeta.toFixed(1)}%</span>
              </div>
              <Progress value={progressoMeta} className="h-3 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>
                  {formatMoney(
                    Number(
                      metaFixada.valor_atual ||
                        metaFixada.valor_depositado ||
                        0,
                    ),
                  )}
                </span>
                <span>
                  de{" "}
                  {formatMoney(
                    Number(
                      metaFixada.valor_objetivo || metaFixada.valor_total || 0,
                    ),
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GRÁFICO (BARRINHAS) + VENCIMENTOS */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              Onde estou gastando?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoriasChart.length > 0 ? (
                categoriasChart.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatMoney(item.value)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-orange-500/80 transition-all duration-500"
                        style={{
                          width: `${(item.value / totalDespesas) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  Sem gastos neste período.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Próximos Vencimentos */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Contas a Pagar (Próximas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium leading-none text-sm">
                          {item.descricao}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span
                            className={`flex items-center gap-1 ${
                              isAtrasado ? "text-red-500 font-bold" : ""
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {dataVenc.toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold block text-sm">
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
                <div className="py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  Tudo pago! Nenhuma conta pendente próxima.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
