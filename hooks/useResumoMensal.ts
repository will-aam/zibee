import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Helpers do tempo transferidos para o Hook
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

interface UseResumoMensalProps {
  userId: string | undefined;
  activeContext: "pessoal" | "grupo";
  from: string | null;
  to: string | null;
}

export function useResumoMensal({
  userId,
  activeContext,
  from,
  to,
}: UseResumoMensalProps) {
  return useQuery({
    // A queryKey é a identidade do cache. Se nenhum desses valores mudar,
    // ele não bate no banco de dados à toa.
    queryKey: ["resumo-mensal", userId, activeContext, from, to],
    enabled: !!userId, // Só executa a busca se o usuário estiver logado

    queryFn: async () => {
      let groupId = null;

      // 1. Descobre se estamos no contexto de Grupo
      if (activeContext === "grupo") {
        const { data: myGroup } = await supabase
          .from("grupos")
          .select("id")
          .eq("criador_id", userId)
          .maybeSingle();

        if (myGroup) {
          groupId = myGroup.id;
        } else {
          const { data: membership } = await supabase
            .from("membros_grupo")
            .select("grupo_id")
            .eq("user_id", userId)
            .eq("status", "Aceito")
            .maybeSingle();
          groupId = membership?.grupo_id;
        }

        if (!groupId) return getEmptyData();
      }

      // 2. Prepara as Queries Básicas (Em vez de buscar só o valor, vamos buscar a linha toda
      // para que o Dashboard consiga reaproveitar os dados para montar os gráficos depois)
      let queryR = supabase
        .from("lancamentos")
        .select("*")
        .eq("tipo", "Receita")
        .eq("pago", true);

      let queryD = supabase
        .from("lancamentos")
        .select("*")
        .eq("tipo", "Despesa")
        .is("conta_fixa_id", null);

      let queryF = supabase
        .from("despesas_fixas")
        .select("*")
        .eq("status", "ativo")
        .order("dia_vencimento", { ascending: true });

      // 3. Aplica os Filtros (Grupo ou Pessoal)
      if (activeContext === "grupo" && groupId) {
        queryR = queryR.eq("grupo_id", groupId);
        queryD = queryD.eq("grupo_id", groupId);
        queryF = queryF.eq("grupo_id", groupId);
      } else {
        queryR = queryR.eq("user_id", userId).is("grupo_id", null);
        queryD = queryD.eq("user_id", userId).is("grupo_id", null);
        queryF = queryF.eq("user_id", userId).is("grupo_id", null);
      }

      // 4. Aplica os Filtros de Data
      if (from) {
        queryR = queryR.gte("data_vencimento", from);
        queryD = queryD.gte("data_vencimento", from);
      }
      if (to) {
        queryR = queryR.lte("data_vencimento", to);
        queryD = queryD.lte("data_vencimento", to);
      }

      // 5. Executa tudo de uma vez (em paralelo para ser mais rápido)
      const [{ data: r }, { data: d }, { data: f }] = await Promise.all([
        queryR,
        queryD,
        queryF,
      ]);

      const receitasBrutas = r || [];
      const despesasBrutas = d || [];
      const listaFixas = f || [];

      // 6. Calcula os Totais
      const totalReceitas = receitasBrutas.reduce(
        (acc, curr) => acc + Number(curr.valor),
        0,
      );
      const totalDespesas = despesasBrutas.reduce(
        (acc, curr) => acc + Number(curr.valor),
        0,
      );
      const totalDespesasFixas = listaFixas.reduce(
        (acc, curr) => acc + Number(curr.valor),
        0,
      );

      // =========================================================
      // O FILTRO DO TEMPO (Magia de deduzir contas pagas)
      // =========================================================
      const today = new Date();
      const currentMonthStr = getCurrentYearMonth();
      const viewedMonthStr = from ? from.substring(0, 7) : currentMonthStr;

      let totalFixasPagas = 0;

      if (viewedMonthStr < currentMonthStr) {
        totalFixasPagas = totalDespesasFixas;
      } else if (viewedMonthStr > currentMonthStr) {
        totalFixasPagas = 0;
      } else {
        const currentDay = today.getDate();
        totalFixasPagas = listaFixas.reduce((acc, curr) => {
          if (Number(curr.dia_vencimento) <= currentDay) {
            return acc + Number(curr.valor);
          }
          return acc;
        }, 0);
      }
      // =========================================================

      // Saldo Geral (só calcula se tiver receita)
      const saldoGeral =
        totalReceitas > 0
          ? totalReceitas - totalDespesas - totalDespesasFixas
          : 0;

      return {
        totalReceitas,
        totalDespesas,
        totalDespesasFixas,
        totalFixasPagas,
        saldoGeral,
        listaFixas,
        receitasBrutas,
        despesasBrutas, // Enviaremos as despesas brutas também pro Dashboard usar nos gráficos
      };
    },
  });
}

function getEmptyData() {
  return {
    totalReceitas: 0,
    totalDespesas: 0,
    totalDespesasFixas: 0,
    totalFixasPagas: 0,
    saldoGeral: 0,
    listaFixas: [],
    receitasBrutas: [],
    despesasBrutas: [],
  };
}
