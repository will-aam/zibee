// components/config/ThemeToggleCard.tsx
"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";

export function ThemeToggleCard() {
  const { setTheme, resolvedTheme } = useTheme();
  // Estado para garantir que o componente só renderize o ícone após carregar no navegador
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  return (
    <Card
      onClick={toggleTheme}
      className="flex flex-col items-center justify-center p-4 gap-2 cursor-pointer transition-all hover:shadow-md hover:scale-105 active:scale-95"
    >
      {/* Se não estiver montado, mostra um espaço vazio do mesmo tamanho para não quebrar o layout */}
      {!mounted ? (
        <div className="h-6 w-6" />
      ) : resolvedTheme === "dark" ? (
        <SunIcon className="h-6 w-6 text-amber-500" /> // Sol amarelinho no tema escuro
      ) : (
        <MoonIcon className="h-6 w-6 text-primary" /> // Lua azulzinha no tema claro
      )}

      <span className="text-xs font-medium text-center">
        {mounted && resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
      </span>
    </Card>
  );
}
