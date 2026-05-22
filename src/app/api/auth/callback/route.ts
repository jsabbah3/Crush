import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  await prisma.user.upsert({
    where: { id: data.user.id },
    create: {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.full_name ?? null,
      avatarUrl: data.user.user_metadata?.avatar_url ?? null,
    },
    update: {
      name: data.user.user_metadata?.full_name ?? null,
      avatarUrl: data.user.user_metadata?.avatar_url ?? null,
    },
  });

  return NextResponse.redirect(`${origin}/dashboard`);
}
