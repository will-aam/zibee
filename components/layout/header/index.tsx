"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { DesktopHeader } from "./DesktopHeader";
import { MobileHeader } from "./MobileHeader";
import { MobileNav } from "./MobileNav";
import { UpdatesModal } from "../UpdatesModal";
import { PushPermissionModal } from "../PushPermissionModal";
import ProfileAvatarModal, {
  type AvatarSelection,
} from "@/components/profile/ProfileAvatarModal";
import DateRangeFilterDrawer, {
  STORAGE_FROM_KEY,
  STORAGE_TO_KEY,
  STORAGE_PRESET_KEY,
  FILTER_EVENT,
} from "@/components/layout/DateRangeFilterDrawer";

// Helper para o filtro do tempo
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export default function Header({
  activeTab = "dashboard",
  onNavigate,
}: {
  activeTab?: string;
  onNavigate?: (tab: string) => void;
}) {
  const router = useRouter();
  const session = authClient.useSession();
  const {
    activeContext,
    setActiveContext,
    hasPremiumAccess,
    setHasPremiumAccess,
  } = useWorkspace();

  const [pendingInvite, setPendingInvite] = React.useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [openProfileDrawer, setOpenProfileDrawer] = React.useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = React.useState(false);
  const [avatar, setAvatar] = React.useState<AvatarSelection>({
    style: "bottts-neutral",
    seed: "Zibee-1",
  });

  const [loadingTotals, setLoadingTotals] = React.useState(true);
  const [totalReceitas, setTotalReceitas] = React.useState(0);
  const [totalDespesas, setTotalDespesas] = React.useState(0);
  const [totalDespesasFixas, setTotalDespesasFixas] = React.useState(0);
  const [listaFixas, setListaFixas] = React.useState<any[]>([]);

  // NOVO: Estado para as fixas que já venceram no tempo
  const [totalFixasPagas, setTotalFixasPagas] = React.useState(0);

  const userId = session.data?.user?.id;
  const userEmail = session.data?.user?.email;
  const userName = session.data?.user?.name || "Zibee";

  const saldoGeral = React.useMemo(() => {
    if (!totalReceitas || totalReceitas <= 0) return 0;
    return totalReceitas - totalDespesas - totalDespesasFixas;
  }, [totalReceitas, totalDespesas, totalDespesasFixas]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
        onError: () => setIsLoggingOut(false),
      },
    });
  };

  const readRange = React.useCallback(() => {
    let from = localStorage.getItem(STORAGE_FROM_KEY);
    let to = localStorage.getItem(STORAGE_TO_KEY);
    const preset = localStorage.getItem(STORAGE_PRESET_KEY);

    if (preset === "this_month" || !from || !to) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();

      const realFrom = `${ano}-${mes}-01`;
      const realTo = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

      if (from !== realFrom || to !== realTo) {
        from = realFrom;
        to = realTo;
        localStorage.setItem(STORAGE_FROM_KEY, from);
        localStorage.setItem(STORAGE_TO_KEY, to);
        localStorage.setItem(STORAGE_PRESET_KEY, "this_month");
      }
    }

    return { from, to };
  }, []);

  const loadTotals = React.useCallback(async () => {
    if (!userId) return setLoadingTotals(false);
    setLoadingTotals(true);

    const { from, to } = readRange();

    try {
      let groupId = null;
      if (activeContext === "grupo") {
        const { data: g } = await supabase
          .from("grupos")
          .select("id")
          .eq("criador_id", userId)
          .maybeSingle();
        groupId = g?.id;
        if (!groupId) {
          const { data: m } = await supabase
            .from("membros_grupo")
            .select("grupo_id")
            .eq("user_id", userId)
            .eq("status", "Aceito")
            .maybeSingle();
          groupId = m?.grupo_id;
        }
      }

      let queryR = supabase
        .from("lancamentos")
        .select("valor")
        .eq("tipo", "Receita")
        .eq("pago", true);

      let queryD = supabase
        .from("lancamentos")
        .select("valor")
        .eq("tipo", "Despesa")
        .is("conta_fixa_id", null);

      let queryF = supabase
        .from("despesas_fixas")
        .select("*")
        .eq("status", "ativo")
        .order("dia_vencimento", { ascending: true });

      if (activeContext === "grupo" && groupId) {
        queryR = queryR.eq("grupo_id", groupId);
        queryD = queryD.eq("grupo_id", groupId);
        queryF = queryF.eq("grupo_id", groupId);
      } else {
        queryR = queryR.eq("user_id", userId).is("grupo_id", null);
        queryD = queryD.eq("user_id", userId).is("grupo_id", null);
        queryF = queryF.eq("user_id", userId).is("grupo_id", null);
      }

      if (from) {
        queryR = queryR.gte("data_vencimento", from);
        queryD = queryD.gte("data_vencimento", from);
      }
      if (to) {
        queryR = queryR.lte("data_vencimento", to);
        queryD = queryD.lte("data_vencimento", to);
      }

      const [{ data: r }, { data: d }, { data: f }] = await Promise.all([
        queryR,
        queryD,
        queryF,
      ]);

      const fetchedReceitas =
        r?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const fetchedDespesas =
        d?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const fixasValidas = f || [];
      const fetchedFixas =
        fixasValidas.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;

      // =========================================================
      // O FILTRO DO TEMPO (Igual ao do Desktop)
      // =========================================================
      const today = new Date();
      const currentMonthStr = getCurrentYearMonth();
      const viewedMonthStr = from ? from.substring(0, 7) : currentMonthStr;

      let calcFixasPagas = 0;

      if (viewedMonthStr < currentMonthStr) {
        calcFixasPagas = fetchedFixas;
      } else if (viewedMonthStr > currentMonthStr) {
        calcFixasPagas = 0;
      } else {
        const currentDay = today.getDate();
        calcFixasPagas = fixasValidas.reduce((acc, curr) => {
          if (Number(curr.dia_vencimento) <= currentDay) {
            return acc + Number(curr.valor);
          }
          return acc;
        }, 0);
      }
      // =========================================================

      setTotalReceitas(fetchedReceitas);
      setTotalDespesas(fetchedDespesas);
      setTotalDespesasFixas(fetchedFixas);
      setListaFixas(fixasValidas);
      setTotalFixasPagas(calcFixasPagas); // Salva o cálculo!
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTotals(false);
    }
  }, [userId, activeContext, readRange]);

  React.useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  React.useEffect(() => {
    window.addEventListener(FILTER_EVENT, loadTotals);
    window.addEventListener("zibee:transaction-changed", loadTotals);
    return () => {
      window.removeEventListener(FILTER_EVENT, loadTotals);
      window.removeEventListener("zibee:transaction-changed", loadTotals);
    };
  }, [loadTotals]);

  React.useEffect(() => {
    if (!userId || !userEmail) return;
    const check = async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("has_premium_access")
        .eq("id", userId)
        .maybeSingle();
      const { data: myGroup } = await supabase
        .from("grupos")
        .select("id")
        .eq("criador_id", userId)
        .maybeSingle();
      const { data: memberGroup } = await supabase
        .from("membros_grupo")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "Aceito")
        .maybeSingle();
      setHasPremiumAccess(
        !!(profile?.has_premium_access || myGroup || memberGroup),
      );
      const { data: invite } = await supabase
        .from("membros_grupo")
        .select("id, grupos(nome)")
        .eq("email_convite", userEmail.toLowerCase())
        .eq("status", "Pendente")
        .maybeSingle();
      if (invite?.grupos)
        setPendingInvite({
          id: invite.id,
          grupo_nome: (invite.grupos as any).nome,
        });
      else setPendingInvite(null);
    };
    check();
  }, [userId, userEmail, setHasPremiumAccess]);

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/profile/avatar");
      if (res.ok) {
        const data = await res.json();
        setAvatar({
          style: data.avatar_style || "bottts-neutral",
          seed: data.avatar_seed || `${userName}-1`,
        });
      }
    };
    load();
  }, [userName]);

  const avatarUrl = `https://api.dicebear.com/9.x/${avatar.style}/svg?seed=${avatar.seed}&size=96`;

  return (
    <>
      <DesktopHeader
        activeTab={activeTab}
        onNavigate={onNavigate}
        userName={userName}
        avatarUrl={avatarUrl}
        pendingInvite={pendingInvite}
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
        onOpenAvatarModal={() => setOpenProfileDrawer(true)}
        onOpenFilter={() => setOpenFilterDrawer(true)}
      />

      <MobileHeader
        activeTab={activeTab}
        userName={userName}
        avatarUrl={avatarUrl}
        pendingInvite={pendingInvite}
        loadingTotals={loadingTotals}
        saldoGeral={saldoGeral}
        totalReceitas={totalReceitas}
        totalDespesas={totalDespesas}
        totalDespesasFixas={totalDespesasFixas}
        listaFixas={listaFixas}
        totalFixasPagas={totalFixasPagas} // MÁGICA ENVIADA: Passando pro mobile!
        onNavigate={onNavigate!}
        onOpenProfile={() => setOpenProfileDrawer(true)}
        onOpenFilter={() => setOpenFilterDrawer(true)}
      />

      <MobileNav activeTab={activeTab} onNavigate={onNavigate!} />
      <DateRangeFilterDrawer
        open={openFilterDrawer}
        onClose={() => setOpenFilterDrawer(false)}
      />
      <ProfileAvatarModal
        open={openProfileDrawer}
        onClose={() => setOpenProfileDrawer(false)}
        baseSeed={userName}
        value={avatar}
        onChange={setAvatar}
        activeContext={activeContext}
        onContextChange={(ctx) => setActiveContext(ctx as any)}
        hasPremiumAccess={hasPremiumAccess}
        pendingInvite={pendingInvite}
        setPendingInvite={setPendingInvite}
        userId={userId}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        onNavigateSettings={() => onNavigate?.("configuracoes")}
      />

      <UpdatesModal onNavigate={onNavigate} />

      <PushPermissionModal />
    </>
  );
}
