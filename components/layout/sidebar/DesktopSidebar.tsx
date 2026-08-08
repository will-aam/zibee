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
import { ProfileMenu } from "../header/ProfileMenu";
import {
  HomeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  FunnelIcon,
  FireIcon,
  BriefcaseIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
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

interface DesktopSidebarProps {
  activeTab: string;
  onNavigate?: (tab: string) => void;
  userName: string;
  avatarUrl: string;
  pendingInvite: any;
  isLoggingOut: boolean;
  onLogout: () => void;
  onOpenAvatarModal: () => void;
}

export function DesktopSidebar(props: DesktopSidebarProps) {
  const {
    activeTab,
    onNavigate,
    avatarUrl,
    pendingInvite,
    isLoggingOut,
    onLogout,
  } = props;

  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-2xl transition-all duration-300 ease-in-out active:scale-[0.96] h-12 w-12 mx-auto ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
    <aside
      className={`hidden md:flex flex-col items-center justify-between fixed left-0 top-0 bottom-0 z-50 w-[90px] bg-transparent py-8 px-2 ${sora.className}`}
    >
      {/* LOGO */}
      <div
        className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onNavigate?.("dashboard")}
        title="Zibee"
      >
        <Image
          src="/icons8-abelha-64.png"
          alt="Logo"
          width={40}
          height={40}
          priority
        />
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex flex-col gap-2 overflow-y-auto custom-scrollbar hide-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={navButtonClass(isActive)}
              title={item.label}
            >
              {isActive ? (
                <item.IconActive className="h-6 w-6 shrink-0" />
              ) : (
                <item.Icon className="h-6 w-6 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* RODAPÉ (PERFIL E SAIR) */}
      <div className="flex flex-col items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative h-12 w-12 rounded-full ring-2 ring-border hover:ring-primary transition-all outline-none active:scale-95">
              <img
                src={avatarUrl}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full rounded-full object-cover bg-muted"
              />
              {pendingInvite && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-500 border-2 border-background rounded-full" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="right"
            sideOffset={16}
            className="w-72 p-5 rounded-3xl shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl z-[100]"
          >
            <ProfileMenu {...props} />
          </PopoverContent>
        </Popover>

        <button 
          onClick={onLogout} 
          disabled={isLoggingOut} 
          className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all duration-300 ease-in-out active:scale-95" 
          title="Sair da Conta"
        >
          {isLoggingOut ? (
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
          ) : (
            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          )}
        </button>
      </div>
    </aside>
  );
}
