"use client";

import * as React from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BanknotesIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  UserGroupIcon as UserGroupSolid,
  BanknotesIcon as BanknotesSolid,
  FireIcon as FireSolid,
} from "@heroicons/react/24/solid";

interface MobileNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export function MobileNav({ activeTab, onNavigate }: MobileNavProps) {
  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-full transition-all duration-300 ease-in-out active:scale-95 ${
      isActive
        ? "bg-primary/15 text-primary px-5 py-2.5"
        : "text-muted-foreground px-4 py-2.5"
    }`;

  const tabs = [
    { id: "dashboard", label: "Início", Icon: HomeIcon, IconActive: HomeSolid },
    {
      id: "lancamentos",
      label: "Lançamentos",
      Icon: DocumentTextIcon,
      IconActive: DocumentTextSolid,
    },
    {
      id: "grupos",
      label: "Grupos",
      Icon: UserGroupIcon,
      IconActive: UserGroupSolid,
    },
    {
      id: "receitas",
      label: "Resumo",
      Icon: BanknotesIcon,
      IconActive: BanknotesSolid,
    },
    { id: "metas", label: "Metas", Icon: FireIcon, IconActive: FireSolid }, // Trocado Config por Metas
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] ">
      <div className="flex items-center justify-around px-2 h-20">
        {tabs.map(({ id, label, Icon, IconActive }) => {
          // Mantive a lógica para Metas ser ativa quando clicada
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={navButtonClass(isActive)}
            >
              {isActive ? (
                <IconActive className="h-7 w-7 shrink-0" />
              ) : (
                <Icon className="h-7 w-7 shrink-0" />
              )}
              <span
                className={`overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "max-w-[100px] ml-2 opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
