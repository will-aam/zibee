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
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AuroraText } from "@/components/ui/aurora-text";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async () => {
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
    // 👇 Mudamos de p-4 para sm:p-4 (sem padding no celular)
    <div className="min-h-screen flex items-center justify-center bg-background sm:p-4 animate-in fade-in">
      {/* 👇 Removendo bordas e sombras no mobile, adicionando no sm: */}
      <Card className="w-full max-w-md border-0 shadow-none rounded-none bg-transparent sm:border sm:border-border sm:shadow-sm sm:rounded-xl sm:bg-card">
        <CardHeader className="text-center space-y-2 pt-12 sm:pt-6">
          {/* 👇 Seu título gigante 7xl */}
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
          <Button
            variant="outline"
            className="w-full py-6 sm:py-5 text-base sm:text-sm"
            onClick={handleGoogleLogin}
          >
            <svg
              className="mr-2 h-5 w-5 sm:h-4 sm:w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
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

          <div className="space-y-4 sm:space-y-3">
            {!isLogin && (
              <div className="space-y-2 sm:space-y-1">
                <Label className="text-base sm:text-sm">Nome</Label>
                <Input
                  className="py-6 sm:py-2 text-base sm:text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="space-y-2 sm:space-y-1">
              <Label className="text-base sm:text-sm">Email</Label>
              <Input
                className="py-6 sm:py-2 text-base sm:text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>

            <div className="space-y-2 sm:space-y-1">
              <Label className="text-base sm:text-sm">Senha</Label>
              <Input
                className="py-6 sm:py-2 text-base sm:text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
              />
            </div>
          </div>

          <Button
            className="w-full font-bold py-6 sm:py-4 text-base mt-2"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : isLogin ? (
              "Entrar"
            ) : (
              "Criar Conta"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center pb-8 sm:pb-6">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
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
