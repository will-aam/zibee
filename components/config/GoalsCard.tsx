"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlagIcon, ArrowRightIcon } from "@heroicons/react/24/solid";

interface GoalsCardProps {
  onNavigate?: (tab: string) => void;
}

export function GoalsCard({ onNavigate }: GoalsCardProps) {
  const go = () => onNavigate?.("metas");

  return (
    <Card className="transition-colors hover:bg-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FlagIcon className="h-5 w-5 text-primary" />
          Metas Financeiras
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <button
          type="button"
          onClick={go}
          className="w-full text-left rounded-xl p-3 -m-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
        >
          <p className="text-sm font-medium">Gerenciar metas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e acompanhe seus objetivos financeiros.
          </p>

          <div className="mt-3 flex items-center justify-end">
            <Button
              variant="outline"
              className="gap-2 pointer-events-none"
              tabIndex={-1}
            >
              Acessar
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
