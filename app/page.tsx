"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import Header from "@/components/layout/header";
import Dashboard from "@/components/layout/header/dashboard";
import Lancamentos from "@/components/releases/Releases";
import Metas from "@/components/goals";
import DespesasFixas from "@/components/features/fixed-expenses";
import Receitas from "@/components/receitas";
import GruposConfig from "@/components/groups";
import Investimentos from "@/components/Investimentos";
import Cartoes from "@/components/cards";
import Settings from "@/components/settings/Settings";

// Definimos a ordem das abas principais para saber para qual lado deslizar
const MAIN_TABS = [
  "dashboard",
  "lancamentos",
  "grupos",
  "investimentos",
  "metas",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [direction, setDirection] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se é mobile (apenas no cliente) para ativar/desativar o gesto
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Função inteligente que navega e calcula a direção da animação
  const handleNavigate = (newTab: string) => {
    if (activeTab === newTab) return;

    const currentIndex = MAIN_TABS.indexOf(activeTab);
    const newIndex = MAIN_TABS.indexOf(newTab);

    // Se as duas abas fazem parte do menu principal, decide se desliza para esquerda ou direita
    if (currentIndex !== -1 && newIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    } else {
      setDirection(0); // Animação neutra (fade) se for para Configurações, Cartões, etc.
    }

    setActiveTab(newTab);
  };

  // Lógica de arrastar a tela (Swipe)
  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    if (!isMobile) return; // Trava de segurança: Nada acontece no Desktop

    const currentIndex = MAIN_TABS.indexOf(activeTab);
    if (currentIndex === -1) return; // Não faz swipe se estiver em Configurações, etc.

    const swipeThreshold = 50; // Distância mínima que o dedo precisa percorrer para trocar de tela

    if (offset.x < -swipeThreshold && currentIndex < MAIN_TABS.length - 1) {
      // Arrastou para a Esquerda -> Vai para a Próxima aba
      handleNavigate(MAIN_TABS[currentIndex + 1]);
    } else if (offset.x > swipeThreshold && currentIndex > 0) {
      // Arrastou para a Direita -> Vai para a aba Anterior
      handleNavigate(MAIN_TABS[currentIndex - 1]);
    }
  };

  // Configuração da física da animação
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : dir < 0 ? "100%" : 0,
      opacity: 0,
    }),
  };

  return (
    // overflow-hidden no pai evita que crie barra de rolagem horizontal enquanto a tela desliza
    <div className="min-h-screen bg-background pb-24 md:pb-0 flex flex-col overflow-x-hidden">
      <Header activeTab={activeTab} onNavigate={handleNavigate} />

      <div className="flex-1 w-full max-w-7xl mx-auto sm:px-6 lg:px-8 relative">
        {/* AnimatePresence mode="wait" garante que a tela atual saia antes da próxima entrar, evitando que o layout quebre */}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.main
            key={activeTab}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={isMobile && MAIN_TABS.includes(activeTab) ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ touchAction: "pan-y" }}
            className="w-full py-6 md:py-8"
          >
            {activeTab === "dashboard" && (
              <Dashboard onNavigate={handleNavigate} />
            )}
            {activeTab === "lancamentos" && (
              <Lancamentos onNavigate={handleNavigate} />
            )}
            {activeTab === "receitas" && <Receitas />}
            {activeTab === "cartoes" && <Cartoes />}
            {activeTab === "metas" && <Metas />}
            {activeTab === "configuracoes" && (
              <Settings onNavigate={handleNavigate} />
            )}
            {activeTab === "despesas_fixas" && <DespesasFixas />}
            {activeTab === "grupos" && <GruposConfig />}
            {activeTab === "investimentos" && <Investimentos />}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
