"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import MobileDashboardSummary from "@/components/layout/MobileDashboardSummary";
import DateRangeFilterDrawer, {
  FILTER_EVENT,
  STORAGE_FROM_KEY,
  STORAGE_TO_KEY,
} from "@/components/layout/DateRangeFilterDrawer";
import ProfileAvatarModal, {
  type AvatarSelection,
  type AvatarStyle,
} from "@/components/profile/ProfileAvatarModal";
import { Button } from "../ui/button";

interface HeaderProps {
  onNavigate?: (tab: string) => void;
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

function MobileDashboardSummarySkeleton() {
  return (
    <section className="-mt-12 px-4 md:hidden">
      <div className="rounded-3xl bg-background shadow-sm border overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="mt-3 h-8 w-44 rounded bg-muted animate-pulse" />
            </div>
            <div className="shrink-0 h-10 w-10 rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="px-2 py-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-full px-3 py-3 rounded-2xl flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-2xl bg-muted animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="mt-2 h-3 w-28 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Header({ onNavigate }: HeaderProps) {
  const session = authClient.useSession();
  const { toast } = useToast();

  const userId = session.data?.user?.id;
  const userName = session.data?.user?.name || "Zibee";
  const baseSeed = userName;

  const [openProfileDrawer, setOpenProfileDrawer] = React.useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = React.useState(false);

  // Avatar
  const [loadingAvatar, setLoadingAvatar] = React.useState(true);
  const [savingAvatar, setSavingAvatar] = React.useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string | null>(
    null,
  );

  const [avatar, setAvatar] = React.useState<AvatarSelection>({
    style: DEFAULT_STYLE,
    seed: `${baseSeed}-1`,
  });

  // Totais do painel (MobileDashboardSummary)
  const [loadingTotals, setLoadingTotals] = React.useState(true);
  const [totalReceitas, setTotalReceitas] = React.useState(0);
  const [totalDespesas, setTotalDespesas] = React.useState(0);
  const [totalDespesasFixas, setTotalDespesasFixas] = React.useState(0);

  const saldoGeral = React.useMemo(() => {
    if (!totalReceitas || totalReceitas <= 0) return 0;
    return totalReceitas - totalDespesas;
  }, [totalReceitas, totalDespesas]);

  // ====== Avatar ======
  React.useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      setLoadingAvatar(true);
      try {
        const res = await fetch("/api/profile/avatar", { method: "GET" });

        if (!res.ok) {
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
        // ignore
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
      setAvatar(next);

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

  // ====== Totais (respondem ao filtro de período) ======
  const readRange = React.useCallback(() => {
    const from = localStorage.getItem(STORAGE_FROM_KEY);
    const to = localStorage.getItem(STORAGE_TO_KEY);
    return { from: from || null, to: to || null };
  }, []);

  const loadTotals = React.useCallback(async () => {
    if (!userId) {
      setLoadingTotals(false);
      return;
    }

    setLoadingTotals(true);
    const { from, to } = readRange();

    try {
      let receitasQuery = supabase
        .from("lancamentos")
        .select("valor")
        .eq("user_id", userId)
        .eq("tipo", "Receita")
        .eq("pago", true);

      let despesasQuery = supabase
        .from("lancamentos")
        .select("valor")
        .eq("user_id", userId)
        .eq("tipo", "Despesa");

      const fixasQuery = supabase
        .from("despesas_fixas")
        .select("valor")
        .eq("user_id", userId);

      if (from) {
        receitasQuery = receitasQuery.gte("data_vencimento", from);
        despesasQuery = despesasQuery.gte("data_vencimento", from);
      }
      if (to) {
        receitasQuery = receitasQuery.lte("data_vencimento", to);
        despesasQuery = despesasQuery.lte("data_vencimento", to);
      }

      const [
        { data: receitasData, error: receitasError },
        { data: despesasData, error: despesasError },
        { data: fixasData, error: fixasError },
      ] = await Promise.all([receitasQuery, despesasQuery, fixasQuery]);

      if (receitasError) throw receitasError;
      if (despesasError) throw despesasError;
      if (fixasError) throw fixasError;

      const rec =
        receitasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const desp =
        despesasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const fix =
        fixasData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;

      setTotalReceitas(rec);
      setTotalDespesas(desp);
      setTotalDespesasFixas(fix);
    } catch {
      setTotalReceitas(0);
      setTotalDespesas(0);
      setTotalDespesasFixas(0);
    } finally {
      setLoadingTotals(false);
    }
  }, [readRange, userId]);

  React.useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  React.useEffect(() => {
    function onFilterChanged() {
      loadTotals();
    }
    window.addEventListener(FILTER_EVENT, onFilterChanged);
    return () => window.removeEventListener(FILTER_EVENT, onFilterChanged);
  }, [loadTotals]);

  return (
    <>
      {/* Desktop header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 border-b bg-background/70 backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{getGreeting()},</p>
          <p className="text-xl font-semibold truncate">{userName}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => setOpenFilterDrawer(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>

          <button
            type="button"
            onClick={() => setOpenProfileDrawer(true)}
            className="h-10 w-10 rounded-full overflow-hidden ring-1 ring-border"
            aria-label="Abrir perfil"
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
        </div>
      </header>

      {/* Mobile header + summary */}
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
              type="button"
              onClick={() => setOpenFilterDrawer(true)}
              className="shrink-0 p-3 rounded-2xl bg-primary-foreground/10 hover:bg-primary-foreground/15 active:scale-95 transition"
              aria-label="Abrir filtros"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </header>

        {loadingTotals ? (
          <MobileDashboardSummarySkeleton />
        ) : (
          <MobileDashboardSummary
            saldoGeral={saldoGeral}
            entradasConfirmadas={totalReceitas}
            gastosVariaveis={totalDespesas}
            contasFixasMensais={totalDespesasFixas}
            onNavigate={(target) => onNavigate?.(target)}
          />
        )}
      </section>

      {/* Drawer global (aparece em qualquer breakpoint) */}
      <DateRangeFilterDrawer
        open={openFilterDrawer}
        onClose={() => setOpenFilterDrawer(false)}
      />

      <ProfileAvatarModal
        open={openProfileDrawer}
        onClose={() => setOpenProfileDrawer(false)}
        baseSeed={baseSeed}
        value={avatar}
        onChange={handleAvatarChange}
        saving={savingAvatar}
        errorMessage={saveErrorMessage}
      />
    </>
  );
}
