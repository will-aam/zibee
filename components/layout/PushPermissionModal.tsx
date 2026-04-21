"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellAlertIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/hooks/use-toast";

export function PushPermissionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  // A Lógica de Gatilho Silenciosa
  useEffect(() => {
    // 1. O navegador suporta Push?
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }

    // 2. O status está como 'default'? (Se for granted ou denied, não mostramos)
    if (Notification.permission !== "default") {
      return;
    }

    // 3. Nós já perguntamos recentemente? (Cooldown de 7 dias)
    const lastDismissed = localStorage.getItem("zibee_push_cooldown");
    if (lastDismissed) {
      const daysSince =
        (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return; // Ainda está no período de folga
      }
    }

    // Se passou em todos os testes, abre o modal (com um pequeno delay de 3 segundos para não assustar no carregamento)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    // Salva o momento atual para não perguntar de novo por 7 dias
    localStorage.setItem("zibee_push_cooldown", Date.now().toString());
    setIsOpen(false);
  };

  // Funções de Inscrição (As mesmas que usamos nas configurações)
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribePush = async () => {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast({
          title: "Você recusou as notificações.",
          description: "Você pode ativá-las depois nas Configurações.",
        });
        setIsOpen(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicVapidKey) {
        throw new Error("Chave VAPID não configurada.");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) throw new Error("Falha ao salvar no servidor");

      toast({
        title: "Notificações Ativadas!",
        description: "Você será avisado sobre novidades e vencimentos.",
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Erro no Push:", error);
      toast({
        title: "Erro ao ativar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-sm w-[90vw] rounded-3xl p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
          <BellAlertIcon className="h-8 w-8 text-primary animate-pulse" />
        </div>

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Fique sempre atualizado!
          </DialogTitle>
          <DialogDescription className="text-center text-sm pt-2">
            Quer ser avisado quando a fatura do seu cartão fechar ou quando
            lançarmos novas funções incríveis no Zibee?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleSubscribePush}
            disabled={isSubscribing}
            className="w-full h-12 rounded-xl text-md font-bold"
          >
            {isSubscribing ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />{" "}
                Conectando...
              </>
            ) : (
              "Sim, ativar notificações"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={isSubscribing}
            className="w-full h-12 rounded-xl text-muted-foreground hover:bg-muted/50"
          >
            Lembrar mais tarde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
