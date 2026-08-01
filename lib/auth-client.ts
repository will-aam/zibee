// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Detecta automaticamente o host de onde o app está sendo servido
  // Funciona com localhost, IP de rede local (192.168.x.x) e produção
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});
