// component/layout/header/MobileNav.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  FireIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  FireIcon as FireSolid,
  BeakerIcon as BeakerIconSolid,
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
      Icon: BeakerIcon,
      IconActive: BeakerIconSolid,
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 w-full z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="relative flex items-center justify-between h-16 px-2 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          
          <div className="absolute inset-0 bg-background -z-10"></div>

          <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 w-[120px] h-[40px] pointer-events-none -z-10">
            <svg viewBox="0 0 120 40" className="w-full h-full">
              <path 
                d="M 0 40 L 0 30 L 15.5 30 A 14 14 0 0 0 28.48 21.25 A 34 34 0 0 1 91.52 21.25 A 14 14 0 0 0 104.5 30 L 120 30 L 120 40 Z" 
                fill="var(--background)" 
              />
            </svg>
          </div>

          <div className="flex-1 flex justify-around items-center z-10">
            {tabs.map(({ id, label, Icon, IconActive }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${
                    isActive ? "text-primary translate-y-[-2px]" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={label}
                >
                  {isActive ? <IconActive className="h-6 w-6 mb-1" /> : <Icon className="h-6 w-6" />}
                  {isActive && <span className="text-[10px] font-medium leading-none">{label}</span>}
                </button>
              );
            })}
          </div>

          <div className="relative w-20 h-full flex justify-center pointer-events-none z-20">
            <button 
              onClick={() => setIsDialogOpen(true)}
              className="absolute -top-6 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all duration-200 pointer-events-auto"
              aria-label="Novo Lançamento"
            >
              <PlusIcon className="w-7 h-7" />
            </button>
          </div>

          <div className="flex-1 flex justify-around items-center z-10">
            {tabsRight.map(({ id, label, Icon, IconActive }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${
                    isActive ? "text-primary translate-y-[-2px]" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={label}
                >
                  {isActive ? <IconActive className="h-6 w-6 mb-1" /> : <Icon className="h-6 w-6" />}
                  {isActive && <span className="text-[10px] font-medium leading-none">{label}</span>}
                </button>
              );
            })}
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
