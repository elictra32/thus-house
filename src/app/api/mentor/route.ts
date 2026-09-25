import { NextResponse } from "next/server";
import { requireApiUser, jsonError, getPermissions } from "@/lib/auth";
import { MENTOR_FIELDS } from "@/lib/mentor";
import { createServiceSupabase } from "@/lib/supabase-server";

async function requireMentor() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth;
  if (!(await getPermissions(auth.user.id, auth.user.email)).has("mentor")) return { ok: false as const, res: jsonError("เฉพาะ Mentor", 403) };
  return auth;
}

// สมาชิกที่ฉันดูแล
export async function GET() {
  const auth = await requireMentor();
  if (!auth.ok) return auth.res;
  const service = createServiceSupabase();
  const { data: links } = await service.from("mentor_members").select("member_id, created_at").eq("mentor_id", auth.user.id);
  const ids = (links ?? []).map((l) => l.member_id);
  if (!ids.length) return NextResponse.json({ members: [] });
  const [{ data: users }, { data: notes }] = await Promise.all([
    service.from("users").select(MENTOR_FIELDS).in("id", ids),
    service.from("member_notes").select("member_id, created_at").in("member_id", ids).order("created_at", { ascending: false }),
  ]);
  const lastNote = new Map<string, string>();
  for (const n of notes ?? []) if (!lastNote.has(n.member_id)) lastNote.set(n.member_id, n.created_at);
  const members = (users ?? []).map((u) => ({
    ...u,
    notes: (notes ?? []).filter((n) => n.member_id === u.id).length,
    last_note_at: lastNote.get(u.id) ?? null,
  }));
  members.sort((a, b) => (a.member_code ?? "zzz").localeCompare(b.member_code ?? "zzz"));
  return NextResponse.json({ members });
}

// เพิ่มสมาชิกที่ดูแล
export async function POST(req: Request) {
  const auth = await requireMentor();
  if (!auth.ok) return auth.res;
  const { memberId } = await req.json().catch(() => ({}));
  if (typeof memberId !== "string" || memberId === auth.user.id) return jsonError("เลือกสมาชิกไม่ถูกต้อง");
  const service = createServiceSupabase();
  const { data: exists } = await service.from("users").select("id").eq("id", memberId).maybeSingle();
  if (!exists) return jsonError("ไม่พบสมาชิก", 404);
  // สมาชิก 1 คนมี Mentor ได้คนเดียว
  const { data: other } = await service.from("mentor_members").select("mentor_id").eq("member_id", memberId).neq("mentor_id", auth.user.id).maybeSingle();
  if (other) return jsonError("สมาชิกคนนี้มี Mentor คนอื่นดูแลอยู่แล้ว", 409);
  await service.from("mentor_members").upsert({ mentor_id: auth.user.id, member_id: memberId }, { onConflict: "mentor_id,member_id", ignoreDuplicates: true });
  return NextResponse.json({ ok: true });
}

// เลิกดูแล (โน้ตยังอยู่)
export async function DELETE(req: Request) {
  const auth = await requireMentor();
  if (!auth.ok) return auth.res;
  const memberId = new URL(req.url).searchParams.get("memberId");
  if (!memberId) return jsonError("เลือกสมาชิกไม่ถูกต้อง");
  await createServiceSupabase().from("mentor_members").delete().eq("mentor_id", auth.user.id).eq("member_id", memberId);
  return NextResponse.json({ ok: true });
}
