import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { logMember } from "@/lib/member-log";

// เปิดดูเลขบัตรประชาชนของตัวเอง (ถอดรหัสฝั่ง server · บันทึก Log)
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const service = createServiceSupabase();
  const { data } = await service.rpc("get_id_card", { uid: auth.user.id });
  await logMember(service, auth.user.id, "view_id_card", { by: "self" });
  return NextResponse.json({ idCard: (data as string | null) ?? null }, { headers: { "Cache-Control": "no-store" } });
}
