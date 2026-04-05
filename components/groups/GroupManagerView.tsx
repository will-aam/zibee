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

// Modais do Shadcn UI
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

// Tipo atualizado para bater com o Banco de Dados
type Member = {
  dbId: string | null; // Null se for o criador (pois ele fica na tabela grupos)
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

  // ESTADOS DO BANCO DE DADOS
  const [isLoading, setIsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // ESTADOS DO GRUPO (UI)
  const [groupName, setGroupName] = useState("");
  const [splitRule, setSplitRule] = useState<"igual" | "proporcional">("igual");
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // ESTADOS DOS MODAIS
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // ============================================================================
  // CARREGAR DADOS DO BANCO (READ)
  // ============================================================================
  const loadGroupData = React.useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      // 1. Tenta achar o grupo onde o usuário é o CRIADOR (Admin)
      let { data: myGroup } = await supabase
        .from("grupos")
        .select("*")
        .eq("criador_id", userId)
        .maybeSingle();

      let admin = true;

      // 2. Se não for criador, procura se ele foi CONVIDADO e aceitou
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

      // Se encontrou um grupo (sendo admin ou membro)
      if (myGroup) {
        setGroupId(myGroup.id);
        setGroupName(myGroup.nome);
        setSplitRule(myGroup.regra_divisao);
        setIsUserAdmin(admin);

        // 3. Buscar a lista de membros convidados
        const { data: membersData } = await supabase
          .from("membros_grupo")
          .select("*")
          .eq("grupo_id", myGroup.id);

        const formattedMembers: Member[] = [];

        // Adicionamos o Criador manualmente no topo da lista
        formattedMembers.push({
          dbId: null,
          name: admin ? "Você (Criador)" : "Criador",
          email: admin ? userEmail : "Admin",
          role: "Admin",
          status: "Aceito",
          seed: admin ? userEmail : "Criador",
        });

        // Adicionamos os convidados
        if (membersData) {
          membersData.forEach((m) => {
            formattedMembers.push({
              dbId: m.id,
              name: m.email_convite.split("@")[0],
              email: m.email_convite,
              role: m.role as "Admin" | "Membro",
              status: m.status as "Aceito" | "Pendente",
              seed: m.email_convite,
            });
          });
        }
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Erro ao carregar grupo:", error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível carregar os dados do grupo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, userEmail, toast]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // ============================================================================
  // CRIAR GRUPO PELA PRIMEIRA VEZ (CREATE)
  // ============================================================================
  const handleCreateInitialGroup = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
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
      loadGroupData(); // Recarrega a tela já com o grupo ativo
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar o grupo.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // ============================================================================
  // AÇÕES DE EDIÇÃO E CONVITE (UPDATE / INSERT / DELETE)
  // ============================================================================
  const saveGroupName = async () => {
    if (!tempGroupName.trim() || !groupId) return;

    const { error } = await supabase
      .from("grupos")
      .update({ nome: tempGroupName })
      .eq("id", groupId);

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar o nome.",
        variant: "destructive",
      });
      return;
    }

    setGroupName(tempGroupName);
    setIsEditDialogOpen(false);
    toast({
      title: "Grupo atualizado",
      description: "O nome da sua casa foi alterado.",
    });
  };

  const saveSplitRule = async (rule: "igual" | "proporcional") => {
    if (!groupId) return;

    const { error } = await supabase
      .from("grupos")
      .update({ regra_divisao: rule })
      .eq("id", groupId);

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao alterar a regra.",
        variant: "destructive",
      });
      return;
    }

    setSplitRule(rule);
    setIsRuleDialogOpen(false);
    toast({
      title: "Regra atualizada",
      description: "A forma de divisão de contas foi salva.",
    });
  };

  const handleInvite = async () => {
    if (!groupId) return;
    const emailLimpo = inviteEmail.trim().toLowerCase();

    if (!emailLimpo || !emailLimpo.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Digite um e-mail válido para convidar.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);

    try {
      // 1. VERIFICA SE O USUÁRIO TEM CONTA NA PLATAFORMA
      const { data: usuarioExiste, error: rpcError } = await supabase.rpc(
        "verificar_usuario_existe",
        { email_buscado: emailLimpo },
      );

      if (rpcError) throw rpcError;

      if (!usuarioExiste) {
        toast({
          title: "Usuário não encontrado",
          description:
            "Este e-mail ainda não tem cadastro no Zibee. Peça para a pessoa criar a conta primeiro!",
          variant: "destructive",
        });
        setIsInviting(false);
        return; // BARRA O CONVITE AQUI!
      }

      // 2. SE EXISTE, INSERE NO GRUPO
      const { data, error } = await supabase
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
        if (error.code === "23505") {
          toast({
            title: "Aviso",
            description: "Este e-mail já foi convidado para o grupo.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setIsInviting(false);
        return;
      }

      // 3. ADICIONA NA TELA SE TUDO DEU CERTO
      const newMember: Member = {
        dbId: data.id,
        name: emailLimpo.split("@")[0],
        email: emailLimpo,
        role: "Membro",
        status: "Pendente",
        seed: emailLimpo,
      };

      setMembers([...members, newMember]);
      setInviteEmail("");
      toast({
        title: "Convite Adicionado!",
        description:
          "Quando este usuário entrar no Zibee, o grupo aparecerá para ele.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao processar o convite.",
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
      // Deleta do Banco
      const { error } = await supabase
        .from("membros_grupo")
        .delete()
        .eq("id", memberToDelete);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível remover o membro.",
          variant: "destructive",
        });
      } else {
        // Atualiza a tela
        setMembers(members.filter((m) => m.dbId !== memberToDelete));
        toast({
          title: "Membro removido",
          description: "O usuário perdeu acesso ao grupo.",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  // ============================================================================
  // RENDERIZAÇÃO DE ESTADOS VAZIOS E CARREGAMENTO
  // ============================================================================
  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Carregando sua casa...</p>
      </div>
    );
  }

  // Se o usuário tem premium mas ainda não criou um grupo
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
          dividir as contas e convidar sua galera.
        </p>
        <Button
          size="lg"
          className="rounded-2xl h-14 px-8 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          onClick={handleCreateInitialGroup}
        >
          <UserPlusIcon className="w-6 h-6 mr-2" />
          Criar Meu Grupo
        </Button>
      </div>
    );
  }

  // ============================================================================
  // RENDERIZAÇÃO PRINCIPAL DO PAINEL
  // ============================================================================
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

      {/* ADICIONAR MEMBRO (Apenas Admin) */}
      {isUserAdmin && (
        <div className="bg-background p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <UserPlusIcon className="w-6 h-6 text-primary" />
            Convidar Membro
          </h3>
          <p className="text-sm text-muted-foreground">
            Envie um convite. Assim que a pessoa criar a conta com este e-mail
            (ou fizer login), ela entrará automaticamente na casa.
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

      {/* LISTA DE MEMBROS */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold px-2">
          Membros do Grupo ({members.length})
        </h3>

        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.dbId || "admin"}
              className={`flex items-center justify-between p-4 rounded-2xl bg-background border transition-colors shadow-sm
                ${member.status === "Pendente" ? "border-dashed border-border/70 opacity-80" : "border-border/50 hover:border-primary/30"}
              `}
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
                        title="Criador do Grupo"
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

              {/* O Admin pode deletar os membros convidados */}
              {isUserAdmin && member.role !== "Admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirmRemoveMember(member.dbId!)}
                  className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl shrink-0"
                  title="Remover Membro"
                >
                  <TrashIcon className="w-5 h-5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* REGRA DE DIVISÃO */}
      <div className="bg-muted/30 p-6 md:p-8 rounded-3xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-foreground text-lg">
            Modo de Acerto Mensal
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            As contas estão configuradas para divisão:
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

      {/* ================= MODAIS (DIALOGS COMUNS) ================= */}

      {/* Modal de Editar Nome */}
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

      {/* Modal de Regra de Divisão */}
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
                </div>
                Igualitária (Padrão)
              </h4>
              <p className="text-sm text-muted-foreground mt-2 ml-6">
                Todas as despesas são somadas e divididas igualmente pelo número
                de membros.
              </p>
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
                </div>
                Proporcional / Personalizada
              </h4>
              <p className="text-sm text-muted-foreground mt-2 ml-6">
                Você define a porcentagem que cada um paga, ideal para quem tem
                rendas diferentes.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DE EXCLUSÃO (LIXEIRA) ================= */}
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
              acesso imediatamente e não poderá mais lançar despesas.
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
