"use client";

import React, { useState } from "react";
import PaywallView from "./PaywallView";
import GroupManagerView from "./GroupManagerView";
import { Button } from "@/components/ui/button";

export default function GruposConfig() {
  // ATENÇÃO: Estado Mockado.
  // No futuro, isso vai ler do banco: user.can_create_groups
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);

  return (
    <div className="p-4 pt-8 pb-24 md:pb-8">
      {/* BOTÃO DE TESTE MOCKADO (Apenas para você visualizar a troca enquanto desenvolve) */}
      <div className="flex justify-center mb-8">
        <Button
          variant="outline"
          onClick={() => setHasPremiumAccess(!hasPremiumAccess)}
          className="rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary/10"
        >
          {hasPremiumAccess
            ? "Testar Visual: Mudar para 'Sem Acesso'"
            : "Testar Visual: Mudar para 'Com Acesso'"}
        </Button>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL: 
          Se tem acesso (Premium ou Convidado), mostra o painel do grupo.
          Se não tem acesso, mostra a barreira de pagamento (Paywall).
      */}
      {hasPremiumAccess ? <GroupManagerView /> : <PaywallView />}
    </div>
  );
}
