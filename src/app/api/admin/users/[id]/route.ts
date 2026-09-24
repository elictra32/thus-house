import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { oneOf, str } from "@/lib/validate";
import { unconfirmedUserIds } from "@/lib/email-confirm";
import { isAdminEmail } from "@/lib/admin";
import type { Permission } from "@/lib/permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

type P = { id: string };

// บัญชีที่มีสิทธิ์จัดการ Role (Head Admin / เจ้าของระบบ) — คนที่ไม่มีสิทธิ์ roles แก้หรือลบไม่ได้
async function guardTarget(service: SupabaseClient, id: string, perms: Set<Permission>) {
  const { data: target } = await service.from("users").select("email, roles(permissions)").eq("id", id).maybeSingle();
  if (!target) return { target: null, error: null };
  if (isAdminEmail(target.email)) return { target, error: jsonError("บัญชีเจ้าของระบบแก้ไขหรือลบจากหน้านี้ไม่ได้", 403) };
  const privileged = ((target.roles as unknown as { permissions: string[] } | null)?.permissions ?? []).includes("roles");
  if (privileged && !perms.has("roles")) return { target, error: jsonError("ไม่มีสิทธิ์แก้ไขบัญชี Head Admin", 403) };
  return { target, error: null };
}

export const GET = adminRoute<P>("members", async (_req, { service }, { id }) => {
  const [user, purchases, watched, videoLogs] = await Promise.all([
    service.from("users").select("*, roles(name)").eq("id", id).maybeSingle(),
    service.from("purchases").select("*, classes(id, name, videos_count)").eq("user_id", id).order("created_at", { ascending: false }),
    service.from("watched_videos").select("video_id, videos(class_id)").eq("user_id", id),
    // ประวัติเปิดบทเรียน 100 ครั้งล่าสุด (บันทึกโดย /api/videos/[id]/source)
    service.from("video_access_logs").select("id, blocked, ip, created_at, videos(title), classes(name)")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (!user.data) return jsonError("ไม่พบสมาชิก", 404);

  const watchedByClass: Record<string, number> = {};
  for (const w of (watched.data ?? []) as unknown as { videos: { class_id: string } | null }[]) {
    const cid = w.videos?.class_id;
    if (cid) watchedByClass[cid] = (watchedByClass[cid] ?? 0) + 1;
  }
  const emailConfirmed = !(await unconfirmedUserIds(service)).has(id);
  return ok({
    user: user.data,
    purchases: check(purchases),
    watchedByClass,
    emailConfirmed,
    isOwner: isAdminEmail(user.data.email),
    videoLogs: videoLogs.data ?? [],
  });
});

export const PUT = adminRoute<P>("members", async (req, { service, email, user: me, perms }, { id }) => {
  const body = await readJson(req);
  const update: Record<string, unknown> = {};
  const status = oneOf(body, "status", ["active", "inactive", "suspended"] as const);
  if (status) update.status = status;
  if ("name" in body) update.name = str(body, "name", { max: 100 });
  if ("phone" in body) update.phone = str(body, "phone", { max: 20 });
  if ("nickname" in body) update.nickname = str(body, "nickname", { max: 50 });
  if ("member_code" in body) {
    const code = str(body, "member_code", { max: 30 });
    if (code) {
      const { data: taken } = await service.from("users").select("id").ilike("member_code", code.replace(/[%_\\]/g, "\\$&")).neq("id", id).maybeSingle();
      if (taken) return jsonError(`รหัสสมาชิก ${code} ถูกใช้แล้ว`);
    }
    update.member_code = code;
  }
  if ("membership_end" in body) update.membership_end = str(body, "membership_end");
  if ("role" in body) {
    if (!perms.has("roles")) return jsonError("ไม่มีสิทธิ์เปลี่ยน Role", 403);
    if (id === me.id) return jsonError("เปลี่ยน Role ของตัวเองไม่ได้");
    const role = str(body, "role", { required: true })!;
    const { data: exists } = await service.from("roles").select("id").eq("id", role).maybeSingle();
    if (!exists) return jsonError("ไม่พบ Role นี้");
    update.role = role;
  }
  if (!Object.keys(update).length) return jsonError("ไม่มีข้อมูลที่จะแก้ไข");
  const guard = await guardTarget(service, id, perms);
  if (guard.error) return guard.error;

  const user = check(await service.from("users").update(update).eq("id", id).select().single());
  await logAdmin(service, email, "update", "users", id, update);
  return ok({ user });
});

export const DELETE = adminRoute<P>("members", async (_req, { service, email, user, perms }, { id }) => {
  if (id === user.id) return jsonError("ลบบัญชีตัวเองไม่ได้");
  const { target, error: denied } = await guardTarget(service, id, perms);
  if (denied) return denied;
  // ลบจาก auth.users → cascade ลบ users, purchases, watched_videos, notifications
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    // กรณีไม่มีใน auth แล้ว ลบแถวใน users ตรงๆ
    must(await service.from("users").delete().eq("id", id));
  }
  await logAdmin(service, email, "delete", "users", id, { email: target?.email });
  return ok();
});
