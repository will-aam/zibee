"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonthSelector } from "./releases/MonthSelector";

import {
  PlusIcon as PlusSolid,
  TrashIcon as TrashSolid,
  ArrowTrendingUpIcon as TrendingUpSolid,
  CalculatorIcon as CalculatorSolid,
  PencilIcon as PencilSolid,
  XMarkIcon as XSolid,
  UserGroupIcon as UserGroupSolid,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

interface ReceitaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_recebimento: number;
  user_id: string; // Precisamos do user_id para buscar a foto do robô
}

function avatarUrl(style: string, seed: string) {
  const safeSeed = encodeURIComponent(seed || "Zibee");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=96`;
}

// CACHE EM MEMÓRIA ATUALIZADO PARA SUPORTAR CONTEXTO
const memoryCache = {
  receitas: null as ReceitaFixa[] | null,
  totalDespesasFixas: null as number | null,
  variaveisPorMes: {} as Record<string, number>,
  avatares: {} as Record<string, string>, // Guarda os robôs dos membros
};

export default function Receitas() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  const [receitas, setReceitas] = useState<ReceitaFixa[]>(
    memoryCache.receitas || [],
  );
  const [totalDespesasFixas, setTotalDespesasFixas] = useState(
    memoryCache.totalDespesasFixas || 0,
  );
  const [totalVariaveis, setTotalVariaveis] = useState(0);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>(
    memoryCache.avatares || {},
  );

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState<Date>(new Date());
  const [mesReferencia, setMesReferencia] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");

  useEffect(() => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, "0");
      const novoMes = `${ano}-${mes}`;
      setMesReferencia(novoMes);

      const cacheKey = `${novoMes}_${activeContext}`;
      if (memoryCache.variaveisPorMes[cacheKey] !== undefined) {
        setTotalVariaveis(memoryCache.variaveisPorMes[cacheKey]);
      }
    }
  }, [date, activeContext]);

  const fetchAllData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      let groupId = currentGroupId;
      if (activeContext === "grupo" && !groupId) {
        const { data: myGroup } = await supabase
          .from("grupos")
          .select("id")
          .eq("criador_id", userId)
          .maybeSingle();
        if (myGroup) groupId = myGroup.id;
        else {
          const { data: membership } = await supabase
            .from("membros_grupo")
            .select("grupo_id")
            .eq("user_id", userId)
            .eq("status", "Aceito")
            .maybeSingle();
          if (membership) groupId = membership.grupo_id;
        }
        setCurrentGroupId(groupId);
        if (!groupId) {
          setLoading(false);
          return;
        }
      }

      const [ano, mes] = mesReferencia.split("-");
      const inicio = `${mesReferencia}-01`;
      const fim = `${mesReferencia}-${new Date(Number(ano), Number(mes), 0).getDate()}`;

      // Monta as queries baseadas no contexto
      let queryVariaveis = supabase
        .from("lancamentos")
        .select("valor")
        .eq("tipo", "Despesa")
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim);
      let queryReceitas = supabase
        .from("receitas_fixas")
        .select("*")
        .order("valor", { ascending: false });
      let queryFixas = supabase.from("despesas_fixas").select("valor");

      if (activeContext === "grupo" && groupId) {
        queryVariaveis = queryVariaveis.eq("grupo_id", groupId);
        queryReceitas = queryReceitas.eq("grupo_id", groupId);
        queryFixas = queryFixas.eq("grupo_id", groupId);
      } else {
        queryVariaveis = queryVariaveis
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryReceitas = queryReceitas
          .eq("user_id", userId)
          .is("grupo_id", null);
        queryFixas = queryFixas.eq("user_id", userId).is("grupo_id", null);
      }

      const [resReceitas, resFixas, resVariaveis] = await Promise.all([
        queryReceitas,
        queryFixas,
        queryVariaveis,
      ]);

      if (resReceitas.data) {
        memoryCache.receitas = resReceitas.data;
        setReceitas(resReceitas.data);

        // SE ESTIVER NO GRUPO, BUSCA OS AVATARES DOS DONOS DAS RECEITAS
        if (activeContext === "grupo") {
          const uniqueUserIds = Array.from(
            new Set(resReceitas.data.map((r) => r.user_id)),
          );
          if (uniqueUserIds.length > 0) {
            const { data: avatars } = await supabase
              .from("user_profile_settings_ba")
              .select("user_id, avatar_seed")
              .in("user_id", uniqueUserIds);
            const map: Record<string, string> = { ...avatarMap };
            avatars?.forEach((a) => (map[a.user_id] = a.avatar_seed));
            memoryCache.avatares = map;
            setAvatarMap(map);
          }
        }
      }

      if (resFixas.data) {
        const somaFixas = resFixas.data.reduce(
          (acc, item) => acc + Number(item.valor),
          0,
        );
        memoryCache.totalDespesasFixas = somaFixas;
        setTotalDespesasFixas(somaFixas);
      }

      if (resVariaveis.data) {
        const somaVariaveis = resVariaveis.data.reduce(
          (acc, item) => acc + Number(item.valor),
          0,
        );
        const cacheKey = `${mesReferencia}_${activeContext}`;
        memoryCache.variaveisPorMes[cacheKey] = somaVariaveis;
        setTotalVariaveis(somaVariaveis);
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados", error);
    } finally {
      setLoading(false);
    }
  }, [userId, mesReferencia, activeContext, currentGroupId, avatarMap]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetForm = () => {
    setNovoNome("");
    setNovoValor("");
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (item: ReceitaFixa) => {
    setNovoNome(item.nome);
    setNovoValor(String(item.valor));
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!userId || !novoNome || !novoValor) {
      toast({ title: "Preencha nome e valor", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        user_id: userId,
        grupo_id: activeContext === "grupo" ? currentGroupId : null, // Salva no grupo se estiver na aba Grupo!
        nome: novoNome,
        valor: Number(novoValor),
      };

      if (editingId) {
        let query = supabase
          .from("receitas_fixas")
          .update(payload)
          .eq("id", editingId);
        if (activeContext === "grupo" && currentGroupId)
          query = query.eq("grupo_id", currentGroupId);
        else query = query.eq("user_id", userId).is("grupo_id", null);
        await query;
        toast({ title: "Renda atualizada!" });
      } else {
        await supabase.from("receitas_fixas").insert([payload]);
        toast({ title: "Renda adicionada!" });
      }

      resetForm();
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!userId) return;
    try {
      setReceitas((prev) => prev.filter((r) => r.id !== id));

      let query = supabase.from("receitas_fixas").delete().eq("id", id);
      if (activeContext === "grupo" && currentGroupId)
        query = query.eq("grupo_id", currentGroupId);
      else query = query.eq("user_id", userId).is("grupo_id", null);

      await query;
      toast({ title: "Removido" });
      memoryCache.receitas =
        memoryCache.receitas?.filter((r) => r.id !== id) || null;
    } catch (error) {
      fetchAllData();
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const totalReceitas = receitas.reduce((acc, item) => acc + item.valor, 0);
  const sobraAposFixas = totalReceitas - totalDespesasFixas;
  const saldoFinal = sobraAposFixas - totalVariaveis;

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading && !memoryCache.receitas && activeContext === "pessoal") {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          {activeContext === "pessoal"
            ? "Resumo Financeiro"
            : "Orçamento da Grupo"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {activeContext === "pessoal"
            ? "Visão mensal das suas finanças"
            : "Acompanhe as rendas e os gastos compartilhados do mês"}
        </p>
      </div>

      {/* --- BLOCO 1: RESUMO MENSAL --- */}
      <section className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 font-semibold text-primary">
            {activeContext === "pessoal" ? (
              <CalculatorSolid className="h-5 w-5" />
            ) : (
              <UserGroupSolid className="h-5 w-5" />
            )}
            Balanço Mensal {activeContext === "grupo"}
          </h2>
          <div className="w-auto scale-90 origin-right -mr-2">
            <MonthSelector date={date} setDate={setDate} />
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center text-green-600 dark:text-green-500 font-medium">
            <span className="flex items-center gap-2">
              <TrendingUpSolid className="h-4 w-4" /> Entradas Fixas
            </span>
            <span>{formatMoney(totalReceitas)}</span>
          </div>
          <div className="flex justify-between items-center text-destructive/90">
            <span className="flex items-center gap-2 pl-2 border-l-2 border-destructive/20">
              (-) Contas Fixas
            </span>
            <span>{formatMoney(totalDespesasFixas)}</span>
          </div>
          <div className="flex justify-between items-center text-orange-500/90">
            <span className="flex items-center gap-2 pl-2 border-l-2 border-orange-500/20">
              (-) Gastos do Mês ({format(date, "MMM/yy", { locale: ptBR })})
            </span>
            <span>{formatMoney(totalVariaveis)}</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-primary/10 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Saldo Previsto {activeContext === "grupo" && "do Grupo"}
            </p>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${saldoFinal >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}`}
          >
            {formatMoney(saldoFinal)}
          </div>
        </div>
      </section>

      {/* --- BLOCO 2: RENDAS FIXAS (PESSOAL E GRUPO) --- */}
      <section className="space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <h3 className="font-semibold text-lg tracking-tight">
            {activeContext === "pessoal"
              ? "Minhas Rendas Fixas"
              : "Rendas do Grupo"}
          </h3>
          {!isFormOpen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <PlusSolid className="h-4 w-4 mr-1.5" /> Adicionar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <XSolid className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
          )}
        </div>

        {isFormOpen && (
          <div className="bg-card border rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              {editingId
                ? "Editar Renda"
                : activeContext === "pessoal"
                  ? "Nova Renda"
                  : "Adicionar Renda ao Grupo"}
            </p>
            <div className="grid gap-3 sm:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="ex: Salário"
                  autoFocus
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  type="number"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  placeholder="0.00"
                  className="h-10"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 w-full sm:w-auto"
              >
                {isSaving ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Salvar"
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col">
          {receitas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground bg-accent/30 rounded-xl border border-dashed">
              {activeContext === "pessoal"
                ? "Nenhuma renda fixa cadastrada."
                : "Nenhuma renda adicionada ao grupo ainda."}
            </div>
          ) : (
            receitas.map((item) => {
              // Verifica se temos a foto do robô mapeada para o usuário que criou esta renda
              const userSeed =
                activeContext === "grupo" ? avatarMap[item.user_id] : null;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-border/50 group last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-500 shrink-0 overflow-hidden">
                      {/* MOSTRA O ROBÔ DA PESSOA SE ESTIVER NO GRUPO */}
                      {activeContext === "grupo" && userSeed ? (
                        <img
                          src={avatarUrl("bottts-neutral", userSeed)}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <TrendingUpSolid className="h-4 w-4" />
                      )}
                    </div>
                    <p className="font-medium text-sm sm:text-base">
                      {item.nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm sm:text-base text-foreground">
                      {formatMoney(item.valor)}
                    </span>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {/* Só mostra os botões de editar se o usuário logado for o dono da renda, ou se estiver no pessoal */}
                      {(activeContext === "pessoal" ||
                        item.user_id === userId) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(item)}
                          >
                            <PencilSolid className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleExcluir(item.id)}
                          >
                            <TrashSolid className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
