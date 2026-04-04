"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Filter, Target, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sora, Audiowide } from "next/font/google";
import Image from "next/image";
import { handleWhatsAppContact } from "@/lib/utils";

import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as DocumentTextSolid,
  ChartPieIcon as ChartPieSolid,
  Cog6ToothIcon as CogSolid,
  UserGroupIcon as UserGroupSolid,
  UserIcon as UserSolid,
  LockClosedIcon as LockClosedSolid,
} from "@heroicons/react/24/solid";

import {
  HomeIcon,
  DocumentTextIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  UserGroupIcon as UserGroupOutline,
} from "@heroicons/react/24/outline";

// UI Components do Shadcn
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <div className="rounded-3xl bg-background shadow-sm border overflow-hidden animate-pulse">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-3 h-8 w-44 rounded bg-muted" />
          </div>
          <div className="h-10 w-10 rounded-2xl bg-muted" />
        </div>
        <div className="h-px bg-border" />
        <div className="p-2 space-y-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full p-3 rounded-2xl flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-2xl bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="mt-2 h-3 w-20 rounded bg-muted" />
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
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
  const userName = "Zibee";
  const baseSeed = userName;

  const [openProfileDrawer, setOpenProfileDrawer] = React.useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const [loadingAvatar, setLoadingAvatar] = React.useState(true);
  const [savingAvatar, setSavingAvatar] = React.useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string | null>(
    null,
  );

  const [avatar, setAvatar] = React.useState<AvatarSelection>({
    style: DEFAULT_STYLE,
    seed: `${baseSeed}-1`,
  });

  // ESTADOS DE CONTEXTO (Workspaces)
  const [activeContext, setActiveContext] = React.useState("pessoal");
  const hasPremiumAccess = false; // Mude para true no banco para testar liberado

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

  // Sincronização de Tema PWA
  React.useEffect(() => {
    const updateThemeColor = () => {
      const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
      const setMetaColor = (color: string) => {
        metaThemes.forEach((meta) => meta.setAttribute("content", color));
      };

      if (activeTab === "dashboard" && window.innerWidth < 768) {
        const headerEl = document.getElementById("mobile-header-top");
        if (headerEl) {
          const bgColor = window.getComputedStyle(headerEl).backgroundColor;
          setMetaColor(bgColor);
          document.documentElement.style.backgroundColor = bgColor;
        }
      } else {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        setMetaColor(bodyBg);
        document.documentElement.style.backgroundColor = "";
      }
    };

    updateThemeColor();
    window.addEventListener("resize", updateThemeColor);
    return () => window.removeEventListener("resize", updateThemeColor);
  }, [activeTab]);

  // Carregar Avatar
  React.useEffect(() => {
    let cancelled = false;
    async function loadAvatar() {
      setLoadingAvatar(true);
      try {
        const res = await fetch("/api/profile/avatar", { method: "GET" });
        if (!res.ok) return;
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
        const msg = "Falha de conexão. Tente novamente.";
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
    window.addEventListener(FILTER_EVENT, loadTotals);
    return () => window.removeEventListener(FILTER_EVENT, loadTotals);
  }, [loadTotals]);

  const navButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-2xl transition-all duration-300 ease-in-out active:scale-[0.96] ${
      isActive
        ? "bg-primary/10 text-primary px-5 py-3"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground px-4 py-3"
    }`;

  const mobileNavButtonClass = (isActive: boolean) =>
    `flex items-center justify-center rounded-full transition-all duration-300 ease-in-out active:scale-95 ${
      isActive
        ? "bg-primary/15 text-primary px-5 py-2.5"
        : "text-muted-foreground px-4 py-2.5"
    }`;

  // ==========================================================================
  // CONTEÚDO DO MENU DO PERFIL (Reutilizado no Popover e no Modal)
  // ==========================================================================
  const ProfileMenuContent = () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Seu Espaço
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => setActiveContext("pessoal")}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              activeContext === "pessoal"
                ? "bg-primary/10 border-primary text-primary"
                : "hover:bg-muted border-transparent text-muted-foreground"
            }`}
          >
            <UserSolid className="w-5 h-5" />
            <span className="font-semibold text-sm">Meu Pessoal</span>
          </button>

          <button
            onClick={() => {
              if (hasPremiumAccess) setActiveContext("grupo");
              else handleWhatsAppContact();
            }}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              activeContext === "grupo"
                ? "bg-primary/10 border-primary text-primary"
                : "hover:bg-muted border-transparent text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              {hasPremiumAccess ? (
                <UserGroupSolid className="w-5 h-5" />
              ) : (
                <LockClosedSolid className="w-5 h-5 text-amber-500" />
              )}
              <span className="font-semibold text-sm">Casa / Grupo</span>
            </div>
            {!hasPremiumAccess && (
              <Badge className="bg-amber-500 text-[10px] h-4 px-1.5">PRO</Badge>
            )}
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-border/50">
        <Button
          variant="outline"
          className="w-full justify-start rounded-xl gap-3 h-12 border-border/60"
          onClick={() => setOpenProfileDrawer(true)}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
            <img
              src={avatarUrl(avatar.style, avatar.seed)}
              alt="Mini"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-medium">Mudar Foto do Perfil</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl gap-3 h-11"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-bold">Sair da Conta</span>
      </Button>
    </div>
  );

  return (
    <>
      {/* ======================= DESKTOP HEADER ======================= */}
      <header
        className={`hidden md:flex items-center justify-between px-8 py-5 bg-background/80 backdrop-blur-md sticky top-0 z-50 ${sora.className}`}
      >
        {/* LOGO */}
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
            <h1
              className={`text-xl text-primary truncate ${audiowide.className}`}
            >
              Zibee
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {getGreeting()}!
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO DESKTOP */}
        <nav className="flex flex-1 items-center gap-2 justify-center">
          <button
            onClick={() => onNavigate?.("dashboard")}
            className={navButtonClass(activeTab === "dashboard")}
          >
            {activeTab === "dashboard" ? (
              <HomeSolid className="h-6 w-6 shrink-0" />
            ) : (
              <HomeIcon className="h-6 w-6 shrink-0" />
            )}
            <span
              className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-in-out ${activeTab === "dashboard" ? "max-w-[120px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
            >
              Dashboard
            </span>
          </button>
          <button
            onClick={() => onNavigate?.("lancamentos")}
            className={navButtonClass(activeTab === "lancamentos")}
          >
            {activeTab === "lancamentos" ? (
              <DocumentTextSolid className="h-6 w-6 shrink-0" />
            ) : (
              <DocumentTextIcon className="h-6 w-6 shrink-0" />
            )}
            <span
              className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-in-out ${activeTab === "lancamentos" ? "max-w-[120px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
            >
              Lançamentos
            </span>
          </button>
          <button
            onClick={() => onNavigate?.("receitas")}
            className={navButtonClass(activeTab === "receitas")}
          >
            {activeTab === "receitas" ? (
              <ChartPieSolid className="h-6 w-6 shrink-0" />
            ) : (
              <ChartPieIcon className="h-6 w-6 shrink-0" />
            )}
            <span
              className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-in-out ${activeTab === "receitas" ? "max-w-[120px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
            >
              Resumo
            </span>
          </button>
          <button
            onClick={() => onNavigate?.("grupos")}
            className={navButtonClass(activeTab === "grupos")}
          >
            {activeTab === "grupos" ? (
              <UserGroupSolid className="h-6 w-6 shrink-0" />
            ) : (
              <UserGroupOutline className="h-6 w-6 shrink-0" />
            )}
            <span
              className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-in-out ${activeTab === "grupos" ? "max-w-[120px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
            >
              Grupos
            </span>
          </button>
          <button
            onClick={() => onNavigate?.("metas")}
            className={navButtonClass(activeTab === "metas")}
          >
            <Target
              className={`h-6 w-6 shrink-0 ${activeTab === "metas" ? "text-primary" : ""}`}
            />
            <span
              className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-in-out ${activeTab === "metas" ? "max-w-[120px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
            >
              Metas
            </span>
          </button>
          <button
            onClick={() => onNavigate?.("configuracoes")}
            className={navButtonClass(activeTab === "configuracoes")}
          >
            {activeTab === "configuracoes" ? (
              <CogSolid className="h-6 w-6 shrink-0" />
            ) : (
              <Cog6ToothIcon className="h-6 w-6 shrink-0" />
            )}
            <span
              className={`overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-in-out ${activeTab === "configuracoes" ? "max-w-[150px] ml-2.5 opacity-100" : "max-w-0 ml-0 opacity-0"}`}
            >
              Configurações
            </span>
          </button>
        </nav>

        {/* CONTROLES DIREITA DESKTOP */}
        <div className="flex items-center gap-4 ml-4">
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

          <div className="h-8 w-px bg-border mx-1" />

          {/* POPOVER DO PERFIL DESKTOP */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-all shadow-sm outline-none active:scale-95">
                <img
                  src={avatarUrl(avatar.style, avatar.seed)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-5 rounded-3xl shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl z-100"
            >
              <ProfileMenuContent />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* ======================= MOBILE HEADER ======================= */}
      {activeTab === "dashboard" && (
        <section className={`md:hidden ${sora.className}`}>
          <header
            id="mobile-header-top"
            className="bg-primary text-primary-foreground px-4 pt-[max(22px,env(safe-area-inset-top))] pb-20"
          >
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => setOpenProfileDrawer(true)}
                className="shrink-0 h-16 w-16 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-white/80 ring-offset-2 ring-offset-primary hover:scale-105 active:scale-95 transition"
              >
                <img
                  src={avatarUrl(avatar.style, avatar.seed)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
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

      {/* ======================= MOBILE BOTTOM NAV ======================= */}
      <div className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 h-20">
          <button
            onClick={() => onNavigate?.("dashboard")}
            className={mobileNavButtonClass(activeTab === "dashboard")}
          >
            {activeTab === "dashboard" ? (
              <HomeSolid className="h-7 w-7 shrink-0" />
            ) : (
              <HomeIcon className="h-7 w-7 shrink-0" />
            )}
          </button>
          <button
            onClick={() => onNavigate?.("lancamentos")}
            className={mobileNavButtonClass(activeTab === "lancamentos")}
          >
            {activeTab === "lancamentos" ? (
              <DocumentTextSolid className="h-7 w-7 shrink-0" />
            ) : (
              <DocumentTextIcon className="h-7 w-7 shrink-0" />
            )}
          </button>
          <button
            onClick={() => onNavigate?.("grupos")}
            className={mobileNavButtonClass(activeTab === "grupos")}
          >
            {activeTab === "grupos" ? (
              <UserGroupSolid className="h-7 w-7 shrink-0" />
            ) : (
              <UserGroupOutline className="h-7 w-7 shrink-0" />
            )}
          </button>
          <button
            onClick={() => onNavigate?.("receitas")}
            className={mobileNavButtonClass(activeTab === "receitas")}
          >
            {activeTab === "receitas" ? (
              <ChartPieSolid className="h-7 w-7 shrink-0" />
            ) : (
              <ChartPieIcon className="h-7 w-7 shrink-0" />
            )}
          </button>
          <button
            onClick={() => onNavigate?.("configuracoes")}
            className={mobileNavButtonClass(
              activeTab === "configuracoes" || activeTab === "despesas_fixas",
            )}
          >
            {activeTab === "configuracoes" || activeTab === "despesas_fixas" ? (
              <CogSolid className="h-7 w-7 shrink-0" />
            ) : (
              <Cog6ToothIcon className="h-7 w-7 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* MODAIS E DRAWERS */}
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
        activeContext={activeContext}
        onContextChange={setActiveContext}
        hasPremiumAccess={hasPremiumAccess}
      />
    </>
  );
}
