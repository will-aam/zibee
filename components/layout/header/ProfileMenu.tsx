"use client";

import * as React from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { handleWhatsAppContact } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserIcon,
  UserGroupIcon,
  LockClosedIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  HeartIcon,
  ShareIcon,
} from "@heroicons/react/24/solid";

interface ProfileMenuProps {
  userName: string;
  avatarUrl: string;
  isLoggingOut: boolean;
  onLogout: () => void;
  onOpenAvatarModal: () => void;
  pendingInvite: { id: string; grupo_nome: string } | null;
}

export function ProfileMenu({
  userName,
  avatarUrl,
  isLoggingOut,
  onLogout,
  onOpenAvatarModal,
  pendingInvite,
}: ProfileMenuProps) {
  const { activeContext, setActiveContext, hasPremiumAccess } = useWorkspace();
  const { toast } = useToast();

  // LÓGICA DE COMPARTILHAMENTO
  const handleShareApp = async () => {
    const shareText =
      "Estou usando o Zibee para organizar minhas finanças e recomendo muito! Dá uma olhada: https://zibee.vercel.app/";
    const shareData = {
      title: "Zibee - Gestão Financeira",
      text: "Estou usando o Zibee para organizar minhas finanças e recomendo muito! Dá uma olhada:",
      url: "https://zibee.vercel.app/",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copiado para a área de transferência! 📋",
          description: "Agora é só colar e enviar para seus amigos.",
        });
      }
    } catch (err) {
      console.log("Erro ao compartilhar:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* SEÇÃO 1: ESPAÇO DE TRABALHO */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Seu Espaço
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => setActiveContext("pessoal")}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              activeContext === "pessoal"
                ? "bg-primary/10 border-primary text-primary"
                : "hover:bg-muted border-transparent text-muted-foreground"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">Meu Pessoal</span>
          </button>

          {/*
          {pendingInvite ? (
            <button
              onClick={onOpenAvatarModal}
              className="flex items-center justify-between p-3 rounded-xl border transition-all bg-amber-50 border-amber-200 text-amber-700"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="font-semibold text-sm">Convite Pendente</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => {
                if (hasPremiumAccess) setActiveContext("grupo");
                else handleWhatsAppContact();
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                activeContext === "grupo"
                  ? "bg-primary/10 border-primary text-primary"
                  : "hover:bg-muted border-transparent text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {hasPremiumAccess ? (
                  <UserGroupIcon className="w-5 h-5" />
                ) : (
                  <LockClosedIcon className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-semibold text-sm">Grupo</span>
              </div>
              {!hasPremiumAccess && (
                <Badge className="bg-amber-500 text-[10px] h-4 px-1.5">
                  PRO
                </Badge>
              )}
            </button>
          )}
          */}
        </div>
      </div>

      {/* SEÇÃO 2: AÇÕES DA CONTA E COMPARTILHAR */}
      <div className="pt-4 border-t border-border/50 flex flex-col gap-2">
        {/* BOTÃO COMPARTILHAR MINIMALISTA */}
        <Button
          variant="outline"
          className="w-full justify-start rounded-xl gap-3 h-12 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
          onClick={handleShareApp}
        >
          <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
            <HeartIcon className="absolute w-5 h-5 animate-ping opacity-75 duration-1000" />
            <HeartIcon className="relative w-5 h-5" />
          </div>
          <span className="text-sm font-bold flex-1 text-left">
            Compartilhar Zibee
          </span>
          <ShareIcon className="w-4 h-4 opacity-70" />
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start rounded-xl gap-3 h-12 border-border/60 mt-2"
          onClick={onOpenAvatarModal}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
            <img
              src={avatarUrl}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-medium text-foreground">
            Mudar Foto
          </span>
        </Button>
      </div>
    </div>
  );
}
