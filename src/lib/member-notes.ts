import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NoteView = { id: string; body: string; createdAt: string; authorId: string | null; author: string };

// โน้ตประวัติสมาชิก (Mentor / Admin เขียน) พร้อมชื่อผู้เขียน — ดึงชื่อแยก ไม่พึ่ง embed ของ PostgREST
export async function loadNotes(service: SupabaseClient, memberId: string): Promise<NoteView[]> {
  const { data } = await service
    .from("member_notes").select("id, body, created_at, author_id").eq("member_id", memberId).order("created_at", { ascending: false });
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.author_id).filter(Boolean))) as string[];
  const { data: authors } = ids.length
    ? await service.from("users").select("id, name, nickname, email").in("id", ids)
    : { data: [] as { id: string; name: string | null; nickname: string | null; email: string }[] };
  const byId = new Map((authors ?? []).map((a) => [a.id, a.nickname || a.name || a.email]));
  return rows.map((r) => ({
    id: r.id, body: r.body, createdAt: r.created_at, authorId: r.author_id, author: (r.author_id && byId.get(r.author_id)) || "-",
  }));
}

// Mentor ที่ดูแลสมาชิกคนนี้
export async function loadMentors(service: SupabaseClient, memberId: string) {
  const { data } = await service.from("mentor_members").select("mentor_id").eq("member_id", memberId);
  const ids = (data ?? []).map((r) => r.mentor_id);
  if (!ids.length) return [];
  const { data: users } = await service.from("users").select("id, name, nickname, member_code").in("id", ids);
  return users ?? [];
}
