// components/layout/Sidebar.tsx
"use client";

import { useState } from "react"; // <--- NOVO IMPORT
import { Audiowide } from "next/font/google";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Target,
  Settings,
  Home as HomeIcon,
  FileText,
  Cog,
  PieChart,
  LogOut,
  Loader2, // <--- NOVO ÍCONE DE LOADING
} from "lucide-react";

const audiowide = Audiowide({ weight: "400", subsets: ["latin"] });

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  sidebarCollapsed,
  setSidebarCollapsed,
}: SidebarProps) {
  const router = useRouter();
  const session = authClient.useSession();

  // ESTADO DE LOADING PARA O LOGOUT
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true); // <--- INICIA O LOADING
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
          },
          onError: () => {
            // Se falhar por algum motivo (ex: sem internet), desativa o loading
            setIsLoggingOut(false);
          },
        },
      });
    } catch (error) {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* --- BOTÃO FLUTUANTE (APARECE QUANDO SIDEBAR ESTÁ RECOLHIDA 100%) --- */}
      <button
        onClick={() => setSidebarCollapsed(false)}
        className={`hidden md:flex fixed top-4 left-4 z-50 items-center justify-center p-2 hover:scale-105 transition-all duration-300 cursor-pointer ${
          sidebarCollapsed
            ? "translate-x-0 opacity-100 delay-150"
            : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        title="Abrir Menu"
      >
        <Image
          src="/icons8-abelha-64.png"
          alt="Zibee Logo"
          width={32}
          height={32}
          className="shrink-0"
        />
      </button>

      {/* --- SIDEBAR DESKTOP --- */}
      <aside
        className={`hidden md:fixed md:left-0 md:top-0 md:flex md:h-screen md:flex-col md:border-r md:bg-card md:w-64 transition-transform duration-300 z-40 ${
          sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* CABEÇALHO CLICÁVEL (RECOLHE A SIDEBAR) */}
        <div
          className="flex h-16 items-center gap-3 px-4 cursor-pointer"
          onClick={() => setSidebarCollapsed(true)}
          title="Recolher Menu"
        >
          <Image
            src="/icons8-abelha-64.png"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-md shrink-0"
          />
          <h1
            className={`text-xl text-primary truncate ${audiowide.className}`}
          >
            {session.data?.user.name || "Zibee"}
          </h1>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("lancamentos")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "lancamentos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Receipt className="h-5 w-5 shrink-0" />
            <span className="font-medium">Lançamentos</span>
          </button>

          <button
            onClick={() => setActiveTab("receitas")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "receitas"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <PieChart className="h-5 w-5 shrink-0" />
            <span className="font-medium">Planos</span>
          </button>

          <button
            onClick={() => setActiveTab("metas")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "metas"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Target className="h-5 w-5 shrink-0" />
            <span className="font-medium">Metas</span>
          </button>

          <button
            onClick={() => setActiveTab("configuracoes")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === "configuracoes"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="font-medium">Configurações</span>
          </button>
        </nav>

        {/* --- RODAPÉ COM BOTÃO DE LOGOUT ATUALIZADO --- */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut} // <--- Desabilita o botão para evitar múltiplos cliques
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              isLoggingOut
                ? "text-red-400 opacity-70 cursor-not-allowed"
                : "text-red-500 hover:bg-red-500/10"
            }`}
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" />
            )}
            <span className="font-medium">
              {isLoggingOut ? "Saindo..." : "Sair"}
            </span>
          </button>
        </div>
      </aside>

      {/* --- MENU MOBILE (Fixo embaixo) --- */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden w-[95%] max-w-sm">
        <div className="bg-card border rounded-2xl px-2 py-2 flex items-center justify-between shadow-xl backdrop-blur-sm bg-opacity-95">
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
    </>
  );
}
