// component/layout/header/MobileNav.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  FireIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  FireIcon as FireSolid,
  QueueListIcon as QueueListSolid,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LancamentoFormDialog } from "@/app/(private)/releases/_components/LancamentoFormDialog";

interface MobileNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export function MobileNav({ activeTab, onNavigate }: MobileNavProps) {
  const { activeContext } = useWorkspace();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);
  const [formasPagamentoDB, setFormasPagamentoDB] = useState<any[]>([]);
  const [cartoesDB, setCartoesDB] = useState<any[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDialogOpen || !userId) return;

    const fetchDialogData = async () => {
      let groupId: string | null = null;

      if (activeContext === "grupo") {
        const { data: myGroup } = await supabase
          .from("grupos")
          .select("id")
          .eq("criador_id", userId)
          .maybeSingle();

        if (myGroup) {
          groupId = myGroup.id;
        } else {
          const { data: membership } = await supabase
            .from("membros_grupo")
            .select("grupo_id")
            .eq("user_id", userId)
            .eq("status", "Aceito")
            .maybeSingle();
          if (membership) groupId = membership.grupo_id;
        }
      }

      setCurrentGroupId(groupId);

      let queryCat = supabase.from("categorias").select("*").order("nome");
      let queryCartoes = supabase
        .from("cartoes_credito")
        .select("*")
        .order("nome");

      if (activeContext === "grupo" && groupId) {
        queryCat = queryCat.eq("grupo_id", groupId);
        queryCartoes = queryCartoes.eq("grupo_id", groupId);
      } else {
        queryCat = queryCat.eq("user_id", userId);
        queryCartoes = queryCartoes.eq("user_id", userId);
      }

      const [resCat, resPay, resCartoes] = await Promise.all([
        queryCat,
        supabase.from("formas_pagamento").select("*").order("nome"),
        queryCartoes,
      ]);

      setCategoriasDB(resCat.data || []);
      setFormasPagamentoDB(resPay.data || []);
      setCartoesDB(resCartoes.data || []);
    };

    fetchDialogData();
  }, [isDialogOpen, userId, activeContext]);

  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-2xl transition-all duration-300 ease-in-out active:scale-90 ${
      isActive
        ? "text-primary bg-primary/10 px-3.5 py-2"
        : "text-muted-foreground px-2 py-2 hover:text-foreground"
    }`;

  const tabs = [
    { id: "dashboard", label: "Início", Icon: HomeIcon, IconActive: HomeSolid },
    {
      id: "lancamentos",
      label: "Lançamentos",
      Icon: DocumentTextIcon,
      IconActive: DocumentTextSolid,
    },
  ];

  const tabsRight = [
    { id: "metas", label: "Metas", Icon: FireIcon, IconActive: FireSolid },
    {
      id: "mais",
      label: "Mais",
      Icon: QueueListIcon,
      IconActive: QueueListSolid,
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 w-full z-50 md:hidden">
        <div className="bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center h-16 sm:h-20">
            <div className="flex-1 flex items-center justify-around px-2">
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
                          ? "max-w-[90px] ml-1.5 opacity-100" // Ajustado de 80px para 90px
                          : "max-w-0 ml-0 opacity-0"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-20 flex items-start justify-center -mt-7">
              <button
                onClick={() => setIsDialogOpen(true)}
                // Removido: border-4 border-background
                className="relative z-10 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-90 hover:scale-105 hover:shadow-xl hover:shadow-primary/40"
                aria-label="Novo Lançamento"
              >
                <PlusIcon className="h-7 w-7" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-around px-2">
              {tabsRight.map(({ id, label, Icon, IconActive }) => {
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
                          ? "max-w-[90px] ml-1.5 opacity-100" // Ajustado de 80px para 90px
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
        </div>
      </div>

      <LancamentoFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
        }}
        lancamentoToEdit={null}
        userId={userId}
        categoriasDB={categoriasDB}
        formasPagamentoDB={formasPagamentoDB}
        cartoesDB={cartoesDB}
        activeContext={activeContext}
        groupId={currentGroupId}
      />
    </>
  );
}
