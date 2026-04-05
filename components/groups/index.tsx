"use client";

import React from "react";
import PaywallView from "./PaywallView";
import GroupManagerView from "./GroupManagerView";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function GruposConfig() {
  // O "Cérebro" já sabe se o usuário tem acesso (pois leu o banco de dados no Header)
  const { hasPremiumAccess } = useWorkspace();

  return (
    <div className="p-4 pt-8 pb-24 md:pb-8">
      {hasPremiumAccess ? <GroupManagerView /> : <PaywallView />}
    </div>
  );
}
