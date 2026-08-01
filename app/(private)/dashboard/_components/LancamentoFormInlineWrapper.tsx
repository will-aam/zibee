"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LancamentoFormDialog } from "@/app/(private)/releases/_components/LancamentoFormDialog";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

export function LancamentoFormInlineWrapper() {
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);
  const [formasPagamentoDB, setFormasPagamentoDB] = useState<any[]>([]);
  const [cartoesDB, setCartoesDB] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      try {
        let groupId = null;
        if (activeContext === "grupo") {
          const { data: myGroup } = await supabase
            .from("grupos")
            .select("id")
            .eq("criador_id", userId)
            .maybeSingle();

          if (myGroup) {
            groupId = myGroup.id;
          } else {
            const { data: memberGroup } = await supabase
              .from("membros_grupo")
              .select("grupo_id")
              .eq("user_id", userId)
              .eq("status", "Aceito")
              .maybeSingle();
            groupId = memberGroup?.grupo_id;
          }
        }
        let queryCat = supabase.from("categorias").select("*").order("nome");
        let queryCartoes = supabase.from("cartoes_credito").select("*").order("nome");

        if (activeContext === "grupo" && groupId) {
          queryCat = queryCat.eq("grupo_id", groupId);
          queryCartoes = queryCartoes.eq("grupo_id", groupId);
        } else {
          queryCat = queryCat.eq("user_id", userId);
          queryCartoes = queryCartoes.eq("user_id", userId);
        }

        const [resFP, resCat, resCartoes] = await Promise.all([
          supabase.from("formas_pagamento").select("*").order("nome"),
          queryCat,
          queryCartoes
        ]);

        setFormasPagamentoDB(resFP.data || []);
        setCategoriasDB(resCat?.data || []);
        setCartoesDB(resCartoes.data || []);
      } catch (err) {
        console.error("Error fetching form data inline:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, activeContext]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-card border-l border-border/50">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <LancamentoFormDialog
      isOpen={true} // always open
      onClose={() => {}} // no-op
      onSuccess={() => {}} // no-op, events handle refresh
      lancamentoToEdit={null}
      userId={userId}
      categoriasDB={categoriasDB}
      formasPagamentoDB={formasPagamentoDB}
      cartoesDB={cartoesDB}
      activeContext={activeContext}
      groupId={null}
      isInline={true}
    />
  );
}
