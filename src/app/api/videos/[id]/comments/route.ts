import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { adminEmails } from "@/lib/admin";
import { displayName, isCommunityStaff, videoAccess } from "@/lib/community";
import { notifyDiscord } from "@/lib/discord";

type Row = { id: string; parent_id: string | null; body: string; created_at: string; user_id: string };
type Author = { id: string; nickname: string | null; name: string | null; email: string; role: string };

// รายการคอมเมนต์ของบทเรียน + จำนวนไลก์ (เฉพาะผู้มีสิทธิ์เรียนคอร์สนี้)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { video, ok, service } = await videoAccess(auth.supabase, auth.user, params.id);
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);
  if (!ok) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const [{ data: rows, error: rowsError }, { data: vlikes }, { data: roles }] = await Promise.all([
    service
      .from("lesson_comments")
      .select("id, parent_id, body, created_at, user_id")
      .eq("video_id", video.id)
      .order("created_at", { ascending: true })
      .limit(500),
    service.from("video_likes").select("user_id").eq("video_id", video.id),
    service.from("roles").select("id, permissions"),
  ]);
  if (rowsError) {
    console.error("lesson_comments load failed", rowsError.message);
    return jsonError("โหลดคอมเมนต์ไม่สำเร็จ กรุณาลองใหม่", 500);
  }
  const comments = (rows ?? []) as Row[];
  const ids = comments.map((c) => c.id);
  // ดึงข้อมูลผู้เขียนแยก (ไม่ใช้ embed ของ PostgREST — ถ้า schema cache ไม่เห็น relationship คอมเมนต์จะหายทั้งหมด)
  const authorIds = Array.from(new Set(comments.map((c) => c.user_id)));
  const { data: authorRows } = authorIds.length
    ? await service.from("users").select("id, nickname, name, email, role").in("id", authorIds)
    : { data: [] as Author[] };
  const authors = new Map(((authorRows ?? []) as Author[]).map((a) => [a.id, a]));
  const { data: likes } = ids.length
    ? await service.from("lesson_comment_likes").select("comment_id, user_id").in("comment_id", ids)
    : { data: [] as { comment_id: string; user_id: string }[] };

  const staffRoles = new Set((roles ?? []).filter((r) => (r.permissions as string[]).includes("community")).map((r) => r.id));
  const owners = adminEmails();
  const me = auth.user.id;
  const canModerate = await isCommunityStaff(auth.user);

  return NextResponse.json({
    canModerate,
    video: {
      likes: vlikes?.length ?? 0,
      liked: !!vlikes?.some((l) => l.user_id === me),
    },
    comments: comments.map((c) => {
      const u = authors.get(c.user_id) ?? null;
      const cl = (likes ?? []).filter((l) => l.comment_id === c.id);
      return {
        id: c.id,
        parentId: c.parent_id,
        body: c.body,
        createdAt: c.created_at,
        author: displayName(u),
        staff: !!u && (staffRoles.has(u.role) || owners.includes(u.email.toLowerCase())),
        mine: c.user_id === me,
        likes: cl.length,
        liked: cl.some((l) => l.user_id === me),
      };
    }),
  });
}

// โพสต์คอมเมนต์ / ตอบกลับ
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { video, ok, service } = await videoAccess(auth.supabase, auth.user, params.id);
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);
  if (!ok) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return jsonError("กรุณาพิมพ์ข้อความ");
  if (text.length > 2000) return jsonError("ข้อความยาวเกิน 2,000 ตัวอักษร");

  // ตอบกลับได้ชั้นเดียว: ตอบคอมเมนต์ที่เป็นคำตอบอยู่แล้ว → ผูกกับคอมเมนต์หลักแทน
  let parentId: string | null = null;
  let parentOwner: string | null = null;
  if (typeof body.parentId === "string" && body.parentId) {
    const { data: parent } = await service
      .from("lesson_comments").select("id, parent_id, user_id, video_id").eq("id", body.parentId).maybeSingle();
    if (!parent || parent.video_id !== video.id) return jsonError("ไม่พบคอมเมนต์ที่ต้องการตอบ", 404);
    parentId = parent.parent_id ?? parent.id;
    parentOwner = parent.user_id;
  }

  // กันสแปม: ไม่เกิน 10 คอมเมนต์ต่อ 10 นาที
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await service
    .from("lesson_comments").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", since);
  if ((count ?? 0) >= 10) return jsonError("คอมเมนต์ถี่เกินไป กรุณารอสักครู่", 429);

  const { data: row, error } = await service
    .from("lesson_comments")
    .insert({ video_id: video.id, user_id: auth.user.id, parent_id: parentId, body: text })
    .select("id")
    .single();
  if (error) return jsonError(error.message, 500);

  const { data: me } = await service.from("users").select("nickname, name, email").eq("id", auth.user.id).maybeSingle();
  const who = displayName(me);
  const { data: cls } = await service.from("classes").select("name").eq("id", video.class_id).maybeSingle();

  // แจ้งเจ้าของคอมเมนต์เมื่อมีคนตอบ
  if (parentOwner && parentOwner !== auth.user.id) {
    await service.from("notifications").insert({
      user_id: parentOwner,
      type: "comment",
      title: `${who} ตอบคอมเมนต์ของคุณ`,
      message: `บทเรียน "${video.title}": ${text.slice(0, 200)}`,
    });
  }
  await notifyDiscord(
    "comment",
    parentId ? "มีคนตอบคอมเมนต์ใต้คลิป" : "คอมเมนต์ใหม่ใต้คลิป",
    { จาก: `${who} (${me?.email ?? "-"})`, คอร์ส: cls?.name, บทเรียน: video.title, ข้อความ: text },
    `/classes/${video.class_id}?v=${video.id}`,
  );
  return NextResponse.json({ id: row.id });
}
