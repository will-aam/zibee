"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { handleWhatsAppContact } from "@/lib/utils"; // Importando a função centralizada
import {
  UserIcon as UserSolid,
  UserGroupIcon as UserGroupSolid,
  LockClosedIcon as LockClosedSolid,
} from "@heroicons/react/24/solid";

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

  // Propriedades de contexto para o Switcher Mobile
  activeContext?: string;
  onContextChange?: (ctx: string) => void;
  hasPremiumAccess?: boolean;
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
}: ProfileAvatarModalProps) {
  const isMobile = useIsMobile();

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-110" aria-modal="true" role="dialog">
      {/* Overlay Escuro com Blur */}
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Fechar"
      />

      {/* Drawer (Mobile) ou Modal (Desktop) */}
      <aside
        className={`
          absolute bg-background shadow-2xl flex flex-col transition-all duration-300
          ${
            isMobile
              ? "left-0 top-0 h-full w-full animate-in slide-in-from-left"
              : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[640px] rounded-[40px] border border-border/50 animate-in zoom-in-95"
          }
        `}
        aria-label="Configurações da Conta"
      >
        {/* Header do Painel */}
        <div className="px-6 py-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {isMobile ? "Conta e Perfil" : "Mudar Foto do Perfil"}
            </h2>
          </div>
          <button
            className="p-2.5 rounded-full hover:bg-muted transition-colors shrink-0"
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Alerta de Erro */}
        {errorMessage && (
          <div className="px-6 pt-4">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
              {errorMessage}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* SEÇÃO: WORKSPACES (EXCLUSIVA MOBILE) */}
          {isMobile && (
            <div className="px-6 py-6 border-b border-border/50 bg-muted/10">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Seu Espaço de Trabalho
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Espaço Pessoal */}
                <button
                  type="button"
                  onClick={() => {
                    onContextChange?.("pessoal");
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    activeContext === "pessoal"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-background hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  <UserSolid className="w-7 h-7" />
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Pessoal
                  </span>
                </button>

                {/* Espaço de Grupo */}
                <button
                  type="button"
                  onClick={() => {
                    if (hasPremiumAccess) {
                      onContextChange?.("grupo");
                      onClose();
                    } else {
                      handleWhatsAppContact(); // Lógica centralizada
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${
                    activeContext === "grupo"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-background hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  {!hasPremiumAccess && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg">
                      PRO
                    </div>
                  )}
                  {hasPremiumAccess ? (
                    <UserGroupSolid className="w-7 h-7" />
                  ) : (
                    <LockClosedSolid className="w-7 h-7 text-amber-500/80" />
                  )}
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Casa / Grupo
                  </span>
                </button>
              </div>
              {!hasPremiumAccess && (
                <p className="text-[11px] text-muted-foreground mt-4 text-center font-medium leading-relaxed">
                  Você ainda não possui um grupo ativo. <br />
                  Clique no cadeado para solicitar o acesso.
                </p>
              )}
            </div>
          )}

          {/* SEÇÃO: SELEÇÃO DE AVATAR (MOBILE E DESKTOP) */}
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
                    key={`${ROBOT_STYLE}:${seed}`}
                    type="button"
                    onClick={() => onChange({ style: ROBOT_STYLE, seed })}
                    disabled={saving}
                    className={`
                      relative group transition-all active:scale-90
                      ${selected ? "scale-110" : "hover:scale-105"}
                    `}
                    aria-label="Selecionar avatar"
                  >
                    <div
                      className={`
                      rounded-full p-1 transition-all
                      ${selected ? "bg-primary shadow-lg shadow-primary/30" : "bg-transparent"}
                    `}
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
            <p className="text-[11px] text-muted-foreground mt-10 text-center bg-muted/40 py-2.5 rounded-full font-medium">
              Role para ver todas as 120 variações
            </p>
          </div>
        </div>

        {/* Rodapé de Ação */}
        <div
          className={`px-6 py-6 border-t bg-background ${!isMobile ? "rounded-b-[40px]" : ""}`}
        >
          <button
            type="button"
            className={`
  w-full px-4 py-4 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm
  hover:opacity-90 transition-all active:scale-[0.98]
  ${saving ? "opacity-70 cursor-not-allowed" : ""}
`}
            onClick={onClose}
            disabled={saving}
          >
            {saving ? "Salvando Alterações..." : "Concluir e Salvar"}
          </button>
        </div>
      </aside>
    </div>
  );
}
