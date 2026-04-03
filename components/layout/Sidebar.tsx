// components/layout/Sidebar.tsx
"use client";

import { useState } from "react";
import { Audiowide } from "next/font/google";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Target, LogOut, Loader2 } from "lucide-react";

import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  ChartPieIcon as ChartPieSolid,
  Cog6ToothIcon as CogSolid,
} from "@heroicons/react/24/solid";

import {
  HomeIcon,
  DocumentTextIcon,
  ChartPieIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

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

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
          },
          onError: () => {
            setIsLoggingOut(false);
          },
        },
      });
    } catch (error) {
      setIsLoggingOut(false);
    }
  };

  const navButtonClass = (isActive: boolean) =>
    `group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left
     transition-all duration-200 ease-out
     active:scale-[0.985]
     cursor-pointer select-none
     ${
       isActive
         ? "text-primary bg-primary/10"
         : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
     }`;

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setSidebarCollapsed(false)}
        className={`hidden md:flex fixed cursor-pointer top-4 left-4 z-50 items-center justify-center rounded-xl p-2
          transition-all duration-300 ease-out transform-gpu
          ${
            sidebarCollapsed
              ? "translate-x-0 opacity-100 scale-100"
              : "-translate-x-4 opacity-0 scale-95 pointer-events-none"
          }`}
      >
        <Image
          src="/icons8-abelha-64.png"
          alt="Zibee Logo"
          width={32}
          height={32}
          className="shrink-0"
          priority
        />
      </button>

      {/* SIDEBAR DESKTOP */}
      <aside
        className={`hidden md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-64 md:flex-col
          border-r bg-background/95 backdrop-blur-sm z-40 overflow-hidden
          transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${sidebarCollapsed ? "-translate-x-full" : "translate-x-0"}`}
      >
        {/* conteúdo interno com animação separada */}
        <div
          className={`flex h-full flex-col transition-all duration-300 ease-out
            ${
              sidebarCollapsed
                ? "opacity-0 translate-x-2"
                : "opacity-100 translate-x-0"
            }`}
        >
          {/* CABEÇALHO */}
          <div
            className="flex h-16 items-center gap-3 px-4 cursor-pointer transition-all duration-200 active:scale-[0.99]"
            onClick={() => setSidebarCollapsed(true)}
          >
            <Image
              src="/icons8-abelha-64.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-md shrink-0"
              priority
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
              className={navButtonClass(activeTab === "dashboard")}
            >
              {activeTab === "dashboard" ? (
                <HomeSolid className="h-5 w-5 shrink-0" />
              ) : (
                <HomeIcon className="h-5 w-5 shrink-0" />
              )}
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("lancamentos")}
              className={navButtonClass(activeTab === "lancamentos")}
            >
              {activeTab === "lancamentos" ? (
                <DocumentTextSolid className="h-5 w-5 shrink-0" />
              ) : (
                <DocumentTextIcon className="h-5 w-5 shrink-0" />
              )}
              <span className="font-medium">Lançamentos</span>
            </button>

            <button
              onClick={() => setActiveTab("receitas")}
              className={navButtonClass(activeTab === "receitas")}
            >
              {activeTab === "receitas" ? (
                <ChartPieSolid className="h-5 w-5 shrink-0" />
              ) : (
                <ChartPieIcon className="h-5 w-5 shrink-0" />
              )}
              <span className="font-medium">Planos</span>
            </button>

            <button
              onClick={() => setActiveTab("metas")}
              className={navButtonClass(activeTab === "metas")}
            >
              <Target
                className={`h-5 w-5 shrink-0 transition-all duration-200 ${
                  activeTab === "metas" ? "text-primary" : ""
                }`}
              />
              <span className="font-medium">Metas</span>
            </button>

            <button
              onClick={() => setActiveTab("configuracoes")}
              className={navButtonClass(activeTab === "configuracoes")}
            >
              {activeTab === "configuracoes" ? (
                <CogSolid className="h-5 w-5 shrink-0" />
              ) : (
                <Cog6ToothIcon className="h-5 w-5 shrink-0" />
              )}
              <span className="font-medium">Configurações</span>
            </button>
          </nav>

          {/* RODAPÉ */}
          <div className="p-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left
                transition-all duration-200 ease-out active:scale-[0.985]
                ${
                  isLoggingOut
                    ? "text-red-400 opacity-70 cursor-not-allowed"
                    : "text-red-500 hover:bg-red-500/10 cursor-pointer"
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
        </div>
      </aside>

      {/* MOBILE */}
      <div className="fixed bottom-4 left-1/2 z-50 w-[95%] max-w-sm -translate-x-1/2 md:hidden">
        <div className="bg-card/95 backdrop-blur-sm border rounded-2xl px-2 py-2 flex items-center justify-between shadow-xl">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl
              transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer
              ${
                activeTab === "dashboard"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
          >
            {activeTab === "dashboard" ? (
              <HomeSolid className="h-5 w-5" />
            ) : (
              <HomeIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("lancamentos")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl
              transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer
              ${
                activeTab === "lancamentos"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
          >
            {activeTab === "lancamentos" ? (
              <DocumentTextSolid className="h-5 w-5" />
            ) : (
              <DocumentTextIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Lanç.</span>
          </button>

          <button
            onClick={() => setActiveTab("receitas")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl
              transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer
              ${
                activeTab === "receitas"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
          >
            {activeTab === "receitas" ? (
              <ChartPieSolid className="h-5 w-5" />
            ) : (
              <ChartPieIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Planos</span>
          </button>

          <button
            onClick={() => setActiveTab("configuracoes")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl
              transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer
              ${
                activeTab === "configuracoes" || activeTab === "despesas_fixas"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
          >
            {activeTab === "configuracoes" || activeTab === "despesas_fixas" ? (
              <CogSolid className="h-5 w-5" />
            ) : (
              <Cog6ToothIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Config</span>
          </button>
        </div>
      </div>
    </>
  );
}
