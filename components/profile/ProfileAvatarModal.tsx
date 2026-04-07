"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { handleWhatsAppContact } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Apenas Heroicons
import {
  XMarkIcon,
  UserIcon,
  UserGroupIcon,
  LockClosedIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  HeartIcon,
  ShareIcon,
} from "@heroicons/react/24/solid";

import { Button } from "../ui/button";

export type PendingInvite = { id: string; grupo_nome: string } | null;
export type AvatarStyle = "bottts-neutral";

export interface AvatarSelection {
  style: AvatarStyle;
  seed: string;
}

const ROBOT_STYLE: AvatarStyle = "bottts-neutral";

function avatarUrl(style: AvatarStyle, seed: string) {
  const safeSeed = encodeURIComponent(seed || "Zibee");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=96`;
}

function buildSeedOptions(baseSeed: string, count: number) {
  const base = (baseSeed || "Zibee").trim() || "Zibee";
  return Array.from({ length: count }, (_, i) => `${base}-${i + 1}`);
}

interface ProfileAvatarModalProps {
  open: boolean;
  onClose: () => void;
  baseSeed: string;
  value: AvatarSelection;
  onChange: (next: AvatarSelection) => void;
  saving?: boolean;
  errorMessage?: string | null;
  optionsCount?: number;
  activeContext?: string;
  onContextChange?: (ctx: string) => void;
  hasPremiumAccess?: boolean;
  pendingInvite?: PendingInvite;
  setPendingInvite?: (invite: PendingInvite) => void;
  userId?: string;
  onLogout?: () => void;
  isLoggingOut?: boolean;
}

export default function ProfileAvatarModal({
  open,
  onClose,
  baseSeed,
  value,
  onChange,
  saving = false,
  errorMessage = null,
  optionsCount = 120,
  activeContext = "pessoal",
  onContextChange,
  hasPremiumAccess = false,
  pendingInvite,
  setPendingInvite,
  userId,
  onLogout,
  isLoggingOut = false,
}: ProfileAvatarModalProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { setHasPremiumAccess } = useWorkspace();

  const [isProcessingInvite, setIsProcessingInvite] = React.useState(false);

  const [localAvatar, setLocalAvatar] = React.useState<AvatarSelection>(value);
  const [isSavingAvatar, setIsSavingAvatar] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(20);

  React.useEffect(() => {
    if (open) {
      setLocalAvatar(value);
      setVisibleCount(20);
    }
  }, [open, value]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const allSeedOptions = React.useMemo(
    () => buildSeedOptions(baseSeed, optionsCount),
    [baseSeed, optionsCount],
  );

  const visibleOptions = allSeedOptions.slice(0, visibleCount);

  // LÓGICA APRIMORADA DE COMPARTILHAMENTO
  const handleShareApp = async () => {
    const shareText =
      "Estou usando o Zibee para organizar minhas finanças e recomendo muito! Dá uma olhada: https://zibee.vercel.app/";
    const shareData = {
      title: "Zibee - Gestão Financeira",
      text: "Estou usando o Zibee para organizar minhas finanças e recomendo muito! Dá uma olhada:",
      url: "https://zibee.vercel.app/",
    };

    try {
      if (navigator.share) {
        // Abre a gaveta nativa do celular (WhatsApp, Insta, etc)
        await navigator.share(shareData);
      } else {
        // Fallback para quem não tem suporte nativo (PC)
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

  const handleSaveAvatar = async () => {
    if (localAvatar.seed === value.seed) {
      onClose();
      return;
    }

    setIsSavingAvatar(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar_style: localAvatar.style,
          avatar_seed: localAvatar.seed,
        }),
      });

      if (!res.ok) throw new Error();

      onChange(localAvatar);
      toast({
        title: "Salvo com sucesso!",
        description: "A sua foto de perfil foi atualizada.",
      });
      onClose();
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInvite || !userId) return;
    setIsProcessingInvite(true);
    const { error } = await supabase
      .from("membros_grupo")
      .update({ status: "Aceito", user_id: userId })
      .eq("id", pendingInvite.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aceitar.",
        variant: "destructive",
      });
    } else {
      setHasPremiumAccess(true);
      onContextChange?.("grupo");
      setPendingInvite?.(null);
      toast({
        title: "Bem-vindo!",
        description: `Você entrou na ${pendingInvite.grupo_nome}.`,
      });
      onClose();
    }
    setIsProcessingInvite(false);
  };

  const handleRejectInvite = async () => {
    if (!pendingInvite) return;
    setIsProcessingInvite(true);
    const { error } = await supabase
      .from("membros_grupo")
      .delete()
      .eq("id", pendingInvite.id);
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível recusar.",
        variant: "destructive",
      });
    } else {
      setPendingInvite?.(null);
      toast({ description: "Convite recusado." });
    }
    setIsProcessingInvite(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-110" aria-modal="true" role="dialog">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <aside
        className={`absolute bg-background shadow-2xl flex flex-col transition-all duration-300
          ${isMobile ? "left-0 top-0 h-full w-full animate-in slide-in-from-left" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[640px] rounded-[40px] border border-border/50 animate-in zoom-in-95"}
        `}
      >
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className="p-2 -ml-2 text-red-500 active:scale-90 transition-transform"
                title="Sair da Conta"
              >
                {isLoggingOut ? (
                  <ArrowPathIcon className="h-6 w-6 animate-spin" />
                ) : (
                  <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                )}
              </button>
            )}
            <h2 className="text-xl font-bold tracking-tight">
              {isMobile ? "Minha Conta" : "Perfil"}
            </h2>
          </div>

          <button
            className="p-2.5 rounded-full hover:bg-muted transition-colors shrink-0"
            onClick={onClose}
            disabled={
              saving || isSavingAvatar || isProcessingInvite || isLoggingOut
            }
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {errorMessage && (
          <div className="px-6 pt-4">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
              {errorMessage}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* WORKSPACES (MOBILE) */}
          {isMobile && (
            <div className="px-6 py-6 bg-muted/10">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Seu Espaço de Trabalho
              </p>
              {pendingInvite ? (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-3xl p-5 mb-4 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Convite Recebido
                      </p>
                      <p className="font-semibold text-foreground text-sm">
                        {pendingInvite.grupo_nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl h-10 bg-white dark:bg-background border-border/50"
                      onClick={handleRejectInvite}
                      disabled={isProcessingInvite}
                    >
                      Recusar
                    </Button>
                    <Button
                      className="flex-1 rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleAcceptInvite}
                      disabled={isProcessingInvite}
                    >
                      {isProcessingInvite ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        "Aceitar"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onContextChange?.("pessoal");
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${activeContext === "pessoal" ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-muted-foreground"}`}
                  >
                    <UserIcon className="w-7 h-7" />
                    <span className="font-bold text-xs uppercase tracking-wide">
                      Pessoal
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasPremiumAccess) {
                        onContextChange?.("grupo");
                        onClose();
                      } else {
                        handleWhatsAppContact();
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${activeContext === "grupo" ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-muted-foreground"}`}
                  >
                    {!hasPremiumAccess && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg">
                        PRO
                      </div>
                    )}
                    {hasPremiumAccess ? (
                      <UserGroupIcon className="w-7 h-7" />
                    ) : (
                      <LockClosedIcon className="w-7 h-7 text-amber-500/80" />
                    )}
                    <span className="font-bold text-xs uppercase tracking-wide">
                      Grupo
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NOVO BANNER: COMPARTILHE O APP (Com o coração sonar e a planta) */}
          <div className="mx-6 mt-6 bg-linear-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative flex items-center justify-center w-8 h-8 mb-3">
              <HeartIcon className="absolute w-8 h-8 text-primary animate-ping opacity-75 duration-1000" />
              <HeartIcon className="relative w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1 text-lg">
              Ajude o projeto! 🌱
            </h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-[250px] leading-relaxed">
              Gostou do Zibee? Compartilhe o aplicativo com um amigo e apoie o
              desenvolvedor.
            </p>
            <Button
              onClick={handleShareApp}
              className="w-full rounded-xl gap-2 shadow-sm hover:scale-[1.02] transition-transform font-bold h-11"
            >
              <ShareIcon className="w-4 h-4" />
              Compartilhar Agora
            </Button>
          </div>

          {/* SELEÇÃO DE AVATAR */}
          <div className="px-6 pt-8 pb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
              {isMobile ? "Escolha seu novo avatar" : "Selecione um robô"}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {visibleOptions.map((seed) => {
                const selected =
                  localAvatar.style === ROBOT_STYLE &&
                  localAvatar.seed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setLocalAvatar({ style: ROBOT_STYLE, seed })}
                    disabled={saving || isSavingAvatar || isProcessingInvite}
                    className={`relative group transition-all active:scale-90 ${selected ? "scale-110" : "hover:scale-105"}`}
                  >
                    <div
                      className={`rounded-full p-1 transition-all ${selected ? "bg-primary shadow-lg shadow-primary/30" : "bg-transparent"}`}
                    >
                      <img
                        src={avatarUrl(ROBOT_STYLE, seed)}
                        alt="Avatar"
                        className="h-full w-full rounded-full bg-muted object-cover border-2 border-background"
                        loading="lazy"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* BOTÃO VER MAIS (PAGINAÇÃO) */}
            {visibleCount < optionsCount && (
              <div className="mt-8 flex justify-center mb-4">
                <Button
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() =>
                    setVisibleCount((prev) => Math.min(prev + 20, optionsCount))
                  }
                >
                  Carregar mais
                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className={`px-6 py-6 bg-background border-t ${!isMobile ? "rounded-b-[40px]" : ""}`}
        >
          {/* BOTÃO QUE EFETIVAMENTE SALVA */}
          <Button
            className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest"
            onClick={handleSaveAvatar}
            disabled={saving || isSavingAvatar || isProcessingInvite}
          >
            {isSavingAvatar ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            {isSavingAvatar ? "Salvando..." : "Concluir e Salvar"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
