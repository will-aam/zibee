// components/layout/Header.tsx
"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const DEFAULT_STYLE: AvatarStyle = "bottts-neutral";

function avatarUrl(style: AvatarStyle, seed: string) {
  const safeSeed = encodeURIComponent(seed || "Zibee");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=96`;
}

export default function Header({ onOpenFilters }: HeaderProps) {
  const session = authClient.useSession();
  const { toast } = useToast();

  const userName = session.data?.user?.name || "Zibee";
  const baseSeed = userName;

  const [openProfileDrawer, setOpenProfileDrawer] = React.useState(false);

  const [loadingAvatar, setLoadingAvatar] = React.useState(true);
  const [savingAvatar, setSavingAvatar] = React.useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string | null>(
    null,
  );

  const [avatar, setAvatar] = React.useState<AvatarSelection>({
    style: DEFAULT_STYLE,
    seed: `${baseSeed}-1`,
  });

  // Carrega do server (Better Auth + Supabase admin)
  React.useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      setLoadingAvatar(true);
      try {
        const res = await fetch("/api/profile/avatar", { method: "GET" });

        if (!res.ok) {
          // se for 401, usuário não está logado (ou cookie não chegou)
          setLoadingAvatar(false);
          return;
        }

        const data = (await res.json()) as {
          avatar_style?: AvatarStyle;
          avatar_seed?: string;
        };

        if (cancelled) return;

        setAvatar({
          style: (data.avatar_style || DEFAULT_STYLE) as AvatarStyle,
          seed: data.avatar_seed?.trim() ? data.avatar_seed : `${baseSeed}-1`,
        });
      } catch {
        // não quebra UI
      } finally {
        if (!cancelled) setLoadingAvatar(false);
      }
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [baseSeed]);

  const handleAvatarChange = React.useCallback(
    async (next: AvatarSelection) => {
      if (savingAvatar) return;

      setSaveErrorMessage(null);
      setAvatar(next); // otimista

      setSavingAvatar(true);
      try {
        const res = await fetch("/api/profile/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatar_style: next.style,
            avatar_seed: next.seed,
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const msg =
            payload?.error ||
            "Não foi possível salvar agora. Verifique sua conexão e tente novamente.";

          setSaveErrorMessage(msg);
          toast({
            title: "Erro ao salvar",
            description: msg,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Salvo!",
          description: "Sua foto de perfil foi atualizada.",
        });
      } catch {
        const msg =
          "Falha de conexão. Tente novamente quando sua internet estabilizar.";
        setSaveErrorMessage(msg);
        toast({
          title: "Erro ao salvar",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setSavingAvatar(false);
      }
    },
    [savingAvatar, toast],
  );

  return (
    <section className="md:hidden">
      <header
        className="
          bg-primary text-primary-foreground
          px-4
          pt-[max(22px,env(safe-area-inset-top))]
          pb-20
        "
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpenProfileDrawer(true)}
            className="shrink-0 h-16 w-16 rounded-full bg-primary-foreground/15 overflow-hidden flex items-center justify-center ring-1 ring-white/15"
            aria-label="Abrir configurações do perfil"
          >
            <img
              src={avatarUrl(avatar.style, avatar.seed)}
              alt="Avatar do perfil"
              className={[
                "h-full w-full object-cover",
                loadingAvatar ? "opacity-80" : "opacity-100",
              ].join(" ")}
            />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm opacity-90">{getGreeting()},</p>
            <p className="font-bold text-xl leading-tight truncate">
              {userName}!
            </p>
          </div>

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
        open={openProfileDrawer}
        onClose={() => setOpenProfileDrawer(false)}
        baseSeed={baseSeed}
        value={avatar}
        onChange={handleAvatarChange}
        saving={savingAvatar}
        errorMessage={saveErrorMessage}
      />
    </section>
  );
}
