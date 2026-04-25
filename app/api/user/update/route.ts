import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { id, nome, email, telefone } = await req.json();

    if (!id || !nome || !email) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Atualiza os dados direto na tabela "user" do Supabase gerada pelo better-auth
    const { error } = await supabase
      .from("user")
      .update({
        name: nome,
        email: email,
        phone: telefone || null,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
