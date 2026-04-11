"use client";

import * as React from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BriefcaseIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  UserGroupIcon as UserGroupSolid,
  BriefcaseIcon as BriefcaseSolid,
  FireIcon as FireSolid,
} from "@heroicons/react/24/solid";

interface MobileNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export function MobileNav({ activeTab, onNavigate }: MobileNavProps) {
  // Removido o "-translate-y-1" e "shadow-sm" para um visual flat e sem engasgos
  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-full transition-all duration-300 ease-in-out active:scale-95 ${
      isActive
        ? "bg-primary/15 text-primary px-3.5 py-2"
        : "text-muted-foreground px-2 py-2"
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
      id: "investimentos",
      label: "Investimentos",
      Icon: BriefcaseIcon,
      IconActive: BriefcaseSolid,
    },
    { id: "metas", label: "Metas", Icon: FireIcon, IconActive: FireSolid },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-3 h-16 sm:h-20">
        {tabs.map(({ id, label, Icon, IconActive }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={navButtonClass(isActive)}
              aria-label={label}
            >
              {isActive ? (
                <IconActive className="h-6 w-6 shrink-0" />
              ) : (
                <Icon className="h-6 w-6 shrink-0" />
              )}

              <span
                className={`overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "max-w-[85px] ml-1.5 opacity-100"
                    : "max-w-0 ml-0 opacity-0"
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
