"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowDownTrayIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function InstallButton() {
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(checkStandalone());

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handler = (e: any) => {
      e.preventDefault();
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone) return null;

  // AGORA O BOTÃO SEMPRE ABRE O MODAL BONITINHO PRIMEIRO
  const handleOpenModal = () => {
    setShowInstructions(true);
  };

  // FUNÇÃO PARA DISPARAR A INSTALAÇÃO NATIVA DE DENTRO DO MODAL
  const triggerNativeInstall = async () => {
    if (promptInstall) {
      promptInstall.prompt();
      const { outcome } = await promptInstall.userChoice;
      if (outcome === "accepted") {
        setPromptInstall(null);
        setShowInstructions(false); // Fecha o modal se aceitou
      }
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="outline"
        size="sm"
        className="gap-2 h-9 rounded-xl font-semibold"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        Instalar App
      </Button>

      {/* NOSSO MODAL ELEGANTE QUE APARECE PARA TODOS */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <SparklesIcon className="h-6 w-6 text-primary" />
              Instalar Zibee
            </DialogTitle>
            <DialogDescription className="pt-2">
              Tenha a experiência completa, rápida e sem distrações direto na
              tela inicial do seu celular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {promptInstall ? (
              // SE O NAVEGADOR SUPORTA INSTALAÇÃO DIRETA (Chrome, Edge)
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
                <p className="text-sm font-medium text-foreground mb-4">
                  Seu dispositivo é totalmente compatível! Clique no botão
                  abaixo para instalar automaticamente.
                </p>
                <Button
                  onClick={triggerNativeInstall}
                  className="w-full rounded-xl h-12 text-md font-bold"
                >
                  Instalar Automaticamente
                </Button>
              </div>
            ) : (
              // SE O NAVEGADOR BLOQUEIA (Safari, Brave, Opera) - MOSTRA O TUTORIAL
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                  <p className="text-xs font-medium text-destructive">
                    Instalação automática bloqueada pelo seu navegador atual.
                    Siga o passo a passo manual:
                  </p>
                </div>

                {isIOS ? (
                  <div className="flex items-center gap-4 bg-muted/50 border border-border/50 p-4 rounded-2xl">
                    <div className="bg-background p-2 rounded-xl shadow-sm shrink-0">
                      <ShareIcon className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      Toque no botão <strong>Compartilhar</strong> na barra do
                      Safari e selecione{" "}
                      <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-muted/50 border border-border/50 p-4 rounded-2xl">
                    <div className="bg-background p-2 rounded-xl shadow-sm shrink-0">
                      <EllipsisVerticalIcon className="w-6 h-6 text-foreground" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      Toque nos <strong>3 pontinhos</strong> do navegador e
                      selecione <strong>"Instalar Aplicativo"</strong> ou{" "}
                      <strong>"Adicionar à Tela Inicial"</strong>.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowInstructions(false)}
                  className="w-full rounded-xl h-12 text-md font-bold"
                >
                  Entendi, vou fazer isso
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
