"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile"; // Importando seu hook de mobile
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

  // Propriedades de contexto
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
  const isMobile = useIsMobile(); // Detecta se é mobile

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
    <div className="fixed inset-0 z-[110]" aria-modal="true" role="dialog">
      {/* Overlay */}
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Fechar"
      />

      {/* Drawer / Modal Container */}
      <aside
        className={`
          absolute bg-background shadow-2xl flex flex-col transition-all duration-300
          ${
            isMobile
              ? "left-0 top-0 h-full w-full animate-in slide-in-from-left"
              : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] rounded-[32px] border border-border/50 animate-in zoom-in-95"
          }
        `}
        aria-label="Configurações da Conta"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {isMobile ? "Conta e Perfil" : "Mudar Foto do Perfil"}
            </h2>
          </div>
          <button
            className="p-2 rounded-full hover:bg-muted transition shrink-0"
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Erro (se houver) */}
        {errorMessage && (
          <div className="px-6 pt-4">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
              {errorMessage}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* SEÇÃO: ALTERNAR ESPAÇO (SÓ APARECE NO MOBILE) */}
          {isMobile && (
            <div className="px-6 py-6 border-b border-border/50 bg-muted/10">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Seu Espaço de Trabalho
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onContextChange?.("pessoal");
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    activeContext === "pessoal"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  <UserSolid className="w-7 h-7" />
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
                      window.open(
                        `https://wa.me/5579999365157?text=Quero+liberar+os+Grupos`,
                        "_blank",
                      );
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${
                    activeContext === "grupo"
                      ? "border-primary bg-primary/10 text-primary"
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
            </div>
          )}

          {/* SEÇÃO: GRID DE AVATARES */}
          <div className="px-6 py-8">
            {isMobile && (
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
                Escolha seu novo avatar
              </p>
            )}
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
            <p className="text-[11px] text-muted-foreground mt-8 text-center bg-muted/30 py-2 rounded-full font-medium">
              Role para ver mais variações de robôs
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t bg-background rounded-b-4xl">
          <button
            type="button"
            className={`
              w-full px-4 py-4 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm
              hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20
              ${saving ? "opacity-70 cursor-not-allowed" : ""}
            `}
            onClick={onClose}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Concluir Seleção"}
          </button>
        </div>
      </aside>
    </div>
  );
}
