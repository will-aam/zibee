"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  UserCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

export default function Profile() {
  const { toast } = useToast();
  const session = authClient.useSession();
  const user = session.data?.user;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState(""); // Novo campo
  const [isSaving, setIsSaving] = useState(false);

  // Preenche os dados quando a sessão carregar
  useEffect(() => {
    if (user) {
      setNome(user.name || "");
      setEmail(user.email || "");
      // setTelefone(user.phone || ""); // Futuramente, quando tiver no banco
    }
  }, [user]);

  // Validação do nome (mínimo 2 letras)
  const isNameValid = nome.trim().length >= 2;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Aqui no futuro você conectará com a função de update do seu authClient/supabase
    setTimeout(() => {
      toast({
        title: "Perfil atualizado!",
        description: "Seus dados foram salvos com sucesso.",
      });
      setIsSaving(false);
    }, 1000);
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
            Como quer ser chamado?
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Will, João, Jó..."
            className={`h-12 rounded-xl w-full ${!isNameValid && nome.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          />
          <p className="text-xs text-muted-foreground">
            {!isNameValid && nome.length > 0 ? (
              <span className="text-red-500">
                O nome deve ter pelo menos 2 letras.
              </span>
            ) : (
              "Este é o nome que aparecerá no topo do aplicativo (Ex: Boa tarde, Will)."
            )}
          </p>
        </div>

        {/* E-MAIL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
            E-mail de acesso
          </label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="h-12 rounded-xl w-full"
          />
        </div>

        {/* TELEFONE */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            Telefone (WhatsApp)
          </label>
          <Input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            type="tel"
            className="h-12 rounded-xl w-full"
          />
        </div>

        {/* BOTÃO SALVAR */}
        <div className="pt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving || !isNameValid}
            className="w-full sm:w-auto h-12 rounded-xl px-8 font-semibold"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </section>

      {/* SESSÃO: SEGURANÇA E CONTA */}
      <section className="px-5 py-6 space-y-5">
        <div className="flex items-center gap-2 text-foreground mb-2">
          <LockClosedIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Segurança</h2>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl w-full sm:w-auto justify-start px-4 font-medium"
          >
            <LockClosedIcon className="h-5 w-5 mr-3 text-muted-foreground" />
            Alterar Senha
          </Button>

          <Button
            variant="ghost"
            className="h-12 rounded-xl w-full sm:w-auto justify-start px-4 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-medium"
            onClick={handleLogout}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Sair da Conta
          </Button>
        </div>
      </section>
    </div>
  );
}
