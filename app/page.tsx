"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Dashboard from "@/components/dashboard";
import Lancamentos from "@/components/lancamentos";
import Metas from "@/components/metas";
import Configuracoes from "@/components/configuracoes";
import DespesasFixas from "@/components/despesas-fixas";
import Receitas from "@/components/receitas";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 flex flex-col">
      {/* O Header agora é global e controla a navegação em todas as abas */}
      <Header activeTab={activeTab} onNavigate={setActiveTab} />

      {/* ÁREA PRINCIPAL DA APLICAÇÃO */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 transition-all duration-300">
        {/* Renderização condicional das abas */}
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "lancamentos" && <Lancamentos />}
        {activeTab === "receitas" && <Receitas />}
        {activeTab === "metas" && <Metas />}
        {activeTab === "configuracoes" && (
          <Configuracoes onNavigate={setActiveTab} />
        )}
        {activeTab === "despesas_fixas" && <DespesasFixas />}
      </main>
    </div>
  );
}
