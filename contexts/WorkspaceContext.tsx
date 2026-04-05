// contexts/WorkspaceContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type ContextType = "pessoal" | "grupo";

interface WorkspaceContextData {
  activeContext: ContextType;
  setActiveContext: (context: ContextType) => void;
  hasPremiumAccess: boolean;
  setHasPremiumAccess: (status: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextData | undefined>(
  undefined,
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeContext, setActiveContext] = useState<ContextType>("pessoal");
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);

  // Persistência básica no localStorage (para não perder os dados ao dar F5)
  useEffect(() => {
    const savedContext = localStorage.getItem("@zibee:context") as ContextType;
    const savedPremium = localStorage.getItem("@zibee:premium");

    if (savedContext) setActiveContext(savedContext);
    if (savedPremium === "true") setHasPremiumAccess(true);
  }, []);

  const handleSetContext = (ctx: ContextType) => {
    setActiveContext(ctx);
    localStorage.setItem("@zibee:context", ctx);
  };

  const handleSetPremium = (status: boolean) => {
    setHasPremiumAccess(status);
    localStorage.setItem("@zibee:premium", String(status));
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeContext,
        setActiveContext: handleSetContext,
        hasPremiumAccess,
        setHasPremiumAccess: handleSetPremium,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// Hook personalizado para usar o contexto facilmente
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      "useWorkspace deve ser usado dentro de um WorkspaceProvider",
    );
  }
  return context;
}
