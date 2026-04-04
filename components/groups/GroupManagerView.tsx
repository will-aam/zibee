"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Importando os Modais (Dialogs) do seu projeto
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Importando o Alert Dialog (para ações destrutivas como a lixeira)
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
  UserPlusIcon,
  TrashIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { UserGroupIcon } from "@heroicons/react/24/outline";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Membro";
  seed: string;
};

export default function GroupManagerView() {
  const { toast } = useToast();

  // ESTADOS DO GRUPO
  const [groupName, setGroupName] = useState("Casa do Henrique");
  const [splitRule, setSplitRule] = useState<"igual" | "proporcional">("igual");

  const [members, setMembers] = useState<Member[]>([
    {
      id: "1",
      name: "Henrique ",
      email: "henrique@teste.com",
      role: "Admin",
      seed: "Henrique",
    },
    {
      id: "2",
      name: "Esposa",
      email: "esposa@teste.com",
      role: "Membro",
      seed: "Esposa",
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState("");

  // ESTADOS DOS MODAIS (DIALOGS COMUNS)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [tempGroupName, setTempGroupName] = useState(groupName);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  // ESTADOS DO MODAL DE LIXEIRA (ALERT DIALOG)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // ================= AÇÕES ================= //

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Digite um e-mail válido para convidar.",
        variant: "destructive",
      });
      return;
    }

    const newMember: Member = {
      id: Math.random().toString(),
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: "Membro",
      seed: inviteEmail,
    };

    setMembers([...members, newMember]);
    setInviteEmail("");
    toast({
      title: "Convite Enviado!",
      description: `Convite enviado para ${inviteEmail}.`,
    });
  };

  // Prepara a exclusão e abre o Alert Dialog
  const confirmRemoveMember = (id: string) => {
    setMemberToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Executa a exclusão de fato (quando clica em "Sim, Remover")
  const executeRemoveMember = () => {
    if (memberToDelete) {
      setMembers(members.filter((m) => m.id !== memberToDelete));
      toast({
        title: "Membro removido",
        description: "O usuário foi removido da casa.",
      });
    }
    setIsDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const saveGroupName = () => {
    if (tempGroupName.trim() === "") return;
    setGroupName(tempGroupName);
    setIsEditDialogOpen(false);
    toast({
      title: "Grupo atualizado",
      description: "O nome da sua casa foi alterado com sucesso.",
    });
  };

  // ================= RENDERIZAÇÃO ================= //
  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-500 space-y-8">
      {/* CABEÇALHO DO GRUPO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/10 p-6 md:p-8 rounded-3xl border border-primary/20 relative overflow-hidden">
        <div className="relative z-10">
          <Badge
            variant="outline"
            className="bg-background/50 backdrop-blur-sm mb-3 border-primary/30 text-primary"
          >
            Grupo Ativo
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <UserGroupIcon className="w-8 h-8 text-primary" />
            {groupName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os membros e as configurações da casa.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setTempGroupName(groupName);
            setIsEditDialogOpen(true);
          }}
          className="relative z-10 rounded-2xl h-11 border-primary/30 hover:bg-primary/20 transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5 mr-2" /> Editar Grupo
        </Button>
      </div>

      {/* ADICIONAR MEMBRO (CONVITE) */}
      <div className="bg-background p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <UserPlusIcon className="w-6 h-6 text-primary" />
          Convidar Membro
        </h3>
        <p className="text-sm text-muted-foreground">
          Envie um convite para adicionar alguém a esta casa. Eles não precisam
          pagar nada para aceitar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Input
            placeholder="E-mail do convidado..."
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="h-12 rounded-2xl bg-muted/50 border-transparent focus-visible:border-primary"
          />
          <Button
            onClick={handleInvite}
            className="h-12 rounded-2xl px-8 font-semibold w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Enviar Convite
          </Button>
        </div>
      </div>

      {/* LISTA DE MEMBROS */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold px-2">
          Membros do Grupo ({members.length})
        </h3>

        {members.length === 0 ? (
          <div className="text-center p-8 bg-muted/30 rounded-3xl border border-dashed border-border">
            <p className="text-muted-foreground">
              Ninguém aqui ainda. Convide alguém acima!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0">
                    <img
                      src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${member.seed}`}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground flex items-center gap-2 truncate">
                      {member.name}
                      {member.role === "Admin" && (
                        <CheckCircleIcon
                          className="w-4 h-4 text-primary shrink-0"
                          title="Criador do Grupo"
                        />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                </div>

                {member.role !== "Admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmRemoveMember(member.id)}
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl shrink-0"
                    title="Remover Membro"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REGRA DE DIVISÃO */}
      <div className="bg-muted/30 p-6 md:p-8 rounded-3xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-foreground text-lg">
            Modo de Acerto Mensal
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Atualmente as contas estão configuradas para divisão:
            <strong className="text-primary ml-1 uppercase">
              {splitRule === "igual" ? "Igualitária (50/50)" : "Proporcional"}
            </strong>
            .
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsRuleDialogOpen(true)}
          className="rounded-2xl h-11 px-6 font-semibold w-full md:w-auto shrink-0 border border-border/50 hover:bg-muted"
        >
          Mudar Regra
        </Button>
      </div>

      {/* ================= MODAIS (DIALOGS COMUNS) ================= */}

      {/* 1. Modal de Editar Nome do Grupo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Editar Grupo</DialogTitle>
            <DialogDescription>
              Escolha um nome fácil de identificar para a sua casa ou república.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label htmlFor="name">Nome do Grupo</Label>
            <Input
              id="name"
              value={tempGroupName}
              onChange={(e) => setTempGroupName(e.target.value)}
              className="h-12 rounded-2xl"
              placeholder="Ex: Apartamento 402"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button onClick={saveGroupName} className="rounded-xl">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Modal de Regra de Divisão */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="rounded-3xl sm:rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Regra de Divisão</DialogTitle>
            <DialogDescription>
              Como vocês preferem dividir as contas da casa no fim do mês?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div
              onClick={() => setSplitRule("igual")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${splitRule === "igual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <h4 className="font-bold flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${splitRule === "igual" ? "border-primary" : "border-muted-foreground"}`}
                >
                  {splitRule === "igual" && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                Igualitária (Padrão)
              </h4>
              <p className="text-sm text-muted-foreground mt-2 ml-6">
                Todas as despesas são somadas e divididas igualmente pelo número
                de membros. (Ex: 2 pessoas = 50% pra cada).
              </p>
            </div>

            <div
              onClick={() => setSplitRule("proporcional")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${splitRule === "proporcional" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <h4 className="font-bold flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${splitRule === "proporcional" ? "border-primary" : "border-muted-foreground"}`}
                >
                  {splitRule === "proporcional" && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                Proporcional / Personalizada
              </h4>
              <p className="text-sm text-muted-foreground mt-2 ml-6">
                Você define a porcentagem que cada um paga, ideal para quem tem
                rendas diferentes. (Ex: 60% / 40%).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsRuleDialogOpen(false)}
              className="rounded-xl w-full"
            >
              Confirmar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DE EXCLUSÃO (ALERT DIALOG) ================= */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-3xl sm:rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Remover Membro
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro da casa? Ele perderá o
              acesso imediatamente e não poderá mais lançar despesas. Essa ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border-border/50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRemoveMember}
              className="rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-sm"
            >
              Sim, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
