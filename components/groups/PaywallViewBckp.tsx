// components/groups/PaywallView.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { handleWhatsAppContact } from "@/lib/utils";

import {
  Squares2X2Icon as Squares2X2Solid,
  ClockIcon as ClockSolid,
  SparklesIcon as SparklesSolid,
} from "@heroicons/react/24/solid";

// --- COMPONENTE IONIC DA CALCULADORA ---
const CalculatorIonic = ({ className }: { className?: string }) => (
  // @ts-expect-error Tag customizada do Ionicons
  <ion-icon
    name="calculator"
    class={className}
    style={{ fontSize: "1.25rem", lineHeight: 1 }}
  />
);
// ----------------------------------------

export default function PaywallView() {
  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Cabeçalho de Venda */}
      <div className="text-center space-y-3 mb-8 md:mb-10">
        <Badge
          variant="secondary"
          className="px-3 py-1 rounded-full text-primary bg-primary/10"
        >
          Recurso Premium
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Desbloqueie os Grupos
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Divida as contas de forma inteligente e sem estresse.
        </p>
      </div>

      {/* ======================= LAYOUT MOBILE (ESTILO CARDS SOLTOS) ======================= */}
      <div className="md:hidden space-y-8">
        {/* Card de Preço Mobile */}
        <div className="relative bg-primary/10 rounded-3xl p-6 border border-primary/20">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-2xl rounded-tr-3xl font-bold text-xs flex items-center gap-1">
            <SparklesSolid className="w-3.5 h-3.5" /> Acesso Antecipado
          </div>
          <div className="mt-2 space-y-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-baseline gap-2">
              R$ 47,90{" "}
              <span className="text-sm text-muted-foreground font-normal line-through">
                R$ 97,00
              </span>
            </h2>
            <p className="text-sm font-medium text-foreground">
              Taxa única. Acesso vitalício. Sem mensalidades.
            </p>
          </div>
        </div>

        {/* Lista de Benefícios Mobile */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg px-1">O que você ganha:</h3>
          <ul className="space-y-4">
            <li className="flex gap-3 items-start bg-background/60 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                <Squares2X2Solid className="w-5 h-5 text-primary" />
              </div>
              <div>
                <strong className="block text-foreground">
                  Espaços Isolados
                </strong>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  Alterne entre o seu espaço &quot;Pessoal&quot; e o espaço do
                  &quot;Grupo&quot; com apenas um clique.
                </span>
              </div>
            </li>
            <li className="flex gap-3 items-start bg-background/60 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                <CalculatorIonic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <strong className="block text-foreground">
                  Cálculo Inteligente
                </strong>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  O sistema cruza os lançamentos e mostra de forma simples quem
                  deve a quem no fim do mês.
                </span>
              </div>
            </li>
            <li className="flex gap-3 items-start bg-background/60 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                <ClockSolid className="w-5 h-5 text-primary" />
              </div>
              <div>
                <strong className="block text-foreground">Feed do Grupo</strong>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  Uma linha do tempo exclusiva para os membros acompanharem os
                  gastos compartilhados.
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Regra de uso Mobile */}
        <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/50">
          <h4 className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-500 mb-2 text-base">
            Regra de uso: Só o Criador Paga!
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            Você adquire o acesso, cria o seu grupo e pode convidar sua galera.{" "}
            <strong>Seus convidados não pagam absolutamente nada</strong> para
            entrar e registrar despesas no seu grupo.
          </p>
        </div>

        {/* Botão de Ação Mobile */}
        <Button
          size="lg"
          className="w-full h-14 text-lg rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
          onClick={handleWhatsAppContact}
        >
          Solicitar Acesso
        </Button>
      </div>

      {/* ======================= LAYOUT DESKTOP (ESTILO CARD ÚNICO) ======================= */}
      <div className="hidden md:block">
        <div className="border-2 border-primary/20 shadow-xl rounded-4xl overflow-hidden relative bg-background">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1.5 rounded-bl-2xl rounded-tr-4xl font-bold text-sm flex items-center gap-1.5 z-10">
            <SparklesSolid className="w-4 h-4" /> Acesso Antecipado
          </div>

          {/* Header do Card Desktop */}
          <div className="bg-muted/30 p-8 pb-10 border-b border-border/50">
            <h2 className="text-3xl font-bold tracking-tight flex items-baseline gap-3">
              R$ 47,90{" "}
              <span className="text-base text-muted-foreground font-normal line-through">
                R$ 97,00
              </span>
            </h2>
            <p className="text-base font-medium text-foreground mt-2">
              Taxa única. Acesso vitalício. Sem mensalidades.
            </p>
            <p className="text-xs text-muted-foreground mt-3 italic">
              * Preço especial de lançamento para os primeiros usuários. O valor
              será reajustado nas próximas atualizações.
            </p>
          </div>

          {/* Conteúdo do Card Desktop */}
          <div className="p-8 space-y-8">
            <div className="space-y-5">
              <h3 className="font-semibold text-lg border-b border-border pb-2">
                O que você ganha:
              </h3>
              <ul className="space-y-5">
                <li className="flex gap-4 items-start">
                  <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                    <Squares2X2Solid className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <strong className="block text-foreground text-base">
                      Espaços Isolados
                    </strong>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      Alterne entre o seu espaço &quot;Pessoal&quot; e o espaço
                      do &quot;Grupo&quot; com apenas um clique.
                    </span>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                    <CalculatorIonic className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <strong className="block text-foreground text-base">
                      Cálculo Inteligente
                    </strong>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      O sistema cruza os lançamentos e mostra de forma simples
                      quem deve a quem no fim do mês.
                    </span>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                    <ClockSolid className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <strong className="block text-foreground text-base">
                      Feed do Grupo
                    </strong>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      Uma linha do tempo exclusiva para os membros acompanharem
                      os gastos compartilhados.
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Alerta de Regra de uso Desktop */}
            <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50">
              <h4 className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-500 mb-2">
                Regra de uso: Só o Criador Paga!
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                Você adquire o acesso, cria o seu grupo e pode convidar sua
                galera.{" "}
                <strong>Seus convidados não pagam absolutamente nada</strong>{" "}
                para entrar e registrar despesas no seu grupo.
              </p>
            </div>

            {/* Botão de Ação Desktop */}
            <Button
              size="lg"
              className="w-full h-16 text-lg rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
              onClick={handleWhatsAppContact}
            >
              Solicitar Acesso Premium
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
