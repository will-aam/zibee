// lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { supabaseAdmin } from "./supabase-admin";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  // Aceita tanto localhost quanto vercel
  trustedOrigins: ["http://localhost:3000", "https://fincappw.vercel.app"],
  // Usa a variável de ambiente (que é localhost no seu PC e vercel.app na nuvem)
  baseURL: process.env.BETTER_AUTH_URL,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const defaultCategories = [
              { nome: "Alimentação", user_id: user.id, regra_orcamento: "50" },
              { nome: "Transporte", user_id: user.id, regra_orcamento: "50" },
              { nome: "Moradia", user_id: user.id, regra_orcamento: "50" },
              { nome: "Saúde", user_id: user.id, regra_orcamento: "50" },
              { nome: "Educação", user_id: user.id, regra_orcamento: "50" },
              { nome: "Lazer", user_id: user.id, regra_orcamento: "30" },
              { nome: "Compras", user_id: user.id, regra_orcamento: "30" },
              { nome: "Salário", user_id: user.id, regra_orcamento: "renda" },
              { nome: "Renda Extra", user_id: user.id, regra_orcamento: "renda" },
              { nome: "Investimentos", user_id: user.id, regra_orcamento: "renda" },
              { nome: "Outros", user_id: user.id, regra_orcamento: "30" },
            ];
            await supabaseAdmin.from("categorias").insert(defaultCategories);
          } catch (error) {
            console.error("Erro ao criar categorias padrão:", error);
          }
        },
      },
    },
  },
});
