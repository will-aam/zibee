"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function Investimentos() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in slide-in-from-bottom-4">
      {/* CONTAINER DA ANIMAÇÃO LOTTIE */}
      <div className="w-72 h-72 mb-2 relative">
        <DotLottieReact
          src="https://lottie.host/3458de73-9317-42e3-a9ab-f0baad5f5d47/8bT6PpmW7O.lottie"
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
