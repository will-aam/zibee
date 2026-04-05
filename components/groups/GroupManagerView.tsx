"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  UserPlusIcon,
  TrashIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { UserGroupIcon, HomeIcon } from "@heroicons/react/24/outline";

type Member = {
  dbId: string | null;
  name: string;
  email: string;
  role: "Admin" | "Membro";
  status: "Aceito" | "Pendente";
  seed: string;
};

export default function GroupManagerView() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;
  const userEmail = session.data?.user?.email || "usuario@zibee.com";
  const userName = session.data?.user?.name || "Você";

  const [isLoading, setIsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [splitRule, setSplitRule] = useState<"igual" | "proporcional">("igual");
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // NOVO ESTADO: Modal de Excluir a Casa Inteira
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);

  const loadGroupData = React.useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      let { data: myGroup } = await supabase
        .from("grupos")
        .select("*")
        .eq("criador_id", userId)
        .maybeSingle();
      let admin = true;

      if (!myGroup) {
        const { data: membership } = await supabase
          .from("membros_grupo")
          .select("grupo_id")
          .eq("user_id", userId)
          .eq("status", "Aceito")
          .maybeSingle();
        if (membership) {
          const { data: memberGroup } = await supabase
            .from("grupos")
            .select("*")
            .eq("id", membership.grupo_id)
            .maybeSingle();
          myGroup = memberGroup;
          admin = false;
        }
      }

      if (myGroup) {
        setGroupId(myGroup.id);
        setGroupName(myGroup.nome);
        setSplitRule(myGroup.regra_divisao);
        setIsUserAdmin(admin);

        const { data: membersData } = await supabase
          .from("membros_grupo")
          .select("*")
          .eq("grupo_id", myGroup.id);

        const acceptedUserIds =
          membersData
            ?.filter((m) => m.status === "Aceito" && m.user_id)
            .map((m) => m.user_id) || [];
        const allIdsToFetch = [myGroup.criador_id, ...acceptedUserIds];

        const { data: avatarsData } = await supabase
          .from("user_profile_settings_ba")
          .select("user_id, avatar_seed")
          .in("user_id", allIdsToFetch);

        const avatarMap = new Map();
        if (avatarsData) {
          avatarsData.forEach((a) => avatarMap.set(a.user_id, a.avatar_seed));
        }

        const formattedMembers: Member[] = [];

        formattedMembers.push({
          dbId: null,
          name: admin ? `${userName} (Você)` : "Criador do Grupo",
          email: admin ? userEmail : "Admin",
          role: "Admin",
          status: "Aceito",
          seed: avatarMap.get(myGroup.criador_id) || "Criador",
        });

        if (membersData) {
          membersData.forEach((m) => {
            let memberSeed = m.email_convite;
            if (m.status === "Aceito" && m.user_id) {
              memberSeed = avatarMap.get(m.user_id) || m.email_convite;
            }

            formattedMembers.push({
              dbId: m.id,
              name: m.email_convite.split("@")[0],
              email: m.email_convite,
              role: m.role as "Admin" | "Membro",
              status: m.status as "Aceito" | "Pendente",
              seed: memberSeed,
            });
          });
        }
        setMembers(formattedMembers);
      } else {
        // Se não achou grupo (ex: foi apagado), zera tudo
        setGroupId(null);
      }
    } catch (error) {
      console.error("Erro ao carregar grupo:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, userEmail, userName]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel("lista_membros_listener")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "membros_grupo",
          filter: `grupo_id=eq.${groupId}`,
        },
        () => loadGroupData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, loadGroupData]);

  const handleCreateInitialGroup = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("grupos")
        .insert({
          nome: "Minha Casa",
          criador_id: userId,
          regra_divisao: "igual",
        })
        .select()
        .single();
      if (error) throw error;
      toast({
        title: "Grupo Criado!",
        description: "Sua casa foi configurada com sucesso.",
      });
      loadGroupData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar o grupo.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const saveGroupName = async () => {
    if (!tempGroupName.trim() || !groupId) return;
    const { error } = await supabase
      .from("grupos")
      .update({ nome: tempGroupName })
      .eq("id", groupId);
    if (error)
      return toast({
        title: "Erro",
        description: "Falha ao atualizar.",
        variant: "destructive",
      });
    setGroupName(tempGroupName);
    setIsEditDialogOpen(false);
    toast({ title: "Atualizado", description: "Nome alterado." });
  };

  const saveSplitRule = async (rule: "igual" | "proporcional") => {
    if (!groupId) return;
    const { error } = await supabase
      .from("grupos")
      .update({ regra_divisao: rule })
      .eq("id", groupId);
    if (error)
      return toast({
        title: "Erro",
        description: "Falha ao alterar a regra.",
        variant: "destructive",
      });
    setSplitRule(rule);
    setIsRuleDialogOpen(false);
    toast({ title: "Regra atualizada", description: "Divisão salva." });
  };

  const handleInvite = async () => {
    if (!groupId) return;
    const emailLimpo = inviteEmail.trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes("@"))
      return toast({
        title: "E-mail inválido",
        description: "Digite um e-mail válido para convidar.",
        variant: "destructive",
      });

    setIsInviting(true);
    try {
      const { data: usuarioExiste, error: rpcError } = await supabase.rpc(
        "verificar_usuario_existe",
        { email_buscado: emailLimpo },
      );
      if (rpcError) throw rpcError;
      if (!usuarioExiste) {
        toast({
          title: "Usuário não encontrado",
          description: "Este e-mail ainda não tem cadastro no Zibee.",
          variant: "destructive",
        });
        setIsInviting(false);
        return;
      }

      const { error } = await supabase
        .from("membros_grupo")
        .insert({
          grupo_id: groupId,
          email_convite: emailLimpo,
          role: "Membro",
          status: "Pendente",
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505")
          toast({
            title: "Aviso",
            description: "E-mail já convidado.",
            variant: "destructive",
          });
        setIsInviting(false);
        return;
      }

      setInviteEmail("");
      toast({
        title: "Convite Adicionado!",
        description: "O usuário receberá a notificação.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha no convite.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const confirmRemoveMember = (id: string) => {
    setMemberToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeRemoveMember = async () => {
    if (memberToDelete && groupId) {
      const { error } = await supabase
        .from("membros_grupo")
        .delete()
        .eq("id", memberToDelete);
      if (error)
        toast({
          title: "Erro",
          description: "Não foi possível remover.",
          variant: "destructive",
        });
      else toast({ title: "Removido", description: "Usuário perdeu acesso." });
    }
    setIsDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  // NOVA FUNÇÃO: EXCLUIR O GRUPO INTEIRO
  const executeDeleteGroup = async () => {
    if (!groupId) return;
    try {
      const { error } = await supabase
        .from("grupos")
        .delete()
        .eq("id", groupId);
      if (error) throw error;

      toast({
        title: "Casa Excluída",
        description: "Todos os dados do grupo foram apagados permanentemente.",
      });
      setIsDeleteGroupDialogOpen(false);

      // Recarrega a página para limpar todos os caches de contexto (Pessoal/Grupo) e zerar as telas
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Erro ao excluir",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading)
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Carregando sua casa...</p>
      </div>
    );

  if (!groupId) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-16 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <HomeIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Bem-vindo aos Grupos!
        </h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          Seu acesso Premium está ativo. Crie sua primeira casa para começar a
          dividir as contas.
        </p>
        <Button
          size="lg"
          className="rounded-2xl h-14 px-8 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          onClick={handleCreateInitialGroup}
        >
          <UserPlusIcon className="w-6 h-6 mr-2" /> Criar Meu Grupo
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-500 space-y-8">
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
        </div>
        {isUserAdmin && (
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
        )}
      </div>

      {isUserAdmin && (
        <div className="bg-background p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <UserPlusIcon className="w-6 h-6 text-primary" /> Convidar Membro
          </h3>
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
              disabled={isInviting}
              className="h-12 rounded-2xl px-8 font-semibold w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {isInviting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Enviar Convite"
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold px-2">
          Membros do Grupo ({members.length})
        </h3>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.dbId || "admin"}
              className={`flex items-center justify-between p-4 rounded-2xl bg-background border transition-colors shadow-sm ${member.status === "Pendente" ? "border-dashed border-border/70 opacity-80" : "border-border/50 hover:border-primary/30"}`}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0 relative">
                  <img
                    src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${member.seed}`}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                  {member.status === "Pendente" && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                      <ClockIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">
                      {member.name}
                    </p>
                    {member.role === "Admin" && (
                      <CheckCircleIcon
                        className="w-4 h-4 text-primary shrink-0"
                        title="Criador"
                      />
                    )}
                    {member.status === "Pendente" && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
              </div>
              {isUserAdmin && member.role !== "Admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirmRemoveMember(member.dbId!)}
                  className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl shrink-0"
                >
                  <TrashIcon className="w-5 h-5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 p-6 md:p-8 rounded-3xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-foreground text-lg">
            Modo de Acerto Mensal
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            As contas estão configuradas para divisão:{" "}
            <strong className="text-primary ml-1 uppercase">
              {splitRule === "igual" ? "Igualitária (50/50)" : "Proporcional"}
            </strong>
            .
          </p>
        </div>
        {isUserAdmin && (
          <Button
            variant="secondary"
            onClick={() => setIsRuleDialogOpen(true)}
            className="rounded-2xl h-11 px-6 font-semibold w-full md:w-auto shrink-0 border border-border/50 hover:bg-muted"
          >
            Mudar Regra
          </Button>
        )}
      </div>

      {/* NOVA ZONA DE PERIGO (Excluir Grupo Inteiro) */}
      {isUserAdmin && (
        <div className="bg-destructive/5 p-6 md:p-8 rounded-3xl border border-destructive/20 shadow-sm space-y-4 mt-12">
          <h3 className="text-xl font-bold flex items-center gap-2 text-destructive">
            <TrashIcon className="w-6 h-6" /> Zona de Perigo
          </h3>
          <p className="text-sm text-destructive/80 font-medium">
            Ao excluir a casa, todos os lançamentos, rendas e membros associados
            a este grupo serão apagados do banco de dados permanentemente. Esta
            ação não pode ser desfeita.
          </p>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteGroupDialogOpen(true)}
            className="rounded-2xl h-11 font-bold"
          >
            Excluir Casa Permanentemente
          </Button>
        </div>
      )}

      {/* MODAIS */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Editar Grupo</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label htmlFor="name">Nome do Grupo</Label>
            <Input
              id="name"
              value={tempGroupName}
              onChange={(e) => setTempGroupName(e.target.value)}
              className="h-12 rounded-2xl"
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
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="rounded-3xl sm:rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Regra de Divisão</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div
              onClick={() => saveSplitRule("igual")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${splitRule === "igual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <h4 className="font-bold flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${splitRule === "igual" ? "border-primary" : "border-muted-foreground"}`}
                >
                  {splitRule === "igual" && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>{" "}
                Igualitária (Padrão)
              </h4>
            </div>
            <div
              onClick={() => saveSplitRule("proporcional")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${splitRule === "proporcional" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <h4 className="font-bold flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${splitRule === "proporcional" ? "border-primary" : "border-muted-foreground"}`}
                >
                  {splitRule === "proporcional" && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>{" "}
                Proporcional / Personalizada
              </h4>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Excluir Membro */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-3xl sm:rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Remover Membro
            </AlertDialogTitle>
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

      {/* NOVO Modal de Excluir Grupo Inteiro */}
      <AlertDialog
        open={isDeleteGroupDialogOpen}
        onOpenChange={setIsDeleteGroupDialogOpen}
      >
        <AlertDialogContent className="rounded-3xl sm:rounded-3xl border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-destructive flex items-center gap-2">
              Excluir Casa Inteira?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80 mt-2">
              Você está prestes a apagar a sua casa.{" "}
              <strong className="text-destructive">Tudo será perdido:</strong>{" "}
              histórico de despesas da casa, rendas e os acessos de todos os
              membros. <br />
              <br />
              Você tem certeza absoluta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border-border/50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteGroup}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
            >
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
