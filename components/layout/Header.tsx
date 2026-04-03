"use client";

import { authClient } from "@/lib/auth-client";
import { User, Settings } from "lucide-react";

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
    <section className="md:hidden">
      {/* HERO (área grande azul) */}
      <header
        className="
          bg-primary text-primary-foreground
          px-4
          pt-[max(20px,env(safe-area-inset-top))]
          pb-16
        "
      >
        <div className="flex items-center gap-4">
          {/* Ícone de perfil / futuramente avatar */}
          <div className="shrink-0 h-14 w-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="h-8 w-8" />
          </div>

          {/* Saudação + nome */}
          <div className="flex-1 min-w-0">
            <p className="text-sm opacity-90">{getGreeting()},</p>
            <p className="font-bold text-xl leading-tight truncate">
              {userName}!
            </p>
          </div>

          {/* Botão de configurações (por enquanto reaproveitando handler) */}
          <button
            onClick={onOpenFilters}
            className="shrink-0 p-3 rounded-2xl active:scale-95 transition"
            aria-label="Abrir configurações"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/*
      // CARD “flutuando” — você vai substituir por outro componente.
      // Exemplo:
      // import QuickAccessCard from "@/components/....";
      // <QuickAccessCard /> */}
      <div className="-mt-10 px-4">
        <div className="rounded-2xl bg-background shadow-sm border p-4">
          <p className="text-sm text-muted-foreground">Acesso rápido</p>
          <p className="text-base font-semibold">Seu painel</p>
        </div>
      </div>
    </section>
  );
}
