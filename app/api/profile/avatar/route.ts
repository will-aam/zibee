// app/api/profile/avatar/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_STYLES = new Set([
  "bottts-neutral",
  "fun-emoji",
  "lorelei-neutral",
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  // Better Auth: pega sessão a partir dos headers/cookies do request
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data, error } = await supabaseAdmin
    .from("user_profile_settings_ba")
    .select("avatar_style, avatar_seed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load avatar settings", details: error.message },
      { status: 500 },
    );
  }

  // se não existir ainda, retorna defaults
  return NextResponse.json({
    avatar_style: data?.avatar_style ?? "bottts-neutral",
    avatar_seed: data?.avatar_seed ?? "",
  });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const avatar_style = String(body?.avatar_style ?? "");
  const avatar_seed = String(body?.avatar_seed ?? "");

  if (!ALLOWED_STYLES.has(avatar_style)) {
    return badRequest("Invalid avatar_style");
  }

  // seed pode ser vazio, mas não pode ser gigantesco
  if (avatar_seed.length > 200) {
    return badRequest("avatar_seed too long");
  }

  const { error } = await supabaseAdmin.from("user_profile_settings_ba").upsert(
    {
      user_id: userId,
      avatar_style,
      avatar_seed,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save avatar settings", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
