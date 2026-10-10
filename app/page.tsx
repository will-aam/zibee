// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/header";

import DashboardClient from "@/app/(private)/dashboard/_components/DashboardClient";
import ReleasesClient from "@/app/(private)/releases/_components/ReleasesClient";
import GoalsClient from "@/app/(private)/goals/_components/GoalsClient";
import FixedExpenses from "@/app/(private)/fixed-expenses/_components/FixedExpenses";
import ReceitasView from "@/app/(private)/receitas/_components/ReceitasView";
import GroupManagerView from "@/app/(private)/groups/_components/GroupManagerView";
import CreditCardsClient from "@/app/(private)/credit-cards/_components/CreditCardsClient";
import SettingsClient from "@/app/(private)/settings/_components/SettingsClient";

const MAIN_TABS = ["dashboard", "lancamentos", "metas"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      setActiveTab(tab);
      // Remove o tab da url para manter limpo, se quiser
      window.history.replaceState({}, '', '/');
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleNavigate = (newTab: string) => {
    setActiveTab(newTab);
  };

  return (
    <div className={`min-h-screen bg-background pb-24 md:pb-0 flex flex-col overflow-x-hidden relative md:pl-[90px] ${activeTab === "dashboard" ? "xl:pr-[400px]" : ""}`}>
      <Header activeTab={activeTab} onNavigate={handleNavigate} />

      <div className="flex-1 w-full max-w-7xl mx-auto sm:px-6 lg:px-8 relative z-10">
        <main className="w-full py-6 md:py-8">
            {activeTab === "dashboard" && (
              <DashboardClient onNavigate={handleNavigate} />
            )}
            {activeTab === "lancamentos" && <ReleasesClient />}
            {activeTab === "cartoes" && <CreditCardsClient />}
            {activeTab === "metas" && <GoalsClient />}
            {activeTab === "configuracoes" && (
              <SettingsClient onNavigate={handleNavigate} />
            )}
            {activeTab === "despesas_fixas" && <FixedExpenses />}
            {activeTab === "grupos" && <GroupManagerView />}

            {/* NOVAS ROTAS INDEPENDENTES */}
            {activeTab === "planejador" && (
              <ReceitasView defaultTab="planejador" hideTabs />
            )}
            {activeTab === "analise-50-30-20" && (
              <ReceitasView defaultTab="analise" hideTabs />
            )}
            {activeTab === "limites-margens" && (
              <ReceitasView defaultTab="limites" hideTabs />
            )}
        </main>
      </div>
    </div>
  );
}
