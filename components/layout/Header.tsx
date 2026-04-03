// components/layout/Header.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { User, SlidersHorizontal } from "lucide-react";

interface HeaderProps {
  onOpenFilters: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Header({ onOpenFilters }: HeaderProps) {
  const session = authClient.useSession();
  const userName = session.data?.user.name || "Zibee";

  return (
    <header className="md:hidden bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
      {/* Ícone de perfil */}
      <div className="shrink-0 h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
        <User className="h-6 w-6" />
      </div>

      {/* Saudação + nome */}
      <div className="flex-1 min-w-0">
        <p className="text-sm opacity-90">{getGreeting()},</p>
        <p className="font-bold text-base truncate">{userName}!</p>
      </div>

      {/* Ícone de filtro */}
      <button
        onClick={onOpenFilters}
        className="shrink-0 p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer"
        aria-label="Abrir filtros"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </header>
  );
}
