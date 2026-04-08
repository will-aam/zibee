"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function Investimentos() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in slide-in-from-bottom-4">
      {/* CONTAINER DA ANIMAÇÃO LOTTIE */}
      <div className="w-72 h-72 mb-2 relative">
        <DotLottieReact
          src="https://lottie.host/b2c1d70d-164a-4c68-b5b6-7652af6c7c89/uxVDZZD0ac.lottie"
          loop
          autoplay
        />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">
        Módulo de Investimentos
      </h1>

      <p className="text-muted-foreground text-sm md:text-base max-w-md leading-relaxed mb-8">
        Estamos construindo uma ferramenta poderosa para você simular
        rendimentos e planejar o crescimento do seu patrimônio.
      </p>
    </div>
  );
}
