// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Adicione a base URL aqui para bater com o servidor
  baseURL: "http://localhost:3000",
});
