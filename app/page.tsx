// app/page.tsx
"use client";

import { useState } from "react";
import { Audiowide } from "next/font/google";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/dashboard";
import Lancamentos from "@/components/lancamentos";
import Metas from "@/components/metas";
import Configuracoes from "@/components/configuracoes";
import DespesasFixas from "@/components/despesas-fixas";
import Receitas from "@/components/receitas";
import {
  LayoutDashboard,
  Receipt,
  Target,
  Settings,
  Home as HomeIcon,
  FileText,
  Cog,
  PieChart,
  LogOut, // <--- ÍCONE DE SAIR
} from "lucide-react";
import { Button } from "@/components/ui/button";

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const router = useRouter();
  const session = authClient.useSession(); // <--- PEGA DADOS DO USUÁRIO

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login"); // Manda pro login ao sair
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 transition-all duration-300">
      {/* --- SIDEBAR (Desktop) --- */}
      <aside
        className={`hidden md:fixed md:left-0 md:top-0 md:flex md:h-screen md:flex-col md:border-r md:bg-card transition-all duration-300 ${
          sidebarCollapsed ? "md:w-20" : "md:w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              {/* O seu ícone da pasta public */}
              <Image
                src="/icons8-abelha-64.png"
                alt="Logo"
                width={32}
                height={32}
                className="rounded-md shrink-0"
              />

              {/* O nome com a fonte Audiowide aplicada */}
              <h1
                className={`text-xl text-primary truncate ${audiowide.className}`}
              >
                {session.data?.user.name || "Zibee"}
              </h1>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto shrink-0"
          >
            {/* (Ícone do botão de fechar/abrir que já estava aqui) */}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex w-full items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={sidebarCollapsed ? "Dashboard" : ""}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-medium">Dashboard</span>
            )}
          </button>

          {/* Lançamentos */}
          <button
            onClick={() => setActiveTab("lancamentos")}
            className={`flex w-full items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "lancamentos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={sidebarCollapsed ? "Lançamentos" : ""}
          >
            <Receipt className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-medium">Lançamentos</span>
            )}
          </button>

          {/* Planos (Receitas) */}
          <button
            onClick={() => setActiveTab("receitas")}
            className={`flex w-full items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "receitas"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={sidebarCollapsed ? "Planos" : ""}
          >
            <PieChart className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Planos</span>}
          </button>

          {/* Metas */}
          <button
            onClick={() => setActiveTab("metas")}
            className={`flex w-full items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "metas"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={sidebarCollapsed ? "Metas" : ""}
          >
            <Target className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Metas</span>}
          </button>

          {/* Configurações */}
          <button
            onClick={() => setActiveTab("configuracoes")}
            className={`flex w-full items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "configuracoes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={sidebarCollapsed ? "Configurações" : ""}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-medium">Configurações</span>
            )}
          </button>
        </nav>

        {/* --- RODAPÉ DA SIDEBAR (LOGOUT) --- */}
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-lg px-4 py-3 text-left text-red-500 hover:bg-red-50 transition-all`}
            title={sidebarCollapsed ? "Sair" : ""}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "lancamentos" && <Lancamentos />}
        {activeTab === "receitas" && <Receitas />}
        {activeTab === "metas" && <Metas />}
        {activeTab === "configuracoes" && (
          <Configuracoes onNavigate={setActiveTab} />
        )}
        {activeTab === "despesas_fixas" && <DespesasFixas />}
      </main>

      {/* --- MENU MOBILE (Fixo embaixo) --- */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden w-[95%] max-w-sm">
        <div className="bg-card border rounded-2xl px-2 py-2 flex items-center justify-between shadow-xl backdrop-blur-sm bg-opacity-95">
          {/* Home */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === "dashboard"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            }`}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </button>

          {/* Lançamentos */}
          <button
            onClick={() => setActiveTab("lancamentos")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === "lancamentos"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Lanç.</span>
          </button>

          {/* Planos */}
          <button
            onClick={() => setActiveTab("receitas")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === "receitas"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            }`}
          >
            <PieChart className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Planos</span>
          </button>

          {/* Config (com opção de sair dentro dela ou um long press futuramente, mas por enquanto mantemos simples) */}
          <button
            onClick={() => setActiveTab("configuracoes")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === "configuracoes" || activeTab === "despesas_fixas"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            }`}
          >
            <Cog className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Config</span>
          </button>
        </div>
      </div>
    </div>
  );
}
