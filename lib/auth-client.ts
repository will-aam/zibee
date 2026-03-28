// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Detecta automaticamente onde o app está rodando
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://zibee.vercel.app",
});
