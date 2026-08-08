import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Configuração do Web Push
webpush.setVapidDetails(
  "mailto:seu-email@exemplo.com", // Coloque seu e-mail real aqui
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  try {
    // 1. SEGURANÇA: Verifica o Token de Autorização do Cron-job.org
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

// 2. BUSCA USUÁRIOS QUE QUEREM SER AVISADOS
    // Pegamos nome, ID e a preferência de dias (que adicionamos hoje)
    const { data: usuarios, error: userError } = await supabaseAdmin
      .from("user")
      .select("id, name, dias_fatura")
      .neq("dias_fatura", "nunca"); // Ignora quem marcou "Não me avisar"

    if (userError) throw userError;
    if (!usuarios || usuarios.length === 0) {
      return NextResponse.json({
        message: "Nenhum usuário com alertas ativados.",
      });
    }

    let enviados = 0;
    let falhas = 0;

    // 3. LAÇO DE REPETIÇÃO: Analisa cada usuário individualmente
    for (const user of usuarios) {
      const diasAntecedencia = parseInt(user.dias_fatura || "0"); // 0, 1, 3 ou 5

      // Calcula qual é a data alvo (Hoje + dias que o usuário escolheu)
      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() + diasAntecedencia);
      const dataAlvoFormatada = dataAlvo.toISOString().split("T")[0]; // YYYY-MM-DD

      // 4. BUSCA AS CONTAS DESSE USUÁRIO PARA ESSA DATA
      // IMPORTANTE: Ajuste 'lancamentos', 'data_vencimento' e o status de pagamento
      // para bater com os nomes exatos das colunas do seu banco de dados
      const { data: contasPendentes } = await supabaseAdmin
        .from("lancamentos")
        .select("id, descricao, valor")
        .eq("user_id", user.id)
        .eq("pago", false) // Ou .eq("status", "pendente")
        .eq("data_vencimento", dataAlvoFormatada);

      // Se o usuário tiver contas vencendo na data que ele configurou
      if (contasPendentes && contasPendentes.length > 0) {
        // 5. PEGA OS DISPOSITIVOS (CELULAR/PC) DESSE USUÁRIO ESPECÍFICO
        const { data: userSubscriptions } = await supabaseAdmin
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", user.id); // Filtramos só os aparelhos dele!

        if (userSubscriptions && userSubscriptions.length > 0) {
          // Monta a mensagem personalizada
          const quantidade = contasPendentes.length;
          let title = "";
          let body = "";

          if (diasAntecedencia === 0) {
            title = "⚠️ Contas vencendo HOJE!";
            body = `Olá ${user.name || "!"} Você tem ${quantidade} conta(s) para pagar hoje.`;
          } else {
            title = "🗓️ Lembrete de Vencimento";
            body = `Olá ${user.name}! Você tem ${quantidade} conta(s) vencendo em ${diasAntecedencia} dia(s).`;
          }

          const payload = JSON.stringify({
            title,
            body,
            url: "/lancamentos", // Quando ele clicar na notificação, vai pra essa tela
            icon: "/icon.png",
          });

          // 6. ENVIA PARA TODOS OS APARELHOS DELE
          for (const sub of userSubscriptions) {
            const pushConfig = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            };

            try {
              await webpush.sendNotification(pushConfig, payload);
              enviados++;
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Limpa o banco caso ele tenha desinstalado o app
                await supabaseAdmin
                  .from("push_subscriptions")
                  .delete()
                  .eq("id", sub.id);
              }
              falhas++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: "Rotina diária concluída",
      enviados,
      falhas,
    });
  } catch (error: any) {
    console.error("Erro na rotina de push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
