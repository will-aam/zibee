"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BellAlertIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
      checked ? "bg-primary" : "bg-muted-foreground/30",
      disabled && "opacity-50 cursor-not-allowed",
    )}
  >
    <span
      className={cn(
        "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
        checked ? "translate-x-5" : "translate-x-0",
      )}
    />
  </button>
);

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificacoesModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const session = authClient.useSession();
  const user = session.data?.user;

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [diasFatura, setDiasFatura] = useState("3");
  const [alertaNovoLancamento, setAlertaNovoLancamento] = useState(true);
  const [alertaPagamentoGrupo, setAlertaPagamentoGrupo] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      if (!user?.id || !open) return;
      const { data, error } = await supabase
        .from("user")
        .select("dias_fatura, alerta_lancamento_grupo, alerta_pagamento_grupo")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setDiasFatura(data.dias_fatura || "3");
        setAlertaNovoLancamento(data.alerta_lancamento_grupo ?? true);
        setAlertaPagamentoGrupo(data.alerta_pagamento_grupo ?? true);
      }
    }
    loadPreferences();
  }, [user, open]);

  useEffect(() => {
    async function checkSubscription() {
      if (!open) return;
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          }
        } catch (e) {
          console.error("Erro ao checar subscription", e);
        }
      }
    }
    checkSubscription();
  }, [open]);

  const updatePreference = async (field: string, value: any) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("user")
      .update({ [field]: value })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDiasFaturaChange = (val: string) => {
    setDiasFatura(val);
    updatePreference("dias_fatura", val);
  };

  const handleAlertaNovoLancamento = (val: boolean) => {
    setAlertaNovoLancamento(val);
    updatePreference("alerta_lancamento_grupo", val);
  };

  const handleAlertaPagamentoGrupo = (val: boolean) => {
    setAlertaPagamentoGrupo(val);
    updatePreference("alerta_pagamento_grupo", val);
  };

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
          title: "Permissão negada pelo navegador.",
          variant: "destructive",
        });
        setIsSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        toast({
          title: "Aguarde",
          description: "Configurando o sistema. Tente de novo em instantes.",
          variant: "destructive",
        });
        setIsSubscribing(false);
        return;
      }

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        toast({
          title: "Erro",
          description: "Chave VAPID não configurada.",
          variant: "destructive",
        });
        return;
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

      setIsSubscribed(true);
      toast({
        title: "Notificações Ativadas!",
        description: "Você receberá alertas do Zibee.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao ativar notificações",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-3xl z-[90] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <BellAlertIcon className="h-5 w-5 text-primary" />
            </div>
            Notificações
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          <section className="py-4 border-b border-border/30 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Receber Alertas</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
                  Avisos importantes sobre suas contas e faturas.
                </p>
              </div>
              <div className="pt-1">
                {isSubscribed ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold uppercase tracking-wider">
                    Ativo
                  </span>
                ) : (
                  <Button
                    onClick={handleSubscribePush}
                    disabled={isSubscribing}
                    className="h-10 rounded-xl px-4 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSubscribing ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      "Ativar"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </section>

          <div
            className={cn(
              "transition-opacity duration-300",
              !isSubscribed && "opacity-40 pointer-events-none grayscale-[0.5]"
            )}
          >
            <section className="py-4 border-b border-border/30 space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDaysIcon className="h-5 w-5 text-primary" />
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Faturas e Vencimentos
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Avisar antes de vencer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lembrar sobre contas a pagar.
                  </p>
                </div>
                <Select value={diasFatura} onValueChange={handleDiasFaturaChange}>
                  <SelectTrigger className="h-11 rounded-xl w-full sm:w-[160px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="0">No dia</SelectItem>
                    <SelectItem value="1">1 dia antes</SelectItem>
                    <SelectItem value="3">3 dias antes</SelectItem>
                    <SelectItem value="5">5 dias antes</SelectItem>
                    <SelectItem value="nunca">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="py-4 space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <UserGroupIcon className="h-5 w-5 text-primary" />
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Grupos Compartilhados
                </h2>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Novos Lançamentos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quando alguém adicionar despesa.
                  </p>
                </div>
                <Toggle
                  checked={alertaNovoLancamento}
                  onChange={handleAlertaNovoLancamento}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pagamentos Realizados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quando alguém quitar pendência.
                  </p>
                </div>
                <Toggle
                  checked={alertaPagamentoGrupo}
                  onChange={handleAlertaPagamentoGrupo}
                />
              </div>
            </section>

            {!isSubscribed && (
              <div className="pb-4 text-center">
                <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">
                  ↑ Ative as notificações acima para liberar estas opções.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
