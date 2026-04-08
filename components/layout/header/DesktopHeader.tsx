"use client";

import * as React from "react";
import Image from "next/image";
import { Sora, Audiowide } from "next/font/google";
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
  BriefcaseIcon, // NOVO: Ícone outline para Investimentos
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  BanknotesIcon as BanknotesSolid,
  Cog6ToothIcon as CogSolid,
  UserGroupIcon as UserGroupSolid,
  FireIcon as FireSolid,
  BriefcaseIcon as BriefcaseSolid, // NOVO: Ícone solid para Investimentos
  CalculatorIcon as CalculatorSolid, // NOVO: Ícone solid para Resumo
} from "@heroicons/react/24/solid";
import { CalculatorIcon } from "lucide-react";

const sora = Sora({ subsets: ["latin"] });
const audiowide = Audiowide({ weight: "400", subsets: ["latin"] });

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

  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-2xl transition-all duration-300 ease-in-out active:scale-[0.96] ${
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
      id: "receitas",
      label: "Resumo",
      Icon: CalculatorIcon, // NOVO: Ícone outline para Resumo
      IconActive: CalculatorSolid,
    },
    // NOVA ABA DE INVESTIMENTOS ADICIONADA AQUI
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
      <div className="flex items-center gap-4 ml-4">
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
