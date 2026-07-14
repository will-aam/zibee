"use client";

import { CalendarIcon } from "@heroicons/react/24/solid";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export function UpcomingBills({ proximosVencimentos, formatMoney }: any) {
  return (
    <section>
      <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/80 mb-6">
        <ExclamationCircleIcon className="h-5 w-5 text-blue-500" /> Próximos
        Vencimentos
      </h2>
      <div className="space-y-1">
        {proximosVencimentos.length > 0 ? (
          proximosVencimentos.map((item: any) => {
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
  );
}
