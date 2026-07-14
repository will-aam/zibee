import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { WalletIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/solid";

interface SummaryCardProps {
  totalComprometido: number;
  totalPrimeiraQuinzena: number;
  totalSegundaQuinzena: number;
  modoQuinzenal: boolean;
  setModoQuinzenal: (val: boolean) => void;
  formatMoney: (val: number) => string;
}

export function SummaryCard({
  totalComprometido,
  totalPrimeiraQuinzena,
  totalSegundaQuinzena,
  modoQuinzenal,
  setModoQuinzenal,
  formatMoney,
}: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-5 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ArrowTrendingDownIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Total Mensal
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {formatMoney(totalComprometido)}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Label
            htmlFor="quinzena-mode"
            className="text-[10px] text-muted-foreground uppercase cursor-pointer tracking-wider font-bold hidden sm:block"
          >
            Ver por Quinzena
          </Label>
          <Switch
            id="quinzena-mode"
            checked={modoQuinzenal}
            onCheckedChange={setModoQuinzenal}
            className="scale-90"
          />
        </div>
      </div>

      {modoQuinzenal && (
        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-border/50">
          {/* PRIMEIRA QUINZENA (Dias 1 a 14) */}
          <div className="rounded-xl p-3 md:p-4 bg-blue-500/5 border border-blue-500/10 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <WalletIcon className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest truncate">
                1ª Quinzena (1 a 14)
              </span>
            </div>
            <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatMoney(totalPrimeiraQuinzena)}
            </p>
          </div>

          {/* SEGUNDA QUINZENA (Dias 15 a 31) */}
          <div className="rounded-xl p-3 md:p-4 bg-emerald-500/5 border border-emerald-500/10 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <WalletIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest truncate">
                2ª Quinzena (15 a 31)
              </span>
            </div>
            <p className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalSegundaQuinzena)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
