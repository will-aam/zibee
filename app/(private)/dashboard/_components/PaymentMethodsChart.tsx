"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CreditCardIcon } from "@heroicons/react/24/solid";

const COLORS = [
  "#f97316", // Laranja (Combina com seu tema)
  "#3b82f6", // Azul
  "#10b981", // Verde
  "#8b5cf6", // Roxo
  "#a855f7", // Fúcsia
  "#ef4444", // Vermelho
];

interface PaymentMethodsChartProps {
  despesas: any[];
  fixas: any[];
  formatMoney: (val: number) => string;
  hidden: boolean;
}

export function PaymentMethodsChart({
  despesas,
  fixas,
  formatMoney,
  hidden,
}: PaymentMethodsChartProps) {
  const data = useMemo(() => {
    const agrupado: Record<string, number> = {};

    const processarItem = (item: any) => {
      // Pega a forma de pagamento, se não tiver assume "Outros"
      const metodo = item.forma_pagamento || "Outros";
      agrupado[metodo] = (agrupado[metodo] || 0) + Number(item.valor || 0);
    };

    despesas?.forEach(processarItem);
    fixas?.forEach(processarItem);

    return Object.keys(agrupado)
      .map((key) => ({ name: key, value: agrupado[key] }))
      .sort((a, b) => b.value - a.value); // Ordena do maior pro menor
  }, [despesas, fixas]);

  // Função que customiza o texto da legenda para incluir o valor
  const renderLegendText = (value: string, entry: any) => {
    const valorFormatado = hidden ? "****" : formatMoney(entry.payload.value);
    return (
      <span className="text-foreground ml-1">
        {value}{" "}
        <span className="font-bold text-muted-foreground ml-1">
          {valorFormatado}
        </span>
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
        <CreditCardIcon className="h-5 w-5 text-indigo-500" /> Formas de
        Pagamento
      </h2>

      {/* Ajustamos a altura para garantir que a legenda com valores caiba no mobile */}
      <div className="h-[280px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%" // Subimos o gráfico um pouco para dar mais espaço à legenda
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  hidden ? "****" : formatMoney(value),
                  "Total",
                ]}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  backgroundColor: "hsl(var(--background))",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={renderLegendText} // <-- Aplicamos o texto customizado aqui
                wrapperStyle={{
                  fontSize: "12px",
                  paddingTop: "20px", // Dá um respiro entre o gráfico e a legenda
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl bg-accent/20">
            Sem dados de pagamento no período.
          </div>
        )}
      </div>
    </div>
  );
}
