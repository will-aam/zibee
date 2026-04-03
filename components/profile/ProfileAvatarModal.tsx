// components/profile/ProfileAvatarModal.tsx
"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";

export type AvatarStyle = "bottts-neutral" | "fun-emoji" | "lorelei-neutral";

export interface AvatarSelection {
  style: AvatarStyle;
  seed: string;
}

const STYLES: Array<{ id: AvatarStyle; label: string }> = [
  { id: "bottts-neutral", label: "Robôs" },
  { id: "fun-emoji", label: "Emojis" },
  { id: "lorelei-neutral", label: "Personas" },
];

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

  optionsPerStyle?: number;

  /** mostra estado de salvamento */
  saving?: boolean;

  /** opcional: mostrar msg de erro no rodapé */
  errorMessage?: string | null;
}

export default function ProfileAvatarModal({
  open,
  onClose,
  baseSeed,
  value,
  onChange,
  optionsPerStyle = 40,
  saving = false,
  errorMessage = null,
}: ProfileAvatarModalProps) {
  const [activeStyle, setActiveStyle] = React.useState<AvatarStyle>(
    value.style,
  );

  React.useEffect(() => {
    setActiveStyle(value.style);
  }, [value.style]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const seedOptions = React.useMemo(
    () => buildSeedOptions(baseSeed, optionsPerStyle),
    [baseSeed, optionsPerStyle],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Overlay */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : onClose}
        aria-label="Fechar"
      />

      {/* Drawer full-screen */}
      <aside
        className="
          absolute left-0 top-0 h-full w-full
          bg-background shadow-2xl
          animate-in slide-in-from-left duration-200
          flex flex-col
        "
        aria-label="Configurações do perfil"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold">Foto do perfil</p>
              {saving ? (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando…
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground wrap-break-word">
              Escolha um avatar da biblioteca
            </p>
          </div>

          <button
            className="p-2 rounded-xl hover:bg-muted transition shrink-0 disabled:opacity-50"
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const active = activeStyle === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStyle(s.id)}
                  disabled={saving}
                  className={[
                    "px-3 py-2 rounded-xl text-sm border transition disabled:opacity-50",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted/40",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="px-4 py-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-4 gap-4">
            {seedOptions.map((seed) => {
              const selected =
                value.style === activeStyle && value.seed === seed;

              return (
                <button
                  key={`${activeStyle}:${seed}`}
                  onClick={() => onChange({ style: activeStyle, seed })}
                  disabled={saving}
                  className={[
                    "rounded-full transition active:scale-95 disabled:opacity-60 disabled:active:scale-100",
                    selected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "",
                  ].join(" ")}
                  aria-label="Selecionar avatar"
                  title={seed}
                >
                  <img
                    src={avatarUrl(activeStyle, seed)}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full bg-muted"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>

          {/* Mensagens responsivas */}
          {errorMessage ? (
            <p className="text-xs text-destructive mt-6 leading-snug wrap-break-word">
              {errorMessage}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-6 leading-snug wrap-break-word">
              Sua escolha é salva automaticamente.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t">
          <button
            className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-95 transition disabled:opacity-60"
            onClick={onClose}
            disabled={saving}
          >
            Concluir
          </button>
        </div>
      </aside>
    </div>
  );
}
