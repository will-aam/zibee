"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function ExpenseEvolutionChart({
  dadosGraficoEvolucao,
  formatMoney,
  hidden,
}: any) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground/80">
          Evolução dos Gastos Variáveis
        </h2>
      </div>

      <div className="h-[250px] w-full">
        {dadosGraficoEvolucao?.length > 0 ? (
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
                formatter={(value: number) => [formatMoney(value), "Despesas"]}
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
  );
}
