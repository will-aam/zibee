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
  CheckIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
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

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const seedOptions = React.useMemo(
    () => buildSeedOptions(baseSeed, optionsCount),
    [baseSeed, optionsCount],
  );

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
        {/* HEADER DO MODAL - AGORA COM O LOGOUT NO TOPO NO MOBILE */}
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
            disabled={saving || isProcessingInvite || isLoggingOut}
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

          {/* SELEÇÃO DE AVATAR */}
          <div className="px-6 py-8">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
              {isMobile ? "Escolha seu novo avatar" : "Selecione um robô"}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {seedOptions.map((seed) => {
                const selected =
                  value.style === ROBOT_STYLE && value.seed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => onChange({ style: ROBOT_STYLE, seed })}
                    disabled={saving || isProcessingInvite}
                    className={`relative group transition-all active:scale-90 ${selected ? "scale-110" : "hover:scale-105"}`}
                  >
                    <div
                      className={`rounded-full p-1 transition-all ${selected ? "bg-primary shadow-lg shadow-primary/30" : "bg-transparent"}`}
                    >
                      <img
                        src={avatarUrl(ROBOT_STYLE, seed)}
                        alt="Avatar"
                        className="h-full w-full rounded-full bg-muted object-cover border-2 border-background"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className={`px-6 py-6 bg-background ${!isMobile ? "rounded-b-[40px]" : ""}`}
        >
          <Button
            className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest"
            onClick={onClose}
            disabled={saving || isProcessingInvite}
          >
            {saving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            {saving ? "Salvando..." : "Concluir e Salvar"}
          </Button>
          {/* {isMobile && (
            <p className="text-[10px] text-center text-muted-foreground mt-4 font-medium uppercase tracking-tighter opacity-50">
              Zibee v1.0.4
            </p>
          )} */}
        </div>
      </aside>
    </div>
  );
}
