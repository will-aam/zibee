// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
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
    setDirection(
      isMobile && currentIndex !== -1 && newIndex !== -1
        ? newIndex > currentIndex
          ? 1
          : -1
        : 0,
    );
    setActiveTab(newTab);
  };

  const handleDragEnd = (_e: any, { offset }: PanInfo) => {
    if (!isMobile) return;
    const currentIndex = MAIN_TABS.indexOf(activeTab);
    if (currentIndex === -1) return;
    const swipeThreshold = 50;
    if (offset.x < -swipeThreshold && currentIndex < MAIN_TABS.length - 1)
      handleNavigate(MAIN_TABS[currentIndex + 1]);
    else if (offset.x > swipeThreshold && currentIndex > 0)
      handleNavigate(MAIN_TABS[currentIndex - 1]);
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : dir < 0 ? "100%" : 0,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 flex flex-col overflow-x-hidden relative">
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
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
