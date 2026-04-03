// app/page.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Dashboard from "@/components/dashboard";
import Lancamentos from "@/components/lancamentos";
import Metas from "@/components/metas";
import Configuracoes from "@/components/configuracoes";
import DespesasFixas from "@/components/despesas-fixas";
import Receitas from "@/components/receitas";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 transition-all duration-300">
      {/* COMPONENTE DE NAVEGAÇÃO */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      {/* ÁREA PRINCIPAL DA APLICAÇÃO */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "md:pl-0 pt-16 md:pt-4" : "md:pl-64"
        }`}
      >
        {/* CABEÇALHO MOBILE */}
        {activeTab === "dashboard" && (
          <Header
            onOpenFilters={() => setFiltersOpen(true)}
            onNavigate={setActiveTab}
          />
        )}

        <div
          className={
            sidebarCollapsed ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : ""
          }
        >
          {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === "lancamentos" && <Lancamentos />}
          {activeTab === "receitas" && <Receitas />}
          {activeTab === "metas" && <Metas />}
          {activeTab === "configuracoes" && (
            <Configuracoes onNavigate={setActiveTab} />
          )}
          {activeTab === "despesas_fixas" && <DespesasFixas />}
        </div>
      </main>
    </div>
  );
}
