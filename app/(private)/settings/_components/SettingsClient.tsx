"use client";

import Profile from "./Profile";

interface SettingsProps {
  onNavigate?: (tab: string) => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 pb-24">
      {/* CABEÇALHO */}
      <div className="px-5 pt-6 pb-4 border-b border-border/50">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <div className="mt-4 focus-visible:outline-none">
        <Profile />
      </div>
    </div>
  );
}
