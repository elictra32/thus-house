import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { logMember } from "@/lib/member-log";
import { SID_COOKIE } from "@/lib/device-session";

export async function POST() {
  const supabase = createServerSupabase();
  // ปล่อยล็อกอุปกรณ์ → ล็อกอินเครื่องอื่นได้
  const sid = cookies().get(SID_COOKIE)?.value;
  if (sid) await supabase.rpc("session_release", { sid });
  const { data } = await supabase.auth.getUser();
  if (data.user) await logMember(createServiceSupabase(), data.user.id, "logout");
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
