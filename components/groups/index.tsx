"use client";

import React from "react";
import PaywallView from "./PaywallView";
import GroupManagerView from "./GroupManagerView";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext"; // Importando o "cérebro"

export default function GruposConfig() {
  // Agora lemos e escrevemos no estado global!
  const { hasPremiumAccess, setHasPremiumAccess, setActiveContext } =
    useWorkspace();

  const togglePremium = () => {
    const novoStatus = !hasPremiumAccess;
    setHasPremiumAccess(novoStatus);

    // Se o utilizador perder o premium, forçamos o regresso ao contexto "pessoal"
    if (!novoStatus) {
      setActiveContext("pessoal");
    }
  };

  return (
    <div className="p-4 pt-8 pb-24 md:pb-8">
      {/* BOTÃO DE TESTE GLOBAL */}
      <div className="flex justify-center mb-8">
        <Button
          variant="outline"
          onClick={togglePremium}
          className="rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary/10 shadow-sm"
        >
          {hasPremiumAccess
            ? "Testar Visual: Mudar para 'Sem Acesso'"
            : "Testar Visual: Mudar para 'Com Acesso'"}
        </Button>
      </div>

      {hasPremiumAccess ? <GroupManagerView /> : <PaywallView />}
    </div>
  );
}
