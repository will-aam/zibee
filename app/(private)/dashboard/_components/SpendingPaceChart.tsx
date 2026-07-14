"use client";

import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";

interface SpendingPaceProps {
  currentMonthExpenses?: any[];
  lastMonthExpenses?: any[];
  currentMonthFixed?: any[];
  lastMonthFixed?: any[];
  formatMoney: (val: number) => string;
}

const STORAGE_EXPANDED_KEY = "zibee:spending-pace-expanded";

export function SpendingPaceChart({
  currentMonthExpenses = [],
  lastMonthExpenses = [],
  currentMonthFixed = [],
  lastMonthFixed = [],
  formatMoney,
}: SpendingPaceProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Default expandido
  const today = new Date().getDate();

  // 1. Carrega a preferência do usuário do localStorage
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(STORAGE_EXPANDED_KEY);
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  // 2. Salva a preferência quando mudar
  const toggleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(STORAGE_EXPANDED_KEY, String(newState));
  };

  const chartData = useMemo(() => {
    const curExp = Array.isArray(currentMonthExpenses)
      ? currentMonthExpenses
      : [];
    const lastExp = Array.isArray(lastMonthExpenses) ? lastMonthExpenses : [];
    const curFix = Array.isArray(currentMonthFixed) ? currentMonthFixed : [];
    const lastFix = Array.isArray(lastMonthFixed) ? lastMonthFixed : [];

    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const data: any[] = [];

    let accumAtual = 0;
    let accumPassado = 0;

    const getDaySafe = (dateStr: string) => {
      if (!dateStr) return null;
      return parseInt(dateStr.split("-")[2], 10);
    };

    for (let i = 1; i <= daysInMonth; i++) {
      const varPassado = lastExp
        .filter((d: any) => getDaySafe(d.data_vencimento) === i)
        .reduce((acc: any, curr: any) => acc + Number(curr.valor), 0);
      const fixPassado = lastFix
        .filter((f: any) => Number(f.dia_vencimento) === i)
        .reduce((acc: any, curr: any) => acc + Number(curr.valor), 0);
      accumPassado += varPassado + fixPassado;

      let currentDaySpend: number | null = null;
      if (i <= today) {
        const varAtual = curExp
          .filter((d: any) => getDaySafe(d.data_vencimento) === i)
          .reduce((acc: any, curr: any) => acc + Number(curr.valor), 0);
        const fixAtual = curFix
          .filter((f: any) => Number(f.dia_vencimento) === i)
          .reduce((acc: any, curr: any) => acc + Number(curr.valor), 0);
        accumAtual += varAtual + fixAtual;
        currentDaySpend = accumAtual;
      }

      data.push({ day: i, atual: currentDaySpend, passado: accumPassado });
    }
    return data;
  }, [
    currentMonthExpenses,
    lastMonthExpenses,
    currentMonthFixed,
    lastMonthFixed,
    today,
  ]);

  const metrics = useMemo(() => {
    const pontoHoje = chartData.find((d) => d.day === today);
    const atualHoje = pontoHoje?.atual || 0;
    const passadoHoje = pontoHoje?.passado || 1;
    const diff = ((atualHoje - passadoHoje) / passadoHoje) * 100;

    return {
      diff: Math.abs(diff).toFixed(0),
      isBad: diff > 5,
      isGood: diff < -5,
      label:
        diff > 5
          ? "Acima do ritmo"
          : diff < -5
            ? "Abaixo do ritmo"
            : "No ritmo ideal",
    };
  }, [chartData, today]);

  if (!isMounted)
    return (
      <div className="h-20 w-full animate-pulse bg-muted/20 rounded-3xl" />
    );

  return (
    <div className="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden transition-all duration-300">
      {/* HEADER DO CARD (Sempre Visível) */}
      <div
        onClick={toggleExpand}
        className="flex items-center justify-between p-5 sm:p-6 cursor-pointer hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              Ritmo de Gasto
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Comparativo acumulado (Geral)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge de resumo quando está fechado */}
          {!isExpanded && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                metrics.isBad
                  ? "bg-red-500/10 border-red-500/20 text-red-600"
                  : metrics.isGood
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-600"
              }`}
            >
              {metrics.diff}% {metrics.label}
            </div>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      {/* CONTEÚDO RECOLHÍVEL */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-5 pb-6 sm:px-6">
              {/* Badge de métrica (agora dentro do conteúdo) */}
              <div
                className={`mb-6 flex items-center gap-2 px-3 py-1.5 rounded-2xl border self-start w-fit ${
                  metrics.isBad
                    ? "bg-red-500/10 border-red-500/20 text-red-600"
                    : metrics.isGood
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-600"
                }`}
              >
                {metrics.isBad ? (
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                ) : metrics.isGood ? (
                  <ArrowTrendingDownIcon className="h-4 w-4" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4" />
                )}
                <span className="text-xs font-bold">
                  {metrics.diff}% {metrics.label}
                </span>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ left: -20, right: 10, top: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#888888"
                      opacity={0.1}
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#888888" }}
                      interval={4}
                    />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length >= 1) {
                          const dataPassado = payload.find(
                            (p) => p.dataKey === "passado",
                          )?.value;
                          const dataHoje = payload.find(
                            (p) => p.dataKey === "atual",
                          )?.value;
                          return (
                            <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-2xl shadow-xl z-9999">
                              <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase">
                                Dia {payload[0].payload.day}
                              </p>
                              <div className="space-y-1">
                                {dataHoje !== undefined &&
                                  dataHoje !== null && (
                                    <p className="text-sm font-bold text-primary">
                                      Hoje: {formatMoney(Number(dataHoje))}
                                    </p>
                                  )}
                                <p className="text-sm font-medium text-muted-foreground/70">
                                  Mês Passado:{" "}
                                  {formatMoney(Number(dataPassado || 0))}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="passado"
                      stroke="#888888"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                      opacity={0.4}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="atual"
                      stroke="#009ed8"
                      strokeWidth={4}
                      dot={false}
                      animationDuration={1000}
                    />
                    <ReferenceLine
                      x={today}
                      stroke="#009ed8"
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4 border-t border-border/50 pt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-[#009ed8]" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Mês Atual
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-muted-foreground/40 border-t border-dashed" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Mês Anterior
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
