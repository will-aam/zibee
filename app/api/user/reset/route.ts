import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Tabelas que dependem do user_id
    const tablesToWipe = [
      "lancamentos",
      "metas",
      "despesas_fixas",
      "lembretes",
      "cartoes_credito",
      "formas_pagamento",
      "fechamentos_mes",
      "categorias"
    ];

    // Deletar os dados de cada tabela
    await Promise.all(
      tablesToWipe.map((table) =>
        supabaseAdmin.from(table).delete().eq("user_id", userId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao resetar conta:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
