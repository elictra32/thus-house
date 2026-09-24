import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST() {
  await createServerSupabase().auth.signOut();
  return NextResponse.json({ ok: true });
}
