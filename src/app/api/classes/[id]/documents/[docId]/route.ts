import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { getClassAccess } from "@/lib/class-access";
import { createServiceSupabase } from "@/lib/supabase-server";
import { logMember } from "@/lib/member-log";

// เปิดเอกสารประกอบคลาส: ตรวจสิทธิ์เรียนคลาสก่อน แล้ว redirect ไปลิงก์ Google Drive (ลิงก์จริงไม่อยู่ในหน้าเว็บ)
export async function GET(_req: Request, { params }: { params: { id: string; docId: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;

  const service = createServiceSupabase();
  const { data: doc } = await service
    .from("class_documents").select("id, title, url").eq("id", params.docId).eq("class_id", params.id).maybeSingle();
  if (!doc) return jsonError("ไม่พบเอกสาร", 404);

  const access = await getClassAccess(auth.supabase, auth.user, params.id);
  if (!access.hasAccess) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  await logMember(service, auth.user.id, "open_doc", { title: doc.title, doc_id: doc.id });
  return NextResponse.redirect(doc.url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
