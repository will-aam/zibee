"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstallButton } from "@/components/ui/install-button";

import Profile from "./Profile";
import Preferences from "./Preferences";
import System from "./System";

interface SettingsProps {
  onNavigate?: (tab: string) => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 pb-24">
      {/* CABEÇALHO - Removido as margens gerais para usar padings específicos */}
      <div className="px-5 pt-6 pb-4 flex justify-between items-center border-b border-border/50">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <InstallButton />
      </div>

      <Tabs defaultValue="profile" className="w-full">
        {/* TABS LIST - Fica com padding lateral apenas para não colar nos cantos, mas o conteúdo das abas será chapado */}
        <div className="px-5 pt-4">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/40 rounded-xl p-1">
            <TabsTrigger
              value="profile"
              className="rounded-lg text-xs sm:text-sm font-medium"
            >
              Conta
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="rounded-lg text-xs sm:text-sm font-medium"
            >
              Notificações
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="rounded-lg text-xs sm:text-sm font-medium"
            >
              Sistema
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Removemos as margens (mt-4) e deixamos o conteúdo de cada Tab cuidar do seu preenchimento chapado */}
        <TabsContent
          value="profile"
          className="mt-4 focus-visible:outline-none"
        >
          <Profile />
        </TabsContent>

        <TabsContent
          value="preferences"
          className="mt-4 focus-visible:outline-none"
        >
          <Preferences />
        </TabsContent>

        <TabsContent value="system" className="mt-4 focus-visible:outline-none">
          <System />
        </TabsContent>
      </Tabs>
    </div>
  );
}
