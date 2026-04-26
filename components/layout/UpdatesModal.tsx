"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SparklesIcon, BellIcon, InboxIcon } from "@heroicons/react/24/solid";
import { appUpdates } from "@/lib/changelog";
import { Button } from "@/components/ui/button";

interface UpdatesModalProps {
  onNavigate?: (tab: string) => void;
}

export function UpdatesModal({ onNavigate }: UpdatesModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setActiveTab("notifications"); // Padrão ao clicar no sino
    };

    window.addEventListener("zibee:open-updates", handleOpen);

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);

      if (searchParams.get("novidades") === "true") {
        setIsOpen(true);
        setActiveTab("updates"); // Se vier do Push, foca direto em Atualizações

        if (appUpdates.length > 0) {
          localStorage.setItem("zibee_last_seen_update", appUpdates[0].id);
        }

        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    return () => {
      window.removeEventListener("zibee:open-updates", handleOpen);
    };
  }, []);

  const handleExplore = (updateId: string) => {
    setIsOpen(false);
    // Redireciona de forma inteligente baseado na novidade clicada
    if (updateId.includes("configuracoes")) {
      onNavigate?.("configuracoes"); // Ajuste para o nome da sua aba de settings se for diferente
    } else {
      onNavigate?.("cartoes");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[450px] p-0 flex flex-col h-full gap-0 border-l border-border/50 bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="p-6 pb-2 text-left">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            Centro de Notificações
          </SheetTitle>
          <SheetDescription>
            Gerencie seus alertas e confira as novidades do sistema.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col mt-4 min-h-0"
        >
          <div className="px-6 shrink-0">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
              <TabsTrigger value="notifications" className="rounded-xl gap-2">
                <BellIcon className="h-4 w-4" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="updates" className="rounded-xl gap-2">
                <SparklesIcon className="h-4 w-4" />
                Atualizações
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ABA 1: NOTIFICAÇÕES PESSOAIS */}
          <TabsContent
            value="notifications"
            className="flex-1 overflow-y-auto p-6 mt-0 scrollbar-width-none [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="bg-muted/50 p-6 rounded-full">
                <InboxIcon className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Tudo limpo por aqui!
                </p>
                <p className="text-sm text-muted-foreground px-8">
                  Você não tem novas notificações pessoais no momento.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: ATUALIZAÇÕES DO SISTEMA (CHANGELOG) */}
          <TabsContent
            value="updates"
            className="flex-1 overflow-y-auto p-6 mt-0 scrollbar-width-none [&::-webkit-scrollbar]:hidden"
          >
            {/* Removido o defaultValue para que venha tudo recolhido por padrão */}
            <Accordion type="single" collapsible className="w-full space-y-4">
              {appUpdates.map((update, index) => (
                <AccordionItem
                  key={update.id}
                  value={update.id}
                  className={`border border-border/50 rounded-2xl px-4 py-1 transition-all ${index === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/20"}`}
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex flex-col items-start text-left gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        {update.date}
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {update.title}
                      </span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-6 pt-2 space-y-4">
                    <p className="text-sm text-foreground/80 font-medium">
                      {update.shortDescription}
                    </p>

                    <div className="space-y-2 border-l-2 border-primary/20 pl-4">
                      {update.fullDescription.map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm text-muted-foreground leading-relaxed"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Botão interativo que sabe para onde mandar 
                    <Button
                      variant="outline"
                      className="w-full mt-2 rounded-xl border-primary/30 hover:bg-primary/5 text-primary font-bold"
                      onClick={() => handleExplore(update.id)}
                    >
                      Explorar novidade
                    </Button> */}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
