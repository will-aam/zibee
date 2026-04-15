"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthSelector } from "./releases/MonthSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  PlusIcon,
  CreditCardIcon,
  CalendarIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// O Motor de Fatura: Calcula o ciclo com base no fechamento e data selecionada
function getCicloFatura(
  ano: number,
  mes: number,
  diaFechamento: number,
  diaVencimento: number,
) {
  // O ciclo de uma fatura vai do dia seguinte ao fechamento do mês anterior
  // até o dia do fechamento do mês atual.
  const dataFechamentoAtual = new Date(ano, mes, diaFechamento);
  const dataFechamentoAnterior = new Date(ano, mes - 1, diaFechamento);

  const inicio = new Date(dataFechamentoAnterior);
  inicio.setDate(inicio.getDate() + 1);

  const vencimento = new Date(ano, mes, diaVencimento);
  // Se o vencimento é antes do fechamento (ex: fecha dia 25, vence dia 05), o vencimento é no mês seguinte
  if (diaVencimento <= diaFechamento) {
    vencimento.setMonth(vencimento.getMonth() + 1);
  }

  return {
    inicio,
    fim: dataFechamentoAtual,
    vencimento,
  };
}

export default function Cartoes() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [date, setDate] = useState<Date>(new Date());
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Novo Cartão
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [novoCartao, setNovoCartao] = useState({
    nome: "",
    limite: "",
    dia_fechamento: "",
    dia_vencimento: "",
  });

  const [expandedCard, setExpandedCategory] = useState<number | null>(null);

  const fetchCartoes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Busca os cartões
      let queryCartoes = supabase.from("cartoes_credito").select("*");
      if (activeContext === "grupo") {
        // Lógica simplificada: pegamos os cartões atrelados a grupos onde sou membro
        // (Em produção, você filtra pelo ID do grupo ativo igual fez em lançamentos)
      } else {
        queryCartoes = queryCartoes.eq("user_id", userId).is("grupo_id", null);
      }
      const { data: cartoesData } = await queryCartoes.order("nome");

      // 2. Busca TODOS os lançamentos atrelados a algum cartão (para o motor poder filtrar depois)
      let queryLanc = supabase
        .from("lancamentos")
        .select("*")
        .not("cartao_id", "is", null);
      if (activeContext !== "grupo") {
        queryLanc = queryLanc.eq("user_id", userId).is("grupo_id", null);
      }
      const { data: lancData } = await queryLanc;

      setCartoes(cartoesData || []);
      setLancamentos(lancData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId, activeContext]);

  useEffect(() => {
    fetchCartoes();
  }, [fetchCartoes]);

  const handleSalvarCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        user_id: userId,
        grupo_id: null, // Ajuste se for salvar para o grupo
        nome: novoCartao.nome,
        limite: novoCartao.limite ? Number(novoCartao.limite) : null,
        dia_fechamento: Number(novoCartao.dia_fechamento),
        dia_vencimento: Number(novoCartao.dia_vencimento),
      };

      const { error } = await supabase
        .from("cartoes_credito")
        .insert([payload]);
      if (error) throw error;

      toast({ title: "Cartão adicionado com sucesso!" });
      setIsAddModalOpen(false);
      setNovoCartao({
        nome: "",
        limite: "",
        dia_fechamento: "",
        dia_vencimento: "",
      });
      fetchCartoes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Processa as faturas baseadas no mês selecionado
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

      const despesas = lancamentos.filter((l) => {
        if (l.cartao_id !== cartao.id) return false;
        // Normaliza a data da compra
        const dataCompra = new Date(l.data_vencimento + "T12:00:00");
        return dataCompra >= ciclo.inicio && dataCompra <= ciclo.fim;
      });

      const total = despesas.reduce((acc, curr) => acc + Number(curr.valor), 0);

      return {
        ...cartao,
        ciclo,
        despesas: despesas.sort(
          (a, b) =>
            new Date(a.data_vencimento).getTime() -
            new Date(b.data_vencimento).getTime(),
        ),
        total,
      };
    });
  }, [cartoes, lancamentos, date]);

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="w-full px-4 pt-6 pb-24 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCardIcon className="h-8 w-8 text-primary" /> Meus Cartões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie suas faturas e veja suas parcelas futuras.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MonthSelector date={date} setDate={setDate} />
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl h-10 px-4"
          >
            <PlusIcon className="h-5 w-5 mr-1" /> Novo Cartão
          </Button>
        </div>
      </div>

      {/* LISTA DE FATURAS (MOTOR EM AÇÃO) */}
      <div className="space-y-4">
        {faturas.length === 0 && !loading && (
          <div className="text-center py-12 border border-dashed rounded-2xl bg-accent/20 text-muted-foreground">
            Você ainda não tem nenhum cartão cadastrado.
          </div>
        )}

        {faturas.map((fatura) => {
          const isExpanded = expandedCard === fatura.id;

          return (
            <div
              key={fatura.id}
              className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm hover:shadow transition-all"
            >
              {/* RESUMO DO CARTÃO */}
              <div
                className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : fatura.id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <CreditCardIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{fatura.nome}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>
                        Vence:{" "}
                        {fatura.ciclo.vencimento.toLocaleDateString("pt-BR")}
                      </span>
                      <span>•</span>
                      <span>Fecha: dia {fatura.dia_fechamento}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-16 sm:pl-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
                      Total da Fatura
                    </p>
                    <p className="font-bold text-xl">
                      {formatMoney(fatura.total)}
                    </p>
                  </div>
                  <ChevronDownIcon
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-300",
                      isExpanded && "rotate-180",
                    )}
                  />
                </div>
              </div>

              {/* DETALHES DA FATURA (DESPESAS) */}
              {isExpanded && (
                <div className="bg-muted/10 border-t border-border/50 p-5 animate-in slide-in-from-top-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                    Compras neste ciclo (
                    {fatura.ciclo.inicio.toLocaleDateString("pt-BR")} -{" "}
                    {fatura.ciclo.fim.toLocaleDateString("pt-BR")})
                  </p>

                  {fatura.despesas.length > 0 ? (
                    <div className="space-y-3">
                      {fatura.despesas.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                        >
                          <div>
                            <p className="font-semibold text-sm">
                              {d.descricao}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <CalendarIcon className="h-3 w-3" />{" "}
                              {new Date(
                                d.data_vencimento + "T12:00:00",
                              ).toLocaleDateString("pt-BR")}
                              {d.total_parcelas && (
                                <span className="ml-2 bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-sm font-bold">
                                  Parcela {d.parcela_atual}/{d.total_parcelas}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="font-semibold">
                            {formatMoney(Number(d.valor))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma compra caiu nesta fatura.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE ADICIONAR CARTÃO */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cartão</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarCartao} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome do Cartão (Ex: Nubank, Itaú)</Label>
              <Input
                required
                value={novoCartao.nome}
                onChange={(e) =>
                  setNovoCartao({ ...novoCartao, nome: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia do Fechamento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={novoCartao.dia_fechamento}
                  onChange={(e) =>
                    setNovoCartao({
                      ...novoCartao,
                      dia_fechamento: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dia do Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={novoCartao.dia_vencimento}
                  onChange={(e) =>
                    setNovoCartao({
                      ...novoCartao,
                      dia_vencimento: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite Total (Opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={novoCartao.limite}
                onChange={(e) =>
                  setNovoCartao({ ...novoCartao, limite: e.target.value })
                }
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl mt-4">
              Salvar Cartão
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
