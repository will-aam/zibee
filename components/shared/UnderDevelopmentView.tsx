"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

type UnderDevelopmentViewProps = {
  title?: string;
  description?: string;
  animationSrc?: string;
  minHeightClassName?: string; // ex: "min-h-[70vh]" | "min-h-[50vh]"
  showBackButton?: boolean;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
};

export default function UnderDevelopmentView({
  title = "Módulo em desenvolvimento",
  description = "Estamos construindo essa funcionalidade para você. Em breve teremos novidades.",
  animationSrc = "https://lottie.host/3458de73-9317-42e3-a9ab-f0baad5f5d47/8bT6PpmW7O.lottie",
  minHeightClassName = "min-h-[70vh]",
  showBackButton = false,
  backLabel = "Voltar",
  onBack,
  className = "",
}: UnderDevelopmentViewProps) {
  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== "undefined") window.history.back();
  };

  return (
    <section
      className={`flex flex-col items-center justify-center ${minHeightClassName} p-6 text-center animate-in fade-in slide-in-from-bottom-4 ${className}`}
    >
      {/* Animação */}
      <div className="w-72 h-72 mb-2 relative">
        <DotLottieReact src={animationSrc} loop autoplay />
      </div>

      {/* Título */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">
        {title}
      </h1>

      {/* Descrição */}
      <p className="text-muted-foreground text-sm md:text-base max-w-md leading-relaxed mb-8">
        {description}
      </p>

      {/* Botão opcional */}
      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {backLabel}
        </button>
      )}
    </section>
  );
}
