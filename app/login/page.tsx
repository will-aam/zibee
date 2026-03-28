"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client"; // O arquivo que criamos no passo anterior
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
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true); // Alterna entre Login e Cadastro
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  // Função para Entrar ou Cadastrar com Email/Senha
  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        // --- LOGIN ---
        await authClient.signIn.email(
          {
            email,
            password,
          },
          {
            onSuccess: () => {
              router.push("/"); // Manda para a Home
            },
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
          {
            email,
            password,
            name,
          },
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
      // Erro genérico de rede
      setLoading(false);
    }
  };

  // Função para Login com Google
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/", // Para onde voltar depois de logar
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Zibee
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Entre para acessar suas finanças"
              : "Crie sua conta gratuita"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botão Google */}
          <Button
            variant="outline"
            className="w-full py-5"
            onClick={handleGoogleLogin}
          >
            <svg
              className="mr-2 h-4 w-4"
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou com email
              </span>
            </div>
          </div>

          {/* Campos do Formulário */}
          <div className="space-y-3">
            {!isLogin && (
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>

            <div className="space-y-1">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
              />
            </div>
          </div>

          <Button
            className="w-full font-bold"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLogin ? (
              "Entrar"
            ) : (
              "Criar Conta"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-muted-foreground"
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
