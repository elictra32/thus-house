import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { MENTOR_FIELDS, canAccessMember } from "@/lib/mentor";
import { loadNotes } from "@/lib/member-notes";
import { createServiceSupabase } from "@/lib/supabase-server";

// รายละเอียดสมาชิกที่ Mentor ดูแล: ข้อมูลพื้นฐาน + ประสบการณ์ + คอร์ส + โน้ต + กิจกรรมล่าสุด
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  if (!(await canAccessMember(auth.user, params.id)).ok) return jsonError("สมาชิกคนนี้ไม่ได้อยู่ในความดูแลของคุณ", 403);
  const service = createServiceSupabase();
  const [{ data: member }, { data: purchases }, notes, { data: logs }] = await Promise.all([
    service.from("users").select(MENTOR_FIELDS).eq("id", params.id).maybeSingle(),
    service.from("purchases").select("id, status, expires_at, created_at, classes(name)").eq("user_id", params.id).order("created_at", { ascending: false }),
    loadNotes(service, params.id),
    service.from("member_logs").select("id, action, details, created_at").eq("user_id", params.id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!member) return jsonError("ไม่พบสมาชิก", 404);
  return NextResponse.json({ member, purchases: purchases ?? [], notes, logs: logs ?? [], me: auth.user.id });
}
