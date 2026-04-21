// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Cria o cliente do Supabase usando o novo padrão SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Ignora erros caso seja chamado de um contexto somente leitura
            }
          },
        },
      },
    );

    // Pega a sessão do usuário
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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

    // Salva ou atualiza a assinatura no Supabase
    const { error } = await supabase.from("push_subscriptions").upsert(
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
