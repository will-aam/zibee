// app/(private)/plus/page.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ChevronLeftIcon,
  BanknotesIcon,
  MoonIcon,
  SunIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  ShareIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import {
  MoonIcon as MoonSolid,
  SunIcon as SunSolid,
  ArrowDownTrayIcon as ArrowDownTraySolid,
  SparklesIcon as SparklesSolid,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MaisPageProps {
  onNavigate: (tab: string) => void;
}

export default function MaisPage({ onNavigate }: MaisPageProps) {
  const { theme, setTheme } = useTheme();

  // Criando o próprio estado de "mounted" para evitar erro de tipagem do next-themes
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // --- ESTADOS DO PWA (Reintegrados aqui) ---
  const [promptInstall, setPromptInstall] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(true);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
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

  const triggerNativeInstall = async () => {
    if (promptInstall) {
      promptInstall.prompt();
      const { outcome } = await promptInstall.userChoice;
      if (outcome === "accepted") {
        setPromptInstall(null);
        setShowInstructions(false);
      }
    }
  };

  // --- DADOS DAS SEÇÕES ---
  const sections = [
    {
      title: "Ferramentas",
      items: [
        {
          id: "balanco",
          label: "Balanço Financeiro",
          icon: BanknotesIcon,
          action: () => onNavigate("receitas"),
        },
      ],
    },
    {
      title: "Preferências do App",
      items: [
        {
          id: "tema",
          label: "Alternar Tema",
          value: mounted ? (theme === "dark" ? "Escuro" : "Claro") : "Sistema",
          icon: mounted && theme === "dark" ? MoonSolid : SunSolid,
          action: () => setTheme(theme === "dark" ? "light" : "dark"),
        },
        ...(isStandalone
          ? []
          : [
              {
                id: "install",
                label: "Instalar App",
                icon: ArrowDownTraySolid,
                action: () => setShowInstructions(true),
                highlight: true,
              },
            ]),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg">
        <div className="pt-[max(22px,env(safe-area-inset-top))]" />
        <div className="flex items-center justify-between px-6 h-16">
          <button
            onClick={() => onNavigate("dashboard")}
            className="w-11 h-11 rounded-xl bg-card flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeftIcon className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Mais</h1>
          <div className="w-11" /> {/* Espaçador para centralizar o título */}
        </div>
      </header>

      {/* Conteúdo */}
      <div className="px-6 pt-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-card rounded-2xl overflow-hidden">
              {section.items.map((item: any, index: number) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 transition-colors active:bg-muted/50",
                    index !== section.items.length - 1 &&
                      "border-b border-border/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      item.highlight ? "bg-primary/15" : "bg-muted",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5",
                        item.highlight ? "text-primary" : "text-foreground",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "flex-1 text-left font-medium",
                      item.highlight ? "text-primary" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.value && (
                    <span className="text-sm text-muted-foreground">
                      {item.value}
                    </span>
                  )}
                  <ChevronLeftIcon className="w-5 h-5 text-muted-foreground -rotate-180" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE INSTRUÇÕES DE INSTALAÇÃO (PWA) */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <SparklesSolid className="h-6 w-6 text-primary" />
              Instalar Zibee
            </DialogTitle>
            <DialogDescription className="pt-2">
              Tenha a experiência completa, rápida e sem distrações direto na
              tela inicial do seu celular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {promptInstall ? (
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
    </div>
  );
}
