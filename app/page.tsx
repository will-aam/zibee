// app/page.tsx
"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Dashboard from "@/components/dashboard";
import Lancamentos from "@/components/releases";
import Metas from "@/components/goals";
import Configuracoes from "@/components/configuracoes";
import DespesasFixas from "@/components/features/fixed-expenses";
import Receitas from "@/components/receitas";
import GruposConfig from "@/components/groups";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 flex flex-col">
      <Header activeTab={activeTab} onNavigate={setActiveTab} />

      <main className="flex-1 w-full max-w-7xl mx-auto sm:px-6 lg:px-8 py-6 md:py-8 transition-all duration-300">
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "lancamentos" && <Lancamentos />}
        {activeTab === "receitas" && <Receitas />}
        {activeTab === "metas" && <Metas />}
        {activeTab === "configuracoes" && (
          <Configuracoes onNavigate={setActiveTab} />
        )}
        {activeTab === "despesas_fixas" && <DespesasFixas />}
        {activeTab === "grupos" && <GruposConfig />}
      </main>
    </div>
  );
}
