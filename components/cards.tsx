"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthSelector } from "./releases/MonthSelector";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCardIcon,
  PlusIcon,
  CalendarIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// ==========================================
// COMPONENTE DE LOGOMARCAS (REFINADAS E MODERNIZADAS)
// ==========================================
const BrandLogo = ({
  brand,
  className,
}: {
  brand: string;
  className?: string;
}) => {
  switch (brand) {
    case "mastercard":
      return (
        <div className={cn("flex items-center -space-x-3", className)}>
          <div className="w-7 h-7 bg-[#EB001B] rounded-full mix-blend-multiply dark:mix-blend-normal z-10 opacity-90" />
          <div className="w-7 h-7 bg-[#F79E1B] rounded-full mix-blend-multiply dark:mix-blend-normal z-0 opacity-90" />
        </div>
      );
    case "visa":
      return (
        <span
          className={cn(
            "font-sans font-black italic text-[#1A1F71] dark:text-[#1434CB] tracking-tighter text-2xl scale-y-90",
            className,
          )}
        >
          VISA
        </span>
      );
    case "elo":
      return (
        <div
          className={cn(
            "flex font-sans font-black tracking-tighter text-3xl lowercase",
            className,
          )}
        >
          <span className="text-[#00A4E0]">e</span>
          <span className="text-[#EFB700]">l</span>
          <span className="text-[#231F20] dark:text-white">o</span>
        </div>
      );
    case "hipercard":
      return (
        <div
          className={cn(
            "bg-[#B90000] border-b-2 border-orange-500 text-white font-sans font-black italic text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-tighter",
            className,
          )}
        >
          HIPERCARD
        </div>
      );
    case "amex":
      return (
        <div
          className={cn(
            "bg-[#002663] text-white font-bold text-[10px] px-1.5 py-1 rounded-sm uppercase tracking-widest",
            className,
          )}
        >
          AMEX
        </div>
      );
    default:
      return (
        <CreditCardIcon
          className={cn("h-7 w-7 text-muted-foreground", className)}
        />
      );
  }
};

const BANDEIRAS_DISPONIVEIS = [
  { id: "mastercard", label: "Mastercard" },
  { id: "visa", label: "Visa" },
  { id: "elo", label: "Elo" },
  { id: "hipercard", label: "Hipercard" },
  { id: "amex", label: "Amex" },
  { id: "outra", label: "Outra" },
];

// Motor de Ciclo de Fatura
function getCicloFatura(
  ano: number,
  mes: number,
  diaFechamento: number,
  diaVencimento: number,
) {
  const fim = new Date(ano, mes, diaFechamento, 23, 59, 59);
  const inicio = new Date(ano, mes - 1, diaFechamento + 1, 0, 0, 0);

  const vencimento = new Date(ano, mes, diaVencimento);
  if (diaVencimento <= diaFechamento) {
    vencimento.setMonth(vencimento.getMonth() + 1);
  }

  return { inicio, fim, vencimento };
}

// Verifica o status da fatura com base na data de hoje
function getStatusFatura(inicio: Date, fim: Date) {
  const hoje = new Date();
  if (hoje > fim) return "Fechada";
  if (hoje >= inicio && hoje <= fim) return "Aberta";
  return "Futura";
}

