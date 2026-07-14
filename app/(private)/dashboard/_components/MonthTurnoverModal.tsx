"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";

interface MonthData {
  mesAno: string;
  nomeMes: string;
  saldo: number;
  idFechamento: string | null;
}

export function MonthTurnoverModal() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [monthData, setMonthData] = React.useState<MonthData | null>(null);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  const checkTurnover = React.useCallback(async () => {
    if (!userId) return;

    try {
      const today = new Date();
      const lastMonthDate = subMonths(today, 1);
      const mesAno = format(lastMonthDate, "yyyy-MM");

      const { data: fechamento, error: fetchError } = await supabase
        .from("fechamentos_mes")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_ano", mesAno)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (fechamento?.resolvido) {
        setIsLoading(false);
        return;
      }

      const start = format(startOfMonth(lastMonthDate), "yyyy-MM-dd");
      const end = format(endOfMonth(lastMonthDate), "yyyy-MM-dd");

      const [
        { data: receitasData },
        { data: variaveisData },
        { data: fixasData },
      ] = await Promise.all([
        supabase
          .from("lancamentos")
          .select("valor")
          .eq("user_id", userId)
          .is("grupo_id", null)
          .eq("tipo", "Receita")
          .eq("pago", true)
          .gte("data_vencimento", start)
          .lte("data_vencimento", end),

        supabase
          .from("lancamentos")
          .select("valor")
          .eq("user_id", userId)
          .is("grupo_id", null)
          .eq("tipo", "Despesa")
          .is("conta_fixa_id", null)
          .gte("data_vencimento", start)
          .lte("data_vencimento", end),

        supabase
          .from("despesas_fixas")
          .select("valor")
          .eq("user_id", userId)
          .is("grupo_id", null)
          .eq("status", "ativo"),
      ]);

      const totalReceitas =
        receitasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const totalVariaveis =
        variaveisData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const totalFixas =
        fixasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;

      if (totalReceitas === 0 && totalVariaveis === 0 && totalFixas === 0) {
        setIsLoading(false);
        return;
      }

      // CORREÇÃO: Forçamos o arredondamento de 2 casas decimais para evitar o bug do 0.0000000001
      let saldoCalculado = totalReceitas - totalVariaveis - totalFixas;
      saldoCalculado = Number(saldoCalculado.toFixed(2));

      setMonthData({
        mesAno,
        nomeMes: format(lastMonthDate, "MMMM", { locale: ptBR }),
        saldo: saldoCalculado,
        idFechamento: fechamento?.id || null,
      });

      setIsOpen(true);
    } catch (error) {
      console.error("Erro ao checar virada de mês:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    checkTurnover();
  }, [checkTurnover]);

  const handleResolve = async (
    action: "somar_atual" | "ignorar_meta" | "adiar",
  ) => {
    if (!userId || !monthData) return;
    setActionLoading(action);

    try {
      if (action === "adiar") {
        if (dontShowAgain) {
          const payloadFechamento = {
            user_id: userId,
            mes_ano: monthData.mesAno,
            saldo_calculado: monthData.saldo,
            resolvido: true,
          };

          if (monthData.idFechamento) {
            await supabase
              .from("fechamentos_mes")
              .update({ resolvido: true, saldo_calculado: monthData.saldo })
              .eq("id", monthData.idFechamento);
          } else {
            await supabase.from("fechamentos_mes").insert([payloadFechamento]);
          }
        }

        setIsOpen(false);
        setActionLoading(null);
        return;
      }

      const payloadFechamento = {
        user_id: userId,
        mes_ano: monthData.mesAno,
        saldo_calculado: monthData.saldo,
        resolvido: true,
      };

      if (monthData.idFechamento) {
        await supabase
          .from("fechamentos_mes")
          .update({ resolvido: true, saldo_calculado: monthData.saldo })
          .eq("id", monthData.idFechamento);
      } else {
        await supabase.from("fechamentos_mes").insert([payloadFechamento]);
      }

      // Se o saldo não for zero e a ação for "somar_atual", cria o lançamento
      if (action === "somar_atual" && monthData.saldo !== 0) {
        const today = new Date();
        const firstDayCurrentMonth = format(startOfMonth(today), "yyyy-MM-dd");
        const isPositive = monthData.saldo > 0;

        const lancamentoAjuste = {
          user_id: userId,
          descricao: isPositive
            ? `Saldo Positivo de ${monthData.nomeMes}`
            : `Déficit de ${monthData.nomeMes}`,
          valor: Math.abs(monthData.saldo),
          tipo: isPositive ? "Receita" : "Despesa",
          categoria: isPositive ? "Saldo Anterior" : "Ajuste de Saldo",
          forma_pagamento: "Ajuste do Sistema",
          data_vencimento: firstDayCurrentMonth,
          pago: true,
        };

        await supabase.from("lancamentos").insert([lancamentoAjuste]);
      }

      setIsOpen(false);
      window.dispatchEvent(new Event("zibee:transaction-changed"));
      toast({
        title: "Mês fechado com sucesso!",
        description: "Seu orçamento foi atualizado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fechar o mês",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !monthData) return null;

  const isPositive = monthData.saldo > 0;
  const isZero = monthData.saldo === 0;
  const saldoFormatado = Math.abs(monthData.saldo).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md w-[90vw] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-3xl z-9999 p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div
          className={`p-5 sm:p-6 text-center text-white shrink-0 ${
            isPositive
              ? "bg-emerald-500"
              : isZero
                ? "bg-blue-500"
                : "bg-destructive"
          }`}
        >
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 sm:mb-4 backdrop-blur-sm">
            {isPositive ? (
              <TrophyIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            ) : isZero ? (
              <CheckCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            ) : (
              <ExclamationTriangleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold mb-1">
            Fechamento de {monthData.nomeMes}
          </DialogTitle>
          <DialogDescription className="text-white/90 text-xs sm:text-sm px-2">
            {isPositive
              ? "Parabéns! Você gastou menos do que ganhou."
              : isZero
                ? "Orçamento perfeito! Você empatou seus ganhos e gastos."
                : "Atenção! Você gastou mais do que arrecadou."}
          </DialogDescription>
        </div>

        <div className="p-5 sm:p-6 space-y-5 sm:space-y-6 bg-background">
          <div className="text-center space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {isPositive
                ? "Sobrou um total de:"
                : isZero
                  ? "Seu saldo foi:"
                  : "Faltou um total de:"}
            </p>
            <p
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isPositive
                  ? "text-emerald-500 dark:text-emerald-400"
                  : isZero
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-destructive"
              }`}
            >
              {isPositive ? "+" : isZero ? "" : "-"}
              {saldoFormatado}
            </p>
          </div>

          <div className="space-y-2.5 sm:space-y-3 pt-1">
            {/* NOVO: Botão Único se o saldo for exatamente Zero */}
            {isZero ? (
              <Button
                onClick={() => handleResolve("somar_atual")} // "somar_atual" ignorado se o saldo é 0, só finaliza seguro
                disabled={actionLoading !== null}
                className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-bold shadow-md bg-blue-500 hover:bg-blue-600 text-white"
              >
                {actionLoading === "somar_atual" ? (
                  "Processando..."
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-2 shrink-0" />
                    <span className="truncate">Tudo certo! Fechar o mês</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleResolve("somar_atual")}
                disabled={actionLoading !== null}
                className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-bold shadow-md"
              >
                {actionLoading === "somar_atual" ? (
                  "Processando..."
                ) : (
                  <>
                    <span className="truncate">
                      {isPositive
                        ? "Adicionar saldo ao mês atual"
                        : "Descontar do mês atual"}
                    </span>
                    <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 ml-2 shrink-0" />
                  </>
                )}
              </Button>
            )}

            {/* Este botão só aparece se for POSITIVO E MAIOR QUE ZERO */}
            {isPositive && !isZero && (
              <Button
                variant="outline"
                onClick={() => handleResolve("ignorar_meta")}
                disabled={actionLoading !== null}
                className="w-full h-11 sm:h-12 rounded-2xl border-2 text-xs sm:text-sm"
              >
                {actionLoading === "ignorar_meta"
                  ? "Processando..."
                  : "Não somar (Vou guardar nas Metas)"}
              </Button>
            )}

            <div className="flex flex-col items-center pt-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(c) => setDontShowAgain(c === true)}
                  disabled={actionLoading !== null}
                />
                <label
                  htmlFor="dont-show"
                  className="text-xs text-muted-foreground cursor-pointer font-medium select-none"
                >
                  Não mostrar este aviso novamente
                </label>
              </div>

              <Button
                variant="ghost"
                onClick={() => handleResolve("adiar")}
                disabled={actionLoading !== null}
                className="w-full h-10 sm:h-12 rounded-2xl text-xs sm:text-sm text-muted-foreground hover:text-foreground"
              >
                <ClockIcon className="w-4 h-4 mr-1.5" />
                {dontShowAgain ? "Ignorar mês passado" : "Decidir mais tarde"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
