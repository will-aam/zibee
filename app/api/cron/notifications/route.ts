// app/api/cron/notifications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Configuração do Web Push com suas chaves VAPID
webpush.setVapidDetails(
  "mailto:seu-email@exemplo.com", // Um e-mail de contato
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  try {
    // 1. SEGURANÇA: Verifica o Token de Autorização
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. CONTEÚDO: Pega o título e a mensagem do corpo da requisição
    const { title, body, url } = await request.json();

    // 3. BANCO DE DADOS: Busca todas as assinaturas ativas
    // Usamos o Service Role do Supabase para ter acesso total (Admin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // IMPORTANTE: Use a Service Role Key na Vercel
    );

    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*");

    if (dbError) throw dbError;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "Nenhum usuário inscrito ainda." });
    }

    // 4. DISPARO EM MASSA: Envia para cada aparelho
    const notifications = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title: title || "Alerta Zibee",
        body: body || "Você tem uma nova atualização.",
        url: url || "/",
        icon: "/icon.png",
      });

      try {
        await webpush.sendNotification(pushConfig, payload);
        return { status: "success", id: sub.id };
      } catch (err: any) {
        // Se o código for 410 ou 404, o usuário desinstalou o PWA ou revogou a permissão
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        return { status: "failed", id: sub.id, error: err.message };
      }
    });

    const results = await Promise.all(notifications);

    return NextResponse.json({
      message: "Processamento concluído",
      enviados: results.filter((r) => r.status === "success").length,
      falhas: results.filter((r) => r.status === "failed").length,
    });
  } catch (error: any) {
    console.error("Erro no disparo de push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
