import { createClient } from "@supabase/supabase-js";

// Mantém exatamente essas envs (padrão Next/Supabase)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client Supabase para uso no browser (componentes "use client").
 *
 * Importante:
 * - Para o .auth.getUser() funcionar e para as RLS policies liberarem acesso,
 *   este client precisa manter a sessão (token) do usuário no navegador.
 * - Esses defaults do supabase-js já resolvem para a maioria dos casos.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
