// components/ui/install-button.tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/solid";

export function InstallButton() {
  const [promptInstall, setPromptInstall] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPromptInstall(e); // Guarda o evento para usar no clique
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = () => {
    if (promptInstall) {
      promptInstall.prompt(); // Abre o popup nativo de instalação
    }
  };

  if (!promptInstall) return null; // Esconde se já instalou ou não suporta

  return (
    <Button onClick={handleInstall} variant="outline" className="gap-2">
      <ArrowDownTrayIcon className="size={16}" />
      Instalar App
    </Button>
  );
}
