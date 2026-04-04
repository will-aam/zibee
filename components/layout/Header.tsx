"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Filter, Target, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sora, Audiowide } from "next/font/google";
import Image from "next/image";

import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  ChartPieIcon as ChartPieSolid,
  Cog6ToothIcon as CogSolid,
} from "@heroicons/react/24/solid";

import {
  HomeIcon,
  DocumentTextIcon,
  ChartPieIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

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
import { Button } from "@/components/ui/button";

const sora = Sora({ subsets: ["latin"] });
const audiowide = Audiowide({ weight: "400", subsets: ["latin"] });

interface HeaderProps {
  activeTab?: string;
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

export default function Header({
  activeTab = "dashboard",
  onNavigate,
}: HeaderProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const { toast } = useToast();

  const userId = session.data?.user?.id;
  const userName = session.data?.user?.name || "Zibee";
  const baseSeed = userName;

  const [openProfileDrawer, setOpenProfileDrawer] = React.useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = React.useState(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

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

  // Totais do painel
  const [loadingTotals, setLoadingTotals] = React.useState(true);
  const [totalReceitas, setTotalReceitas] = React.useState(0);
  const [totalDespesas, setTotalDespesas] = React.useState(0);
  const [totalDespesasFixas, setTotalDespesasFixas] = React.useState(0);

  const saldoGeral = React.useMemo(() => {
    if (!totalReceitas || totalReceitas <= 0) return 0;
    return totalReceitas - totalDespesas;
  }, [totalReceitas, totalDespesas]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => router.push("/login"),
          onError: () => setIsLoggingOut(false),
        },
      });
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Avatar Fetch
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
        if (!res.ok) throw new Error();
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

  // Totais Fetch
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

      const [{ data: rData }, { data: dData }, { data: fData }] =
        await Promise.all([receitasQuery, despesasQuery, fixasQuery]);
      setTotalReceitas(
        rData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0,
      );
      setTotalDespesas(
        dData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0,
      );
      setTotalDespesasFixas(
        fData?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0,
      );
    } catch {
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

  // Nova classe para a navegação retrátil
  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-2xl transition-all duration-300 ease-out active:scale-[0.96] ${
      isActive
        ? "bg-primary/10 text-primary px-5 py-3" // Expandido com padding
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground p-3" // Retraído (só ícone)
    }`;

  return (
    <>
      {/* =========================================
          DESKTOP HEADER (Ampliado e mais limpo)
          ========================================= */}
      <header
        className={`hidden md:flex items-center justify-between px-8 py-5 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 ${sora.className}`}
      >
        {/* ESQUERDA: Logo e Saudação */}
        <div
          className="flex items-center gap-4 cursor-pointer mr-6 hover:opacity-80 transition-opacity"
          onClick={() => onNavigate?.("dashboard")}
        >
          <Image
            src="/icons8-abelha-64.png"
            alt="Zibee Logo"
            width={44}
            height={44}
            className="shrink-0"
            priority
          />
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {getGreeting()},
            </p>
            <h1
              className={`text-xl text-primary truncate ${audiowide.className}`}
            >
              Zibee - {userName}
            </h1>
          </div>
        </div>

        {/* CENTRO: Navegação (Somente Ícones, exceto o ativo) */}
        <nav className="flex flex-1 items-center gap-2 justify-center">
          <button
            onClick={() => onNavigate?.("dashboard")}
            className={navButtonClass(activeTab === "dashboard")}
            title="Dashboard"
          >
            {activeTab === "dashboard" ? (
              <HomeSolid className="h-6 w-6 shrink-0" />
            ) : (
              <HomeIcon className="h-6 w-6 shrink-0" />
            )}
            {activeTab === "dashboard" && (
              <span className="ml-2.5 font-semibold text-base whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                Dashboard
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate?.("lancamentos")}
            className={navButtonClass(activeTab === "lancamentos")}
            title="Lançamentos"
          >
            {activeTab === "lancamentos" ? (
              <DocumentTextSolid className="h-6 w-6 shrink-0" />
            ) : (
              <DocumentTextIcon className="h-6 w-6 shrink-0" />
            )}
            {activeTab === "lancamentos" && (
              <span className="ml-2.5 font-semibold text-base whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                Lançamentos
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate?.("receitas")}
            className={navButtonClass(activeTab === "receitas")}
            title="Planos"
          >
            {activeTab === "receitas" ? (
              <ChartPieSolid className="h-6 w-6 shrink-0" />
            ) : (
              <ChartPieIcon className="h-6 w-6 shrink-0" />
            )}
            {activeTab === "receitas" && (
              <span className="ml-2.5 font-semibold text-base whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                Planos
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate?.("metas")}
            className={navButtonClass(activeTab === "metas")}
            title="Metas"
          >
            <Target
              className={`h-6 w-6 shrink-0 ${activeTab === "metas" ? "text-primary" : ""}`}
            />
            {activeTab === "metas" && (
              <span className="ml-2.5 font-semibold text-base whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                Metas
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate?.("configuracoes")}
            className={navButtonClass(activeTab === "configuracoes")}
            title="Configurações"
          >
            {activeTab === "configuracoes" ? (
              <CogSolid className="h-6 w-6 shrink-0" />
            ) : (
              <Cog6ToothIcon className="h-6 w-6 shrink-0" />
            )}
            {activeTab === "configuracoes" && (
              <span className="ml-2.5 font-semibold text-base whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                Configurações
              </span>
            )}
          </button>
        </nav>

        {/* DIREITA: Filtro, Perfil e Sair (Botões mais visíveis) */}
        <div className="flex items-center gap-5 ml-4">
          {activeTab === "dashboard" && (
            <Button
              variant="outline"
              className="rounded-2xl h-11 px-5"
              onClick={() => setOpenFilterDrawer(true)}
            >
              <Filter className="h-5 w-5 mr-2" />
              <span className="text-base font-medium">Filtrar</span>
            </Button>
          )}

          <button
            onClick={() => setOpenProfileDrawer(true)}
            className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition shadow-sm"
            title="Seu Perfil"
          >
            <img
              src={avatarUrl(avatar.style, avatar.seed)}
              alt="Avatar"
              className={`h-full w-full object-cover ${loadingAvatar ? "opacity-80" : "opacity-100"}`}
            />
          </button>

          <div className="h-8 w-px bg-border mx-1" />

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-3 rounded-2xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Sair da conta"
          >
            {isLoggingOut ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <LogOut className="h-6 w-6" />
            )}
          </button>
        </div>
      </header>

      {/* =========================================
          MOBILE HEADER (Agora oculto fora do Dashboard)
          ========================================= */}
      {activeTab === "dashboard" && (
        <section className={`md:hidden ${sora.className}`}>
          <header className="bg-primary text-primary-foreground px-4 pt-[max(22px,env(safe-area-inset-top))] pb-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setOpenProfileDrawer(true)}
                className="shrink-0 h-16 w-16 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-white/80 ring-offset-2 ring-offset-primary hover:scale-105 active:scale-95 transition"
              >
                <img
                  src={avatarUrl(avatar.style, avatar.seed)}
                  alt="Avatar"
                  className={`h-full w-full object-cover ${loadingAvatar ? "opacity-80" : "opacity-100"}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/85">{getGreeting()},</p>
                <p className="font-semibold text-xl leading-tight truncate text-white">
                  {userName}!
                </p>
              </div>
              <button
                onClick={() => setOpenFilterDrawer(true)}
                className="shrink-0 p-3 rounded-2xl active:scale-95 transition"
              >
                <Filter className="h-5 w-5 text-white" />
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
      )}

      {/* =========================================
          MOBILE BOTTOM NAV 
          ========================================= */}
      <div className="fixed bottom-4 left-1/2 z-50 w-[95%] max-w-sm -translate-x-1/2 md:hidden">
        <div className="bg-card/95 backdrop-blur-sm border rounded-2xl px-2 py-2 flex items-center justify-between shadow-xl">
          <button
            onClick={() => onNavigate?.("dashboard")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all duration-200 ease-out active:scale-[0.97] ${activeTab === "dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            {activeTab === "dashboard" ? (
              <HomeSolid className="h-5 w-5" />
            ) : (
              <HomeIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </button>

          <button
            onClick={() => onNavigate?.("lancamentos")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all duration-200 ease-out active:scale-[0.97] ${activeTab === "lancamentos" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            {activeTab === "lancamentos" ? (
              <DocumentTextSolid className="h-5 w-5" />
            ) : (
              <DocumentTextIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Lanç.</span>
          </button>

          <button
            onClick={() => onNavigate?.("receitas")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all duration-200 ease-out active:scale-[0.97] ${activeTab === "receitas" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            {activeTab === "receitas" ? (
              <ChartPieSolid className="h-5 w-5" />
            ) : (
              <ChartPieIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">Planos</span>
          </button>

          <button
            onClick={() => onNavigate?.("configuracoes")}
            className={`flex-1 h-14 flex flex-col items-center justify-center rounded-xl transition-all duration-200 ease-out active:scale-[0.97] ${activeTab === "configuracoes" || activeTab === "despesas_fixas" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            {activeTab === "configuracoes" || activeTab === "despesas_fixas" ? (
              <CogSolid className="h-5 w-5" />
            ) : (
              <Cog6ToothIcon className="h-5 w-5" />
            )}
            <span className="text-[10px] mt-1 font-medium truncate max-w-full px-1">
              Configurações
            </span>
          </button>
        </div>
      </div>

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