export default function Cartoes() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [date, setDate] = useState<Date>(new Date());
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [fixas, setFixas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cartaoEditing, setCartaoEditing] = useState<any>(null);
  const [deleteConfig, setDeleteConfig] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  const [payFaturaConfig, setPayFaturaConfig] = useState<{
    isOpen: boolean;
    fatura: any | null;
  }>({ isOpen: false, fatura: null });
  const [isPaying, setIsPaying] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    limite: "",
    dia_fechamento: "",
    dia_vencimento: "",
    bandeira: "mastercard",
  });

  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const hasAutoJumped = useRef(false);

  useEffect(() => {
    if (cartoes.length > 0 && !hasAutoJumped.current) {
      const cartaoPrincipal = cartoes[0];
      const hoje = new Date();

      if (hoje.getDate() > cartaoPrincipal.dia_fechamento) {
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        setDate(proximoMes);
      }

      hasAutoJumped.current = true;
    }
  }, [cartoes]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: cartoesData } = await supabase
        .from("cartoes_credito")
        .select("*")
        .eq("user_id", userId)
        .order("nome");

      const { data: lancData } = await supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", userId)
        .not("cartao_id", "is", null);

      const { data: fixasData } = await supabase
        .from("despesas_fixas")
        .select("*")
        .eq("user_id", userId)
        .not("cartao_id", "is", null);

      setCartoes(cartoesData || []);
      setLancamentos(lancData || []);
      setFixas(fixasData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdd = () => {
    setCartaoEditing(null);
    setFormData({
      nome: "",
      limite: "",
      dia_fechamento: "",
      dia_vencimento: "",
      bandeira: "mastercard",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cartao: any) => {
    setCartaoEditing(cartao);
    setFormData({
      nome: cartao.nome,
      limite: cartao.limite?.toString() || "",
      dia_fechamento: cartao.dia_fechamento.toString(),
      dia_vencimento: cartao.dia_vencimento.toString(),
      bandeira: cartao.bandeira || "mastercard",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      user_id: userId,
      nome: formData.nome,
      limite: formData.limite ? Number(formData.limite) : null,
      dia_fechamento: Number(formData.dia_fechamento),
      dia_vencimento: Number(formData.dia_vencimento),
      bandeira: formData.bandeira,
    };

    try {
      if (cartaoEditing) {
        await supabase
          .from("cartoes_credito")
          .update(payload)
          .eq("id", cartaoEditing.id);
        toast({ title: "Cartão atualizado!" });
      } else {
        await supabase.from("cartoes_credito").insert([payload]);
        toast({ title: "Cartão criado!" });
      }
      setIsModalOpen(false);
      fetchData();
      window.dispatchEvent(new Event("zibee:cards-changed"));
    } catch (error: any) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfig.id) return;
    try {
      await supabase.from("cartoes_credito").delete().eq("id", deleteConfig.id);
      toast({ title: "Cartão removido." });
      setDeleteConfig({ isOpen: false, id: null });
      fetchData();
      window.dispatchEvent(new Event("zibee:cards-changed"));
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  // --- NOVA FUNÇÃO: ATUALIZAR BANDEIRA RÁPIDO ---
  const handleQuickBrandChange = async (cartaoId: number, newBrand: string) => {
    // Atualização otimista na tela
    setCartoes((prev) =>
      prev.map((c) => (c.id === cartaoId ? { ...c, bandeira: newBrand } : c)),
    );
    try {
      await supabase
        .from("cartoes_credito")
        .update({ bandeira: newBrand })
        .eq("id", cartaoId);
      toast({ title: "Bandeira atualizada!" });
      window.dispatchEvent(new Event("zibee:cards-changed"));
    } catch (error) {
      toast({ title: "Erro ao atualizar bandeira", variant: "destructive" });
      fetchData(); // Reverte em caso de erro
    }
  };

  const faturas = useMemo(() => {
    const ano = date.getFullYear();
    const mes = date.getMonth();

    return cartoes.map((cartao) => {
      const ciclo = getCicloFatura(
        ano,
        mes,
        cartao.dia_fechamento,
        cartao.dia_vencimento,
      );
      const statusFatura = getStatusFatura(ciclo.inicio, ciclo.fim);

      const despesasFatura = lancamentos.filter((l) => {
        if (l.cartao_id !== cartao.id) return false;
        const d = new Date(l.data_vencimento + "T00:00:00");
        return d >= ciclo.inicio && d <= ciclo.fim;
      });

      const sombrasFixas = fixas
        .filter((f) => f.cartao_id === cartao.id)
        .map((f) => {
          let mesDaSombra = mes + 1;
          let anoDaSombra = ano;

          if (f.dia_vencimento > cartao.dia_fechamento) {
            mesDaSombra = mes;
            if (mesDaSombra === 0) {
              mesDaSombra = 12;
              anoDaSombra = ano - 1;
            }
          }

          const ultimoDiaDoMes = new Date(
            anoDaSombra,
            mesDaSombra,
            0,
          ).getDate();
          const diaSeguro = Math.min(f.dia_vencimento, ultimoDiaDoMes);

          return {
            id: `shadow-${f.id}`,
            descricao: f.nome,
            valor: f.valor,
            data_vencimento: `${anoDaSombra}-${String(mesDaSombra).padStart(2, "0")}-${String(diaSeguro).padStart(2, "0")}`,
            isShadow: true,
            conta_fixa_id: f.id,
            categoria: f.categoria || "Sem categoria",
            user_id: userId,
            grupo_id: f.grupo_id,
            pago: false,
          };
        })
        .filter((s) => {
          const jaExisteReal = despesasFatura.some(
            (real) => real.conta_fixa_id === s.conta_fixa_id,
          );
          const d = new Date(s.data_vencimento + "T00:00:00");
          return !jaExisteReal && d >= ciclo.inicio && d <= ciclo.fim;
        });

      const todasDespesasMês = [...despesasFatura, ...sombrasFixas].sort(
        (a, b) =>
          new Date(a.data_vencimento + "T00:00:00").getTime() -
          new Date(b.data_vencimento + "T00:00:00").getTime(),
      );

      const totalFaturaMes = todasDespesasMês.reduce(
        (acc, curr) => acc + Number(curr.valor),
        0,
      );

      const utilizado =
        lancamentos
          .filter((l) => l.cartao_id === cartao.id && l.pago === false)
          .reduce((acc, curr) => acc + Number(curr.valor), 0) +
        sombrasFixas.reduce((acc, curr) => acc + Number(curr.valor), 0);

      const disponivel = cartao.limite
        ? Math.max(0, cartao.limite - utilizado)
        : 0;
      const porcentagemUso =
        cartao.limite > 0 ? (utilizado / cartao.limite) * 100 : 0;

      return {
        ...cartao,
        ciclo,
        statusFatura,
        despesas: todasDespesasMês,
        totalFaturaMes,
        utilizado,
        disponivel,
        porcentagemUso,
        bandeira: cartao.bandeira || "mastercard",
      };
    });
  }, [cartoes, lancamentos, fixas, date, userId]);

  const handlePayFatura = async () => {
    if (!payFaturaConfig.fatura || !userId) return;
    setIsPaying(true);

    try {
      const { fatura } = payFaturaConfig;
      const unpaidItems = fatura.despesas.filter((d: any) => !d.pago);

      const realIdsToUpdate = unpaidItems
        .filter((d: any) => !d.isShadow)
        .map((d: any) => d.id);
      const shadowsToInsert = unpaidItems
        .filter((d: any) => d.isShadow)
        .map((s: any) => ({
          user_id: userId,
          descricao: s.descricao,
          valor: s.valor,
          data_vencimento: s.data_vencimento,
          tipo: "Despesa",
          categoria: s.categoria,
          forma_pagamento: "Cartão de Crédito",
          conta_fixa_id: s.conta_fixa_id,
          cartao_id: fatura.id,
          grupo_id: activeContext === "grupo" ? s.grupo_id : null,
          pago: true,
        }));

      if (realIdsToUpdate.length > 0) {
        await supabase
          .from("lancamentos")
          .update({ pago: true })
          .in("id", realIdsToUpdate);
      }
      if (shadowsToInsert.length > 0) {
        await supabase.from("lancamentos").insert(shadowsToInsert);
      }

      toast({ title: "Fatura paga com sucesso!" });
      setPayFaturaConfig({ isOpen: false, fatura: null });
      fetchData();
      window.dispatchEvent(new Event("zibee:transaction-changed"));
    } catch (error) {
      toast({ title: "Erro ao pagar fatura", variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="w-full px-4 pt-6 pb-24 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCardIcon className="h-8 w-8 text-primary" /> Meus Cartões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle de faturas e limites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector date={date} setDate={setDate} />
          <Button onClick={handleOpenAdd} className="rounded-xl h-10 px-4">
            <PlusIcon className="h-5 w-5 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          Carregando faturas...
        </div>
      ) : cartoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-2xl bg-accent/20">
          <CreditCardIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">
            Nenhum cartão cadastrado.
          </p>
          <Button onClick={handleOpenAdd} className="rounded-xl mt-4">
            <PlusIcon className="h-4 w-4 mr-2" /> Cadastrar Cartão
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {faturas.map((fatura) => {
            const isExpanded = expandedCard === fatura.id;
            return (
              <div
                key={fatura.id}
                className="bg-card border border-border/50 rounded-4xl overflow-hidden shadow-sm transition-all"
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedCard(isExpanded ? null : fatura.id)}
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-6">
                    <div className="flex items-center gap-4">
                      {/* BOTÃO MÁGICO DE TROCAR BANDEIRA RÁPIDO */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()} // Impede o clique de abrir a fatura
                            className="h-14 w-16 bg-muted/30 border border-border/50 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all hover:scale-105 active:scale-95 shrink-0 group relative overflow-hidden"
                            title="Alterar Bandeira"
                          >
                            <BrandLogo brand={fatura.bandeira} />
                            {/* Overlay sutil de edição ao passar o mouse (desktop) */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <PencilIcon className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[280px] p-4 rounded-2xl"
                          align="start"
                          onClick={(e) => e.stopPropagation()} // Impede cliques dentro do popover de fechar a fatura
                        >
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center">
                            Alterar Bandeira
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {BANDEIRAS_DISPONIVEIS.map((bandeira) => (
                              <button
                                key={bandeira.id}
                                type="button"
                                onClick={() =>
                                  handleQuickBrandChange(fatura.id, bandeira.id)
                                }
                                className={cn(
                                  "flex flex-col items-center justify-center py-2 border rounded-xl transition-all hover:bg-muted/50 active:scale-95",
                                  fatura.bandeira === bandeira.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border",
                                )}
                              >
                                <div className="h-5 flex items-center justify-center">
                                  <BrandLogo brand={bandeira.id} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div>
                        <h3 className="font-bold text-xl flex items-center gap-2">
                          {fatura.nome}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider",
                              fatura.statusFatura === "Aberta"
                                ? "bg-green-500/15 text-green-600"
                                : fatura.statusFatura === "Fechada"
                                  ? "bg-red-500/15 text-red-600"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {fatura.statusFatura}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Vence dia {fatura.dia_vencimento}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 max-w-sm space-y-2 mt-2 sm:mt-0">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">
                          Utilizado:{" "}
                          <strong className="text-foreground">
                            {formatMoney(fatura.utilizado)}
                          </strong>
                        </span>
                        <span className="text-muted-foreground">
                          Disponível:{" "}
                          <strong className="text-green-600">
                            {formatMoney(fatura.disponivel)}
                          </strong>
                        </span>
                      </div>
                      <Progress
                        value={Math.min(fatura.porcentagemUso, 100)}
                        className="h-2"
                      />
                      {fatura.limite && (
                        <p className="text-[10px] text-muted-foreground text-right">
                          Limite Total: {formatMoney(fatura.limite)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-border/40 pt-4 sm:pt-0 sm:pl-6">
                      <div className="text-right flex-1 sm:flex-none">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                          Fatura do Mês
                        </p>
                        <p className="font-bold text-2xl tracking-tighter">
                          {formatMoney(fatura.totalFaturaMes)}
                        </p>
                      </div>
                      <ChevronDownIcon
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform shrink-0",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-muted/10 border-t border-border/40 p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          <InformationCircleIcon className="h-3 w-3" /> Itens
                          desta Fatura
                        </div>

                        {fatura.totalFaturaMes > 0 &&
                          fatura.despesas.some((d: any) => !d.pago) && (
                            <Button
                              size="sm"
                              className="h-7 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPayFaturaConfig({ isOpen: true, fatura });
                              }}
                            >
                              <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />{" "}
                              Pagar Fatura
                            </Button>
                          )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(fatura);
                          }}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfig({ isOpen: true, id: fatura.id });
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {fatura.despesas.length > 0 ? (
                        fatura.despesas.map((d: any) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  d.isShadow ? "bg-blue-400" : "bg-primary",
                                )}
                              />
                              <div>
                                <p className="text-sm font-semibold">
                                  {d.descricao}
                                </p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />{" "}
                                  {new Date(
                                    d.data_vencimento + "T00:00:00",
                                  ).toLocaleDateString("pt-BR")}
                                  {d.isShadow && (
                                    <span className="ml-2 text-blue-500 font-bold uppercase text-[9px]">
                                      Fixa
                                    </span>
                                  )}
                                  {d.total_parcelas && (
                                    <span className="ml-2 text-orange-500 font-bold tracking-tighter">
                                      ({d.parcela_atual}/{d.total_parcelas})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-sm">
                              {formatMoney(Number(d.valor))}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          Nenhum lançamento nesta fatura.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO COM SELETOR DE BANDEIRA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-4xl">
          <DialogHeader>
            <DialogTitle>
              {cartaoEditing ? "Editar Cartão" : "Novo Cartão"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 pt-4">
            {/* SELETOR DE BANDEIRA */}
            <div className="space-y-3">
              <Label>Bandeira do Cartão</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {BANDEIRAS_DISPONIVEIS.map((bandeira) => {
                  const isSelected = formData.bandeira === bandeira.id;
                  return (
                    <button
                      key={bandeira.id}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, bandeira: bandeira.id })
                      }
                      className={cn(
                        "flex flex-col items-center justify-center py-2 border rounded-xl transition-all active:scale-95",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <div className="h-6 flex items-center justify-center">
                        <BrandLogo brand={bandeira.id} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Cartão</Label>
              <Input
                required
                placeholder="Ex: Nubank, Itaú..."
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fechamento (Dia)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="Ex: 15"
                  value={formData.dia_fechamento}
                  onChange={(e) =>
                    setFormData({ ...formData, dia_fechamento: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento (Dia)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="Ex: 22"
                  value={formData.dia_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, dia_vencimento: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite Total</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.limite}
                  onChange={(e) =>
                    setFormData({ ...formData, limite: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-12 rounded-xl">
                {cartaoEditing ? "Salvar Alterações" : "Criar Cartão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfig.isOpen}
        onOpenChange={(open) =>
          setDeleteConfig({ ...deleteConfig, isOpen: open })
        }
      >
        <AlertDialogContent className="rounded-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ExclamationCircleIcon className="h-5 w-5 text-destructive" />{" "}
              Excluir Cartão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos perderão a conexão com a fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={payFaturaConfig.isOpen}
        onOpenChange={(open) =>
          !isPaying && setPayFaturaConfig({ isOpen: open, fatura: null })
        }
      >
        <DialogContent className="sm:max-w-md rounded-4xl">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Isso marcará todos os lançamentos desta fatura como pagos.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-border/50">
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">
              Valor Total
            </p>
            <p className="text-4xl font-bold text-foreground">
              {payFaturaConfig.fatura
                ? formatMoney(payFaturaConfig.fatura.totalFaturaMes)
                : "R$ 0,00"}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl h-11"
              onClick={() =>
                setPayFaturaConfig({ isOpen: false, fatura: null })
              }
              disabled={isPaying}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayFatura}
              className="rounded-xl h-11 bg-green-600 hover:bg-green-700 text-white"
              disabled={isPaying}
            >
              {isPaying ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
