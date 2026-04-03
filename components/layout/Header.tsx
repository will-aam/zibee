"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Settings } from "lucide-react";
import ProfileAvatarModal, {
  type AvatarSelection,
  type AvatarStyle,
} from "@/components/profile/ProfileAvatarModal";

interface HeaderProps {
  onOpenFilters: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

const AVATAR_STORAGE_KEY = "zibee:profileAvatar";

function getDefaultAvatar(seed: string): AvatarSelection {
  // default: bottts-neutral
  return { style: "bottts-neutral", seed: seed || "Zibee" };
}

function avatarUrl(style: AvatarStyle, seed: string) {
  const safeSeed = encodeURIComponent(seed || "Zibee");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=96`;
}

export default function Header({ onOpenFilters }: HeaderProps) {
  const session = authClient.useSession();
  const userName = session.data?.user.name || "Zibee";

  // seed: ideal é algo estável (id/email). Por enquanto usamos nome.
  const seed = userName;

  const [avatar, setAvatar] = React.useState<AvatarSelection>(() => {
    // SSR safety: "use client" garante client, mas ainda assim guardamos fallback
    return getDefaultAvatar(seed);
  });

  const [openProfileModal, setOpenProfileModal] = React.useState(false);

  // carrega do localStorage quando montar
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (!raw) {
        setAvatar(getDefaultAvatar(seed));
        return;
      }
      const parsed = JSON.parse(raw) as Partial<AvatarSelection>;
      const style = (parsed.style as AvatarStyle) || "bottts-neutral";
      const savedSeed = parsed.seed || seed;
      setAvatar({ style, seed: savedSeed });
    } catch {
      setAvatar(getDefaultAvatar(seed));
    }
    // seed muda se o usuário mudar; podemos rehidratar
  }, [seed]);

  // persiste quando avatar mudar
  React.useEffect(() => {
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar));
    } catch {
      // ignore
    }
  }, [avatar]);

  return (
    <section className="md:hidden">
      {/* HERO (20% maior) */}
      <header
        className="
          bg-primary text-primary-foreground
          px-4
          pt-[max(22px,env(safe-area-inset-top))]
          pb-20
        "
      >
        <div className="flex items-center gap-4">
          {/* Avatar clicável */}
          <button
            type="button"
            onClick={() => setOpenProfileModal(true)}
            className="shrink-0 h-16 w-16 rounded-full bg-primary-foreground/15 overflow-hidden flex items-center justify-center ring-1 ring-white/15"
            aria-label="Abrir configurações do perfil"
          >
            <img
              src={avatarUrl(avatar.style, seed)}
              alt="Avatar do perfil"
              className="h-full w-full object-cover"
            />
          </button>

          {/* Saudação + nome */}
          <div className="flex-1 min-w-0">
            <p className="text-sm opacity-90">{getGreeting()},</p>
            <p className="font-bold text-xl leading-tight truncate">
              {userName}!
            </p>
          </div>

          {/* Botão (mantive Settings aqui como você pediu) */}
          <button
            onClick={onOpenFilters}
            className="shrink-0 p-3 rounded-2xl bg-primary-foreground/10 hover:bg-primary-foreground/15 active:scale-95 transition"
            aria-label="Abrir configurações"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/*
      // CARD “flutuando” — você vai substituir por outro componente.
      // Exemplo:
      // import QuickAccessCard from "@/components/....";
      // <QuickAccessCard /> */}
      <div className="-mt-10 px-4">
        <div className="rounded-2xl bg-background shadow-sm border p-4">
          <p className="text-sm text-muted-foreground">Acesso rápido</p>
          <p className="text-base font-semibold">Seu painel</p>
        </div>
      </div>

      <ProfileAvatarModal
        open={openProfileModal}
        onClose={() => setOpenProfileModal(false)}
        baseSeed={seed}
        value={avatar}
        onChange={(next) => setAvatar(next)}
      />
    </section>
  );
}
