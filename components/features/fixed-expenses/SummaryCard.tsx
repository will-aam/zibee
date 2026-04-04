// components/features/fixed-expenses/SummaryCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";

interface SummaryCardProps {
  totalComprometido: number;
  totalPagamentoDia05: number;
  totalPagamentoDia15: number;
  modoQuinzenal: boolean;
  setModoQuinzenal: (val: boolean) => void;
  formatMoney: (val: number) => string;
}

export function SummaryCard({
  totalComprometido,
  totalPagamentoDia05,
  totalPagamentoDia15,
  modoQuinzenal,
  setModoQuinzenal,
  formatMoney,
}: SummaryCardProps) {
  return (
    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Total Mensal Comprometido
              </p>
              <h2 className="text-4xl font-semibold tracking-tight">
                {formatMoney(totalComprometido)}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="quinzena-mode"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Visão Quinzenal
              </Label>
              <Switch
                id="quinzena-mode"
                checked={modoQuinzenal}
                onCheckedChange={setModoQuinzenal}
              />
            </div>
          </div>

          {modoQuinzenal && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Vence até dia 10
                  </span>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {formatMoney(totalPagamentoDia05)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Vence após dia 10
                  </span>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {formatMoney(totalPagamentoDia15)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
