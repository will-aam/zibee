"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { authClient } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { useResumoMensal } from "@/hooks/useResumoMensal";

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

export default function Header({
  activeTab = "dashboard",
  onNavigate,
}: {
  activeTab?: string;
  onNavigate?: (tab: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;
  const userEmail = session.data?.user?.email;
  const userName = session.data?.user?.name || "Zibee";

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

  // 1. LÓGICA DE DATAS (Simplificada)
  const readRange = React.useCallback(() => {
    if (typeof window === "undefined") return { from: null, to: null };
    const from = localStorage.getItem(STORAGE_FROM_KEY);
    const to = localStorage.getItem(STORAGE_TO_KEY);
    return { from, to };
  }, []);

  const { from, to } = readRange();

  // 2. O NOVO CÉREBRO: Chamada única ao Hook
  const { data: resumo, isLoading } = useResumoMensal({
    userId,
    activeContext,
    from,
    to,
  });

  // 3. ATUALIZAÇÃO AUTOMÁTICA: Escuta eventos e limpa o cache do React Query
  React.useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["resumo-mensal"] });
    };

    window.addEventListener(FILTER_EVENT, invalidate);
    window.addEventListener("zibee:transaction-changed", invalidate);
    return () => {
      window.removeEventListener(FILTER_EVENT, invalidate);
      window.removeEventListener("zibee:transaction-changed", invalidate);
    };
  }, [queryClient]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
        onError: () => setIsLoggingOut(false),
      },
    });
  };

  // Lógica de Avatar e Premium permanecem isoladas aqui por enquanto
  React.useEffect(() => {
    if (!userId) return;
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
  }, [userId, userName]);

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
        loadingTotals={isLoading}
        saldoGeral={resumo?.saldoGeral || 0}
        totalReceitas={resumo?.totalReceitas || 0}
        totalDespesas={resumo?.totalDespesas || 0}
        totalDespesasFixas={resumo?.totalDespesasFixas || 0}
        listaFixas={resumo?.listaFixas || []}
        totalFixasPagas={resumo?.totalFixasPagas || 0}
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
