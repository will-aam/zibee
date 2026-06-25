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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleNavigate = (newTab: string) => {
    if (activeTab === newTab) return;

    const currentIndex = MAIN_TABS.indexOf(activeTab);
    const newIndex = MAIN_TABS.indexOf(newTab);

    // MÁGICA AQUI: Só calcula direção (slide) se for Mobile
    if (isMobile && currentIndex !== -1 && newIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    } else {
      setDirection(0); // No Desktop, a direção zero remove o deslocamento em X
    }

    setActiveTab(newTab);
  };

  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    if (!isMobile) return;

    const currentIndex = MAIN_TABS.indexOf(activeTab);
    if (currentIndex === -1) return;

    const swipeThreshold = 50;

    if (offset.x < -swipeThreshold && currentIndex < MAIN_TABS.length - 1) {
      handleNavigate(MAIN_TABS[currentIndex + 1]);
    } else if (offset.x > swipeThreshold && currentIndex > 0) {
      handleNavigate(MAIN_TABS[currentIndex - 1]);
    }
  };

  const variants = {
    enter: (dir: number) => ({
      // Se dir for 0 (Desktop), x fica em 0. Se não, aplica o slide.
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      // Se dir for 0 (Desktop), x fica em 0. Se não, aplica o slide.
      x: dir > 0 ? "-100%" : dir < 0 ? "100%" : 0,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 flex flex-col overflow-x-hidden relative">
      {/* ========================================================================= */}
      {/* HERO BACKGROUND MOBILE - ILUMINAÇÃO AZUL COMPLETA E VIBRANTE (APENAS MOBILE) */}
      {/* ========================================================================= */}
      {activeTab === "dashboard" && (
        <div className="absolute top-0 left-0 right-0 h-[560px] pointer-events-none overflow-hidden md:hidden z-0 select-none">
          {/* Camada 1: Sustentação do Tom Azul (Evita que o fundo escuro deixe o degradê cinzento) */}
          <div className="absolute inset-0 bg-linear-to-b from-primary/95 via-primary/60 to-transparent" />

          {/* Camada 2: Brilho de Expansão (Injeta luz azul pura nas bordas da transição, matando o efeito "preto") */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[140%] h-[500px] bg-primary/25 rounded-full blur-[90px]" />

          {/* Camada 3: Filtro de Vidro Focado */}
          <div
            className="absolute inset-0 backdrop-blur-[20px]"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 40%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 40%, transparent 100%)",
            }}
          />
        </div>
      )}
      <Header activeTab={activeTab} onNavigate={handleNavigate} />

      <div className="flex-1 w-full max-w-7xl mx-auto sm:px-6 lg:px-8 relative z-10">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.main
            key={activeTab}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              // Aumentamos levemente a suavidade para o Desktop
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.15 },
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
