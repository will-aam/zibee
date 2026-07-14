"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { supabase } from "@/lib/supabase"; // <-- Importamos o Supabase
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
  BellAlertIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

// Mini componente de Switch (Chavezinha)
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

export default function Preferences() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const user = session.data?.user;

  // ESTADOS GERAIS (Chave Mestra)
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // ESTADOS DAS NOTIFICAÇÕES ESPECÍFICAS
  const [diasFatura, setDiasFatura] = useState("3");
  const [alertaNovoLancamento, setAlertaNovoLancamento] = useState(true);
  const [alertaPagamentoGrupo, setAlertaPagamentoGrupo] = useState(true);

  // 1. CARREGA AS PREFERÊNCIAS DO BANCO DE DADOS
  useEffect(() => {
    async function loadPreferences() {
      if (!user?.id) return;
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
  }, [user]);

  // Verifica o status da inscrição push real quando a página carrega
  useEffect(() => {
    async function checkSubscription() {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription =
              await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          }
        } catch (e) {
          console.error("Erro ao checar subscription", e);
        }
      }
    }
    checkSubscription();
  }, []);

  // 2. FUNÇÕES PARA ATUALIZAR O BANCO DE DADOS AUTOMATICAMENTE
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

  // Lógica Real do Push com Trava anti Loop Infinito
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

      // Corrige o loop infinito garantindo que temos um service worker ativo
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
    <div className="animate-in fade-in duration-300 flex flex-col">
      {/* SESSÃO: CHAVE MESTRA (Permitir Notificações) */}
      <section className="px-5 py-6 border-b border-border/30 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <BellAlertIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Notificações do App
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xs">
              Avisos importantes sobre suas contas, faturas e grupos.
            </p>
          </div>
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
              className="h-10 rounded-xl px-5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubscribing ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                "Ativar"
              )}
            </Button>
          )}
        </div>
      </section>

      {/* CONTEÚDO BLOQUEADO SE A CHAVE MESTRA ESTIVER DESLIGADA */}
      <div
        className={cn(
          "transition-opacity duration-300",
          !isSubscribed && "opacity-40 pointer-events-none grayscale-[0.5]",
        )}
      >
        {/* SESSÃO: FATURAS E VENCIMENTOS */}
        <section className="px-5 py-6 border-b border-border/30 space-y-5">
          <div className="flex items-center gap-2 text-foreground mb-4">
            <CalendarDaysIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Faturas e Vencimentos
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Avisar antes de vencer
              </p>
              <p className="text-xs text-muted-foreground">
                Lembrar sobre contas a pagar e faturas do cartão.
              </p>
            </div>
            <Select value={diasFatura} onValueChange={handleDiasFaturaChange}>
              <SelectTrigger className="h-11 rounded-xl w-full sm:w-[180px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No dia do vencimento</SelectItem>
                <SelectItem value="1">1 dia antes</SelectItem>
                <SelectItem value="3">3 dias antes</SelectItem>
                <SelectItem value="5">5 dias antes</SelectItem>
                <SelectItem value="nunca">Não me avisar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* SESSÃO: GRUPOS COMPARTILHADOS */}
        <section className="px-5 py-6 space-y-6">
          <div className="flex items-center gap-2 text-foreground mb-2">
            <UserGroupIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Grupos Compartilhados
            </h2>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Novos Lançamentos
              </p>
              <p className="text-xs text-muted-foreground">
                Quando alguém do grupo adicionar uma despesa.
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
                Quando alguém quitar uma conta pendente do grupo.
              </p>
            </div>
            <Toggle
              checked={alertaPagamentoGrupo}
              onChange={handleAlertaPagamentoGrupo}
            />
          </div>
        </section>

        {!isSubscribed && (
          <div className="px-5 pb-8 text-center">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
              ↑ Ative as notificações acima para liberar estas opções.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
