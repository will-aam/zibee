// lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

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
});
