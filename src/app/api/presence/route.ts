import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";

// ping ทุก 60 วิ ระหว่างเปิดแท็บ → นับว่าออนไลน์ + เวลาใช้งาน (ดูที่ Admin → ออนไลน์ & สถิติ)
export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  await createServiceSupabase().rpc("presence_ping", { uid: auth.user.id });
  return NextResponse.json({ ok: true });
}
