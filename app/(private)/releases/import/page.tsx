"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiNubank } from "react-icons/si";
import { parseOFX, OFXTransaction } from "@/lib/ofxParser";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const { activeContext } = useWorkspace();

  const [categorias, setCategorias] = useState<{ id: number; nome: string }[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<{ id: number; nome: string }[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [userHistory, setUserHistory] = useState<string[]>([]);

  const categoriasUnicas = Array.from(
    new Set(categorias.map((c) => c.nome.trim()))
  ).sort();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [transactions, setTransactions] = useState<OFXTransaction[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Forma de pagamento padrão global para o lote
  const [globalPaymentMethodId, setGlobalPaymentMethodId] = useState<string>("");

  useEffect(() => {
    if (!userId) return;

    async function loadData() {
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
      }

      // Load Categories
      let queryCat = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", userId)
        .order("nome");
      
      const { data: catData, error: catError } = await queryCat;
      if (catError) console.error("Erro ao carregar categorias:", catError);
      if (catData) setCategorias(catData);

      // Load Payment Methods
      const { data: payData } = await supabase.from("formas_pagamento").select("*").order("nome");
      if (payData) {
        setFormasPagamento(payData);
        const cc = payData.find(p => p.nome.toLowerCase().includes("conta corrente"));
        if (cc) setGlobalPaymentMethodId(cc.id.toString());
        else if (payData.length > 0) setGlobalPaymentMethodId(payData[0].id.toString());
      }

      // Load Recent History for AI
      let historyQuery = supabase.from("lancamentos").select("descricao, categoria").order("created_at", { ascending: false }).limit(100);
      if (groupId) {
        historyQuery = historyQuery.eq("grupo_id", groupId);
      } else {
        historyQuery = historyQuery.eq("user_id", userId);
      }
      const { data: historyData } = await historyQuery;
      if (historyData) {
        setUserHistory(historyData.map(h => `"${h.descricao}" -> ${h.categoria}`));
      }
    }

    loadData();
  }, [userId, activeContext, currentGroupId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const text = await file.text();
      const parsed = parseOFX(text);
      
      if (parsed.length === 0) {
        toast({ title: "Nenhuma transação encontrada no arquivo", variant: "destructive" });
      } else {
        // Apply default payment method to all
        const withPayment = parsed.map(t => ({ ...t, paymentMethodId: globalPaymentMethodId }));
        setTransactions(withPayment);
      }
    } catch (error) {
      toast({ title: "Erro ao ler arquivo OFX", variant: "destructive" });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCategoryChange = (id: string, categoryId: string) => {
    setTransactions(prev => prev ? prev.map(t => t.id === id ? { ...t, categoryId } : t) : null);
  };

  const handleGlobalPaymentMethodChange = (methodId: string) => {
    setGlobalPaymentMethodId(methodId);
    setTransactions(prev => prev ? prev.map(t => ({ ...t, paymentMethodId: methodId })) : null);
  };

  const handleRemoveTransaction = (id: string) => {
    setTransactions(prev => prev ? prev.filter(t => t.id !== id) : null);
  };

  const [aiProgress, setAiProgress] = useState("");

  const handleAICategorize = async () => {
    if (!transactions || transactions.length === 0 || categorias.length === 0) return;
    setIsCategorizing(true);
    setAiProgress("Iniciando...");
    
    try {
      const batchSize = 30;
      const batches = [];
      for (let i = 0; i < transactions.length; i += batchSize) {
        batches.push(transactions.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        setAiProgress(`Analisando lote ${i + 1} de ${batches.length}...`);
        const batch = batches[i];
        
        const response = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions: batch.map(t => ({ id: t.id, description: t.description, amount: t.amount, type: t.type })),
            categories: categoriasUnicas.map((nome: string) => ({ id: nome, nome })),
            history: userHistory
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Erro ao categorizar com IA");
        }
        
        if (data.results) {
          setTransactions(prev => {
            if (!prev) return prev;
            const map = new Map<string, string>(data.results.map((r: any) => [r.transactionId, r.categoryId]));
            return prev.map(t => ({
              ...t,
              categoryId: map.has(t.id) ? (map.get(t.id) as string) : t.categoryId
            }));
          });
        }
      }
      
      toast({ title: "Categorização Inteligente concluída!", description: "A IA sugeriu as categorias. Por favor, revise antes de salvar." });
    } catch (error: any) {
      toast({ title: "Erro na IA", description: error.message, variant: "destructive" });
    } finally {
      setIsCategorizing(false);
      setAiProgress("");
    }
  };

  const handleSave = async () => {
    if (!transactions || !userId) return;

    const missingCategory = transactions.some(t => !t.categoryId);
    if (missingCategory) {
      toast({ title: "Atenção", description: "Selecione a categoria para todas as transações antes de salvar.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payloads = transactions.map(t => ({
        user_id: userId,
        grupo_id: activeContext === "grupo" ? currentGroupId : null,
        descricao: t.description.substring(0, 255),
        categoria: t.categoryId || "Sem Categoria",
        tipo: t.type,
        valor: t.amount,
        forma_pagamento: formasPagamento.find(p => p.id.toString() === (t.paymentMethodId || globalPaymentMethodId))?.nome || "Conta Corrente",
        data_vencimento: t.date,
        pago: true, // Importações são extratos consolidados, portanto já pagas
      }));

      const { error } = await supabase.from("lancamentos").insert(payloads);
      
      if (error) throw error;

      toast({ title: "Lançamentos importados com sucesso!" });
      
      window.dispatchEvent(new Event("zibee:transaction-changed"));
      
      router.push("/releases");
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" className="mr-2" onClick={() => transactions ? setTransactions(null) : router.push("/releases")}>
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Importar Dados</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4 pb-28">
        {categoriasUnicas.length === 0 ? (
          <div className="bg-card p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center mt-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <SparklesIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quase lá!</h3>
            <p className="text-muted-foreground max-w-md">
              Você ainda não tem categorias cadastradas. Para que a Inteligência Artificial e a importação funcionem corretamente, volte na página de Lançamentos e crie algumas categorias (ex: Alimentação, Transporte, Lazer).
            </p>
            <Button
              className="mt-6 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => router.push("/releases")}
            >
              Criar Categorias Agora
            </Button>
          </div>
        ) : !transactions ? (
          <>
            <p className="text-muted-foreground text-sm">
              Selecione o banco para importar seus lançamentos via arquivo OFX.
            </p>

            <input 
              type="file" 
              accept=".ofx" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />

            <Button 
               className="w-full h-16 justify-start text-lg bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-medium rounded-xl relative overflow-hidden group"
               onClick={() => fileInputRef.current?.click()}
               disabled={isParsing}
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-4 shrink-0 overflow-hidden">
                {isParsing ? (
                  <ArrowPathIcon className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <SiNubank className="w-5 h-5" />
                )}
              </div>
              Nubank
            </Button>
            
            <Button 
               className="w-full h-16 justify-start text-lg bg-[#FF7A00] hover:bg-[#FF7A00]/90 text-white font-medium rounded-xl relative overflow-hidden group"
               onClick={() => fileInputRef.current?.click()}
               disabled={isParsing}
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 overflow-hidden">
                {isParsing ? (
                  <ArrowPathIcon className="h-5 w-5 text-[#FF7A00] animate-spin" />
                ) : (
                  <Image src="/inter-logo.png" alt="Banco Inter" width={28} height={28} className="object-contain" />
                )}
              </div>
              Banco Inter
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-muted/30 p-4 rounded-xl border flex flex-col gap-3">
              <h2 className="font-semibold text-lg">Revisar Importação</h2>
              <p className="text-sm text-muted-foreground">Encontramos <span className="font-bold text-foreground">{transactions.length} transações</span> no seu extrato. Por favor, classifique cada uma antes de salvar.</p>
              
              <div className="mt-2">
                <label className="text-xs font-semibold mb-1 block">Forma de Pagamento Padrão</label>
                <Select value={globalPaymentMethodId} onValueChange={handleGlobalPaymentMethodChange}>
                  <SelectTrigger className="bg-background rounded-lg border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 pt-2 border-t flex flex-col gap-2">
                <Button 
                   variant="outline" 
                   className="w-full h-11 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium"
                   onClick={handleAICategorize}
                   disabled={isCategorizing || categorias.length === 0}
                >
                  {isCategorizing ? (
                     <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                     <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
                  )}
                  {isCategorizing ? (aiProgress || "Analisando transações...") : "Autocategorizar com IA"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">A inteligência artificial analisará os nomes e tentará preencher as categorias para você.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {transactions.map((t) => (
                <div key={t.id} className="p-3 border rounded-xl flex flex-col gap-3 bg-card shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="flex flex-col pr-2">
                        <span className="text-xs text-muted-foreground font-medium">{new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                        <span className="font-medium text-sm leading-tight mt-1">{t.description}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className={`font-bold whitespace-nowrap text-sm ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'Receita' ? '+' : '-'}{formatCurrency(t.amount)}
                       </span>
                       <button
                         onClick={() => handleRemoveTransaction(t.id)}
                         className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                         title="Ignorar esta transação"
                       >
                         <TrashIcon className="w-4 h-4" />
                       </button>
                     </div>
                   </div>

                   <div className="flex flex-col gap-1 mt-1">
                      <label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Categoria <span className="text-red-500">*</span></label>
                      <Select value={t.categoryId || ""} onValueChange={(val) => handleCategoryChange(t.id, val)}>
                        <SelectTrigger className={`h-10 rounded-lg ${!t.categoryId ? 'border-red-300 ring-red-100 focus:ring-red-300 bg-red-50/30' : 'bg-muted/20'}`}>
                          <SelectValue placeholder="Selecionar Categoria..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasUnicas.map((nome: string) => (
                            <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-10 flex flex-col items-center">
               <div className="w-full max-w-2xl">
                 <Button 
                    className="w-full h-12 text-base font-bold rounded-xl shadow-lg" 
                    onClick={handleSave}
                    disabled={isSaving}
                 >
                    {isSaving ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> : null}
                    {isSaving ? 'Salvando...' : 'Salvar Lançamentos'}
                 </Button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
