"use client";

import * as React from "react";
import Image from "next/image";
import { sora, audiowide } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProfileMenu } from "./ProfileMenu";
import {
  HomeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  FunnelIcon,
  FireIcon,
  BriefcaseIcon,
  MoonIcon,
  SunIcon,
  BellIcon, // <-- ADICIONADO
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  BanknotesIcon as BanknotesSolid,
  Cog6ToothIcon as CogSolid,
  UserGroupIcon as UserGroupSolid,
  FireIcon as FireSolid,
  BriefcaseIcon as BriefcaseSolid,
} from "@heroicons/react/24/solid";
import { CreditCardIcon as CreditCardOutline } from "@heroicons/react/24/outline";
import { CreditCardIcon as CreditCardSolid } from "@heroicons/react/24/solid";

import { useTheme } from "next-themes";
// Importe o changelog que criamos:
import { appUpdates } from "@/lib/changelog";

const CalculatorOutline = ({ className }: { className?: string }) => (
  // @ts-expect-error Tag customizada do Ionicons
  <ion-icon
    name="calculator-outline"
    class={className}
    style={{ fontSize: "1.5rem", lineHeight: 1 }}
    suppressHydrationWarning={true}
  />
);
const CalculatorSolid = ({ className }: { className?: string }) => (
  // @ts-expect-error Tag customizada do Ionicons
  <ion-icon
    name="calculator"
    class={className}
    style={{ fontSize: "1.5rem", lineHeight: 1 }}
    suppressHydrationWarning={true}
  />
);

interface DesktopHeaderProps {
  activeTab: string;
  onNavigate?: (tab: string) => void;
  userName: string;
  avatarUrl: string;
  pendingInvite: any;
  isLoggingOut: boolean;
  onLogout: () => void;
  onOpenAvatarModal: () => void;
  onOpenFilter: () => void;
}

export function DesktopHeader(props: DesktopHeaderProps) {
  const {
    activeTab,
    onNavigate,
    userName,
    avatarUrl,
    pendingInvite,
    onOpenFilter,
  } = props;

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // LOGICA DO SINO DE NOVIDADES
  const [hasNewUpdates, setHasNewUpdates] = React.useState(false);

  React.useEffect(() => {
    if (appUpdates.length > 0) {
      const latestUpdateId = appUpdates[0].id; // Pega o ID da novidade mais recente
      const lastSeenId = localStorage.getItem("zibee_last_seen_update");

      // Se não houver nada salvo, ou se o ID salvo for diferente do mais recente, brilha!
      if (lastSeenId !== latestUpdateId) {
        setHasNewUpdates(true);
      }
    }
  }, []);

  const handleOpenUpdates = () => {
    // Quando clicado, tira a bolinha vermelha e avisa aos outros componentes
    if (appUpdates.length > 0) {
      localStorage.setItem("zibee_last_seen_update", appUpdates[0].id);
      setHasNewUpdates(false);
      window.dispatchEvent(new Event("zibee:open-updates")); // Aviso global para abrir o Modal
    }
  };

  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-2xl transition-transform transition-opacity duration-300 ease-in-out active:scale-[0.96] ${
      isActive
        ? "bg-primary/10 text-primary px-5 py-3"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground px-4 py-3"
    }`;
  const navItems = [
    {
      id: "dashboard",
      label: "Início",
      Icon: HomeIcon,
      IconActive: HomeSolid,
    },
    {
      id: "lancamentos",
      label: "Lançamentos",
      Icon: DocumentTextIcon,
      IconActive: DocumentTextSolid,
    },
    {
      id: "cartoes",
      label: "Cartões",
      Icon: CreditCardOutline,
      IconActive: CreditCardSolid,
    },
    {
      id: "receitas",
      label: "Planejamento",
      Icon: CalculatorOutline,
      IconActive: CalculatorSolid,
    },
    {
      id: "investimentos",
      label: "Investimentos",
      Icon: BriefcaseIcon,
      IconActive: BriefcaseSolid,
    },
    {
      id: "grupos",
      label: "Grupos",
      Icon: UserGroupIcon,
      IconActive: UserGroupSolid,
    },

    { id: "metas", label: "Metas", Icon: FireIcon, IconActive: FireSolid },
    {
      id: "configuracoes",
      label: "Configurações",
      Icon: Cog6ToothIcon,
      IconActive: CogSolid,
    },
  ];

  return (
    <header
      className={`hidden md:flex items-center justify-between px-8 py-5 bg-background/80 backdrop-blur-md sticky top-0 z-50 ${sora.className}`}
    >
      {/* LOGO */}
      <div
        className="flex items-center gap-4 cursor-pointer mr-6 hover:opacity-80 transition-opacity"
        onClick={() => onNavigate?.("dashboard")}
      >
        <Image
          src="/icons8-abelha-64.png"
          alt="Logo"
          width={44}
          height={44}
          priority
        />
        <div className="hidden lg:block">
          <h1
            className={`text-xl text-primary truncate ${audiowide.className}`}
          >
            Zibee - {userName}
          </h1>
        </div>
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex flex-1 items-center gap-2 justify-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={navButtonClass(isActive)}
            >
              {isActive ? (
                <item.IconActive className="h-6 w-6 shrink-0" />
              ) : (
                <item.Icon className="h-6 w-6 shrink-0" />
              )}
              <span
                className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ${isActive ? "max-w-[150px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* CONTROLES DIREITA */}
      <div className="flex items-center gap-3 ml-4">
        {activeTab === "dashboard" && (
          <Button
            variant="outline"
            className="rounded-2xl h-11 px-5"
            onClick={onOpenFilter}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            <span className="text-base font-medium">Filtrar</span>
          </Button>
        )}

        {/* --- NOVO: BOTÃO DE NOTIFICAÇÕES (SINO) --- */}
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-2xl h-11 w-11 hover:bg-muted/50"
          onClick={handleOpenUpdates}
          title="Novidades"
        >
          <BellIcon className="h-5 w-5 text-muted-foreground" />
          {hasNewUpdates && (
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-background"></span>
            </span>
          )}
        </Button>
        {/* ------------------------------------------ */}

        {/* BOTÃO DE ALTERNAR TEMA */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-2xl h-11 w-11 hover:bg-muted/50"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={mounted && theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        >
          {mounted && theme === "dark" ? (
            <SunIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <MoonIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>

        <div className="h-8 w-px bg-border mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative h-12 w-12 rounded-full ring-2 ring-border hover:ring-primary transition-all outline-none active:scale-95">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-full w-full rounded-full object-cover"
              />
              {pendingInvite && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-500 border-2 border-background rounded-full" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 p-5 rounded-3xl shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl z-100"
          >
            <ProfileMenu {...props} />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
