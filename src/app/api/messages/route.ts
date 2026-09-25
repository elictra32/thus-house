import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { displayName } from "@/lib/community";
import { notifyDiscord } from "@/lib/discord";
import { logMember } from "@/lib/member-log";

// ข้อความ/Feedback ถึงผู้สอน — สมาชิกเห็นเฉพาะของตัวเอง
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { data, error } = await createServiceSupabase()
    .from("instructor_messages")
    .select("id, body, status, reply, replied_at, created_at, classes(name)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ messages: data });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return jsonError("กรุณาพิมพ์ข้อความ");
  if (text.length > 4000) return jsonError("ข้อความยาวเกิน 4,000 ตัวอักษร");
  const service = createServiceSupabase();

  // กันสแปม: ไม่เกิน 5 ข้อความต่อชั่วโมง
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await service
    .from("instructor_messages").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", since);
  if ((count ?? 0) >= 5) return jsonError("ส่งข้อความถี่เกินไป กรุณารอสักครู่", 429);

  let classId: string | null = null;
  let className: string | null = null;
  if (typeof body.classId === "string" && body.classId) {
    const { data: cls } = await service.from("classes").select("id, name").eq("id", body.classId).maybeSingle();
    if (cls) {
      classId = cls.id;
      className = cls.name;
    }
  }
  const { error } = await service.from("instructor_messages").insert({ user_id: auth.user.id, class_id: classId, body: text });
  if (error) return jsonError(error.message, 500);
  await logMember(service, auth.user.id, "message", { class: className, body: text.slice(0, 200) });

  const { data: me } = await service.from("users").select("nickname, name, email, member_code").eq("id", auth.user.id).maybeSingle();
  await notifyDiscord(
    "message",
    "ข้อความ/Feedback ถึงผู้สอน",
    { จาก: `${displayName(me)} (${me?.email ?? auth.user.email})`, รหัสสมาชิก: me?.member_code, คอร์ส: className, ข้อความ: text },
    "/admin/messages",
  );
  return NextResponse.json({ ok: true });
}
