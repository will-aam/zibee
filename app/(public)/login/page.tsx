// app/login/page.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AuroraText } from "@/components/ui/aurora-text";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // <--- NOVO ESTADO PARA VER SENHA
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  // <--- RECEBE O EVENTO DO FORMULÁRIO (e: React.FormEvent)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Evita o recarregamento padrão da página ao dar Enter

    setLoading(true);
    try {
      if (isLogin) {
        // --- LOGIN ---
        await authClient.signIn.email(
          { email, password },
          {
            onSuccess: () => router.push("/"),
            onError: (ctx) => {
              toast({
                title: "Erro ao entrar",
                description: ctx.error.message,
                variant: "destructive",
              });
              setLoading(false);
            },
          },
        );
      } else {
        // --- CADASTRO ---
        if (!name) {
          toast({ title: "Nome obrigatório", variant: "destructive" });
          setLoading(false);
          return;
        }
        await authClient.signUp.email(
          { email, password, name },
          {
            onSuccess: () => {
              toast({
                title: "Conta criada!",
                description: "Você já está logado.",
              });
              router.push("/");
            },
            onError: (ctx) => {
              toast({
                title: "Erro ao cadastrar",
                description: ctx.error.message,
                variant: "destructive",
              });
              setLoading(false);
            },
          },
        );
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background sm:p-4 animate-in fade-in">
      <Card className="w-full max-w-md border-0 shadow-none rounded-none bg-transparent sm:border sm:border-border sm:shadow-sm sm:rounded-xl sm:bg-card">
        <CardHeader className="text-center space-y-2 pt-12 sm:pt-6">
          <CardTitle className="text-7xl font-bold tracking-tight pb-2">
            <AuroraText
              colors={["#10b981", "#14b8a6", "#3b82f6", "#6366f1"]}
              speed={1.5}
            >
              Zibee
            </AuroraText>
          </CardTitle>
          <CardDescription className="text-base sm:text-sm">
            {isLogin
              ? "Entre para acessar suas finanças"
              : "Crie sua conta gratuita"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 👇 BOTÃO DO GOOGLE (Substituído para o Button padrão) */}
          <Button
            variant="outline"
            className="w-full py-6 sm:py-5 text-base sm:text-sm"
            onClick={handleGoogleLogin}
            type="button"
            disabled={isGoogleLoading || loading}
          >
            {isGoogleLoading ? (
              <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-5 w-5 sm:h-4 sm:w-4"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continuar com Google
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background sm:bg-card px-2 text-muted-foreground">
                Ou com email
              </span>
            </div>
          </div>

          {/* 👇 ENVOLVENDO OS CAMPOS E O BOTÃO EM UM FORM */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-3">
            {!isLogin && (
              <div className="space-y-2 sm:space-y-1">
                <Label className="text-base sm:text-sm">
                  Como deseja ser chamado?
                </Label>
                <Input
                  className="py-6 sm:py-2 text-base sm:text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu primeiro nome ou apelido"
                />
              </div>
            )}

            <div className="space-y-2 sm:space-y-1">
              <Label className="text-base sm:text-sm">E-mail</Label>
              <Input
                className="py-6 sm:py-2 text-base sm:text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                required // Adiciona validação nativa do navegador
              />
            </div>

            <div className="space-y-2 sm:space-y-1">
              <Label className="text-base sm:text-sm">Senha</Label>
              {/* 👇 CONTAINER RELATIVO PARA POSICIONAR O ÍCONE */}
              <div className="relative">
                <Input
                  className="py-6 sm:py-2 pr-12 text-base sm:text-sm" // pr-12 dá espaço para o ícone
                  type={showPassword ? "text" : "password"} // Alterna o tipo
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                  ) : (
                    <EyeIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 👇 O BOTÃO DE SUBMIT AGORA FICA DENTRO DO FORM */}
            <Button
              type="submit" // Agora ele aciona o onSubmit do <form> (suporta o Enter)
              className="w-full font-bold py-6 sm:py-4 text-base mt-4"
              disabled={loading}
            >
              {loading ? (
                <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pb-8 sm:pb-6">
          <Button
            variant="link"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setShowPassword(false);
            }}
            className="text-muted-foreground text-base sm:text-sm"
          >
            {isLogin
              ? "Não tem conta? Cadastre-se"
              : "Já tem conta? Entre aqui"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
