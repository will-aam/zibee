"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  UserCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  PhoneIcon,
  ArrowPathIcon,
  KeyIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function Profile() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const user = session.data?.user;

  // Estados do Perfil
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Estados da Senha Expansível
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // --- FUNÇÃO PARA APLICAR MÁSCARA NO TELEFONE ---
  const applyPhoneMask = (val: string) => {
    if (!val) return "";
    let v = val.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    }
    if (v.length > 9) {
      v = `${v.slice(0, 10)}-${v.slice(10)}`;
    }
    return v;
  };

  useEffect(() => {
    async function loadUserData() {
      if (user) {
        setNome(user.name || "");
        setEmail(user.email || "");

        const { data, error } = await supabase
          .from("user")
          .select("phone")
          .eq("id", user.id)
          .single();

        if (!error && data?.phone) {
          setTelefone(applyPhoneMask(data.phone));
        }
      }
    }
    loadUserData();
  }, [user]);

  // --- VALIDAÇÕES DO PERFIL ---
  const isNameValid = nome.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidToSaveProfile = isNameValid && isEmailValid;

  // --- VALIDAÇÕES DA SENHA ---
  const isPasswordValid =
    novaSenha.length >= 8 &&
    novaSenha === confirmaSenha &&
    senhaAtual.length > 0;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(applyPhoneMask(e.target.value));
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !isValidToSaveProfile) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.replace(/\D/g, ""),
        }),
      });

      if (!response.ok) throw new Error("Falha ao salvar dados");

      toast({
        title: "Perfil atualizado!",
        description: "Seus dados foram salvos com sucesso. Atualizando...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar seus dados.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isPasswordValid) return;
    setIsChangingPassword(true);

    try {
      const { error } = await authClient.changePassword({
        newPassword: novaSenha,
        currentPassword: senhaAtual,
        revokeOtherSessions: true,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmaSenha("");
      setIsPasswordExpanded(false);
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description:
          error.message || "Verifique se a senha atual está correta.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmaSenha("");
    setIsPasswordExpanded(false);
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="animate-in fade-in duration-300 flex flex-col">
      {/* SESSÃO: CABEÇALHO DO PERFIL */}
      <section className="px-5 py-6 border-b border-border/30 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          {user?.image ? (
            <img
              src={user.image}
              alt="Avatar"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="h-8 w-8" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Meus Dados
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie suas informações pessoais
          </p>
        </div>
      </section>

      {/* SESSÃO: FORMULÁRIO DE DADOS */}
      <section className="px-5 py-6 border-b border-border/30 space-y-5">
        {/* NOME / APELIDO */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <UserCircleIcon className="h-4 w-4 text-muted-foreground" />
            Como quer ser chamado? *
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Will, João, Jó..."
            className={`h-12 rounded-xl w-full ${!isNameValid && nome.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          />
        </div>

        {/* E-MAIL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
            E-mail de acesso *
          </label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            type="email"
            className={`h-12 rounded-xl w-full ${!isEmailValid && email.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          />
        </div>

        {/* TELEFONE */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            Telefone (Opcional)
          </label>
          <Input
            value={telefone}
            onChange={handlePhoneChange}
            placeholder="(00) 00000-0000"
            type="tel"
            maxLength={15}
            className="h-12 rounded-xl w-full"
          />
        </div>

        {/* BOTÃO SALVAR */}
        <div className="pt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving || !isValidToSaveProfile}
            className="w-full sm:w-auto h-12 rounded-xl px-8 font-semibold"
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />{" "}
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </section>

      {/* SESSÃO: SEGURANÇA E CONTA */}
      <section className="px-5 py-6 space-y-2">
        <div className="flex items-center gap-2 text-foreground mb-4">
          <LockClosedIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">
            Segurança e Acesso
          </h2>
        </div>

        <div className="flex flex-col">
          {/* BOTÃO EXPANSÍVEL DE ALTERAR SENHA (TOTALMENTE CHAPADO) */}
          <button
            onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
            className="flex items-center justify-between w-full py-3 hover:opacity-70 transition-opacity group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <KeyIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  Alterar Senha
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atualize sua credencial de acesso
                </p>
              </div>
            </div>
            {isPasswordExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {/* ÁREA EXPANSÍVEL DO FORMULÁRIO (CHAPADO) */}
          {isPasswordExpanded && (
            <div className="py-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Senha Atual
                </label>
                <Input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Nova Senha (Mín. 8 caracteres)
                </label>
                <Input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Confirme a Nova Senha
                </label>
                <Input
                  type="password"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  className={`h-12 rounded-xl ${novaSenha !== confirmaSenha && confirmaSenha.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="••••••••"
                />
                {novaSenha !== confirmaSenha && confirmaSenha.length > 0 && (
                  <p className="text-[11px] text-red-500 font-medium">
                    As senhas não coincidem.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={!isPasswordValid || isChangingPassword}
                  className="w-full sm:w-auto h-12 rounded-xl font-semibold px-8"
                >
                  {isChangingPassword ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />{" "}
                      Atualizando...
                    </>
                  ) : (
                    "Confirmar Nova Senha"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelPassword}
                  className="w-full sm:w-auto h-12 rounded-xl text-muted-foreground px-8"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* LINHA DIVISÓRIA ADICIONADA AQUI */}
          <hr className="border-border/30 my-4" />

          {/* BOTÃO DE SAIR - Aparece apenas no Mobile (sm:hidden) */}
          <Button
            variant="ghost"
            className="h-12 rounded-xl w-full sm:hidden justify-start px-2 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-medium"
            onClick={handleLogout}
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6 mr-3" />
            <span className="text-base">Sair da Conta</span>
          </Button>
        </div>
      </section>
    </div>
  );
}
