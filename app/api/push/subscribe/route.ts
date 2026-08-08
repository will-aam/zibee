// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // <-- Importe a configuração do seu servidor Better-Auth
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    // 1. Pega a sessão usando o Better-Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body.subscription;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Dados de assinatura inválidos" },
        { status: 400 },
      );
    }

    // 2. Salva a assinatura no banco de dados (bypassa RLS se service role key estiver presente)

    // 3. Salva a assinatura com o ID em texto do Better-Auth
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: session.user.id,
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        created_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      console.error("Erro ao salvar assinatura no banco:", error);
      return NextResponse.json(
        { error: "Falha ao salvar no banco de dados" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Assinatura salva com sucesso!",
    });
  } catch (error) {
    console.error("Erro na rota de subscribe:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
