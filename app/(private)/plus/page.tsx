// app/(private)/plus/page.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ChevronLeftIcon,
  MoonIcon,
  SunIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  TagIcon,
  CreditCardIcon,
  BellAlertIcon,
  ChartPieIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import {
  MoonIcon as MoonSolid,
  SunIcon as SunSolid,
  ArrowDownTrayIcon as ArrowDownTraySolid,
  SparklesIcon as SparklesSolid,
} from "@heroicons/react/24/solid";
import { TrophyIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FechamentosListModal } from "./_components/FechamentosListModal";
import { CategoriasModal } from "./_components/CategoriasModal";
import { PagamentosModal } from "./_components/PagamentosModal";
import { NotificacoesModal } from "./_components/NotificacoesModal";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

interface MaisPageProps {
  onNavigate: (tab: string) => void;
}

export default function MaisPage({ onNavigate }: MaisPageProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [promptInstall, setPromptInstall] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(true);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [isFechamentosModalOpen, setFechamentosModalOpen] = React.useState(false);
  const [isCategoriasModalOpen, setCategoriasModalOpen] = React.useState(false);
  const [isPagamentosModalOpen, setPagamentosModalOpen] = React.useState(false);
  const [isNotificacoesModalOpen, setNotificacoesModalOpen] = React.useState(false);
  const [isResetModalOpen, setResetModalOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
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

  const handleShareApp = async () => {
    const shareText = "Estou usando o Zibee para organizar minhas finanças e recomendo muito! Dá uma olhada: https://zibee.vercel.app/";
    const shareData = {
      title: "Zibee - Gestão Financeira",
      text: "Estou usando o Zibee para organizar minhas finanças e recomendo muito! Dá uma olhada:",
      url: "https://zibee.vercel.app/",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copiado para a área de transferência! 📋",
          description: "Agora é só colar e enviar para seus amigos.",
        });
      }
    } catch (err) {
      console.log("Erro ao compartilhar:", err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  const handleResetAccount = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (!res.ok) {
        throw new Error("Erro ao limpar dados");
      }
      toast({
        title: "Dados limpos com sucesso",
        description: "Sua conta foi redefinida.",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setIsResetting(false);
    }
  };

  const sections = [
    {
      title: "Ferramentas",
      items: [
        {
          id: "grupos",
          label: "Grupos",
          icon: UserGroupIcon,
          action: () => onNavigate("grupos"),
        },
        {
          id: "planejador",
          label: "Planejador",
          icon: ClipboardDocumentListIcon,
          action: () => onNavigate("planejador"),
        },
        {
          id: "analise",
          label: "Análise 50/30/20",
          icon: ChartPieIcon,
          action: () => onNavigate("analise-50-30-20"),
        },
        {
          id: "fechamentos",
          label: "Revisar Fechamentos",
          icon: TrophyIcon,
          action: () => setFechamentosModalOpen(true),
        },
        {
          id: "limites",
          label: "Limites e Margens",
          icon: ShieldExclamationIcon,
          action: () => onNavigate("limites-margens"),
        },
        {
          id: "cartoes",
          label: "Gerenciar Cartões",
          icon: CreditCardIcon,
          action: () => onNavigate("cartoes"),
          containerClassName: "md:hidden",
        },
        {
          id: "categorias",
          label: "Categorias",
          icon: TagIcon,
          action: () => setCategoriasModalOpen(true),
        },
        {
          id: "pagamentos",
          label: "Formas de Pagamento",
          icon: CreditCardIcon,
          action: () => setPagamentosModalOpen(true),
        },
      ],
    },
    {
      title: "Preferências do App",
      items: [
        {
          id: "notificacoes",
          label: "Notificações",
          icon: BellAlertIcon,
          action: () => setNotificacoesModalOpen(true),
        },
        {
          id: "configuracoes",
          label: "Configurações da Conta",
          icon: Cog6ToothIcon,
          action: () => onNavigate("configuracoes"),
        },
        {
          id: "compartilhar",
          label: "Compartilhar Zibee",
          icon: ShareIcon,
          action: handleShareApp,
        },
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
    {
      title: "Conta",
      items: [
        {
          id: "limpar",
          label: "Limpar Dados da Conta",
          icon: TrashIcon,
          action: () => setResetModalOpen(true),
          highlight: false,
          className: "text-red-500 font-bold",
        },
        {
          id: "sair",
          label: isLoggingOut ? "Saindo..." : "Sair da Conta",
          icon: ArrowLeftOnRectangleIcon,
          action: handleLogout,
          highlight: false,
          className: "text-red-500",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
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
          <div className="w-11" />
        </div>
      </header>

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
                    item.containerClassName
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
                      item.className
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

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <SparklesSolid className="h-6 w-6 text-primary" />
              Instalar Zibee
            </DialogTitle>
            <DialogDescription className="pt-2">
              Tenha a experiência completa direto na tela inicial do seu
              celular.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {promptInstall ? (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
                <p className="text-sm font-medium text-foreground mb-4">
                  Seu dispositivo é compatível! Clique abaixo para instalar.
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
                    Instalação automática bloqueada. Siga o passo a passo:
                  </p>
                </div>
                {isIOS ? (
                  <div className="flex items-center gap-4 bg-muted/50 border border-border/50 p-4 rounded-2xl">
                    <div className="bg-background p-2 rounded-xl shadow-sm shrink-0">
                      <ShareIcon className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      Toque em <strong>Compartilhar</strong> e selecione{" "}
                      <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-muted/50 border border-border/50 p-4 rounded-2xl">
                    <div className="bg-background p-2 rounded-xl shadow-sm shrink-0">
                      <EllipsisVerticalIcon className="w-6 h-6 text-foreground" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      Toque nos <strong>3 pontinhos</strong> e selecione{" "}
                      <strong>"Instalar Aplicativo"</strong>.
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowInstructions(false)}
                  className="w-full rounded-xl h-12 text-md font-bold"
                >
                  Entendi
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isResetModalOpen} onOpenChange={setResetModalOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <TrashIcon className="w-5 h-5" />
              Atenção: Limpeza Total
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso apagará permanentemente <strong>TODOS</strong> os seus lançamentos, metas, despesas fixas, faturas, fechamentos e customizações de categorias. 
              Sua conta começará 100% do zero. 
              <br /><br />
              Deseja mesmo prosseguir? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between flex-row-reverse sm:flex-row items-center gap-2 mt-4">
            <AlertDialogAction
              onClick={handleResetAccount}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              {isResetting ? "Limpando..." : "Sim, Limpar Tudo"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FechamentosListModal
        open={isFechamentosModalOpen}
        onClose={() => setFechamentosModalOpen(false)}
      />
      <CategoriasModal
        open={isCategoriasModalOpen}
        onClose={() => setCategoriasModalOpen(false)}
      />
      <PagamentosModal
        open={isPagamentosModalOpen}
        onClose={() => setPagamentosModalOpen(false)}
      />
      <NotificacoesModal
        open={isNotificacoesModalOpen}
        onClose={() => setNotificacoesModalOpen(false)}
      />
    </div>
  );
}
