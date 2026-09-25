import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { oneOf, str } from "@/lib/validate";
import { unconfirmedUserIds } from "@/lib/email-confirm";
import { isAdminEmail } from "@/lib/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMentors, loadNotes } from "@/lib/member-notes";
import { HEAD, canAssign, canManage, roleRank, userRank } from "@/lib/role-rank";

type P = { id: string };

// บัญชีเจ้าของระบบแก้จากหน้านี้ไม่ได้ · Head Admin แก้ได้เฉพาะ Head Admin ด้วยกัน
async function guardTarget(service: SupabaseClient, id: string, myRank: number) {
  const { data: target } = await service.from("users").select("email").eq("id", id).maybeSingle();
  if (!target) return { target: null, error: null, rank: 0 };
  if (isAdminEmail(target.email)) return { target, error: jsonError("บัญชีเจ้าของระบบแก้ไขหรือลบจากหน้านี้ไม่ได้", 403), rank: HEAD };
  const rank = await userRank(service, id);
  if (rank >= HEAD && myRank < HEAD) return { target, error: jsonError("แก้ไขบัญชี Head Admin ได้เฉพาะ Head Admin", 403), rank };
  return { target, error: null, rank };
}

export const GET = adminRoute<P>("members", async (_req, { service, user: me, perms }, { id }) => {
  const [user, purchases, watched, videoLogs, extraRoles, notes, memberLogs, mentors] = await Promise.all([
    service.from("users").select("*, roles!users_role_fkey(name)").eq("id", id).maybeSingle(),
    service.from("purchases").select("*, classes(id, name, videos_count)").eq("user_id", id).order("created_at", { ascending: false }),
    service.from("watched_videos").select("video_id, videos(class_id)").eq("user_id", id),
    // ประวัติเปิดบทเรียน 100 ครั้งล่าสุด (บันทึกโดย /api/videos/[id]/source)
    service.from("video_access_logs").select("id, blocked, ip, created_at, videos(title), classes(name)")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(100),
    service.from("user_roles").select("role_id").eq("user_id", id),
    loadNotes(service, id),
    service.from("member_logs").select("id, action, details, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(200),
    loadMentors(service, id),
  ]);
  // เวลาใช้งาน 30 วัน (จาก ping ออนไลน์)
  const { data: pres } = await service.from("presence_sessions").select("started_at, last_seen")
    .eq("user_id", id).gte("last_seen", new Date(Date.now() - 30 * 86400_000).toISOString());
  const presence = {
    visits: pres?.length ?? 0,
    seconds: (pres ?? []).reduce((s, p) => s + Math.max(60, (Date.parse(p.last_seen) - Date.parse(p.started_at)) / 1000), 0),
    lastSeen: (pres ?? []).reduce<string | null>((m, p) => (!m || p.last_seen > m ? p.last_seen : m), null),
  };
  if (!user.data) return jsonError("ไม่พบสมาชิก", 404);
  delete (user.data as Record<string, unknown>).id_card_enc; // เปิดดูเลขบัตรผ่านปุ่ม "แสดง" เท่านั้น (บันทึก Log)

  const watchedByClass: Record<string, number> = {};
  for (const w of (watched.data ?? []) as unknown as { videos: { class_id: string } | null }[]) {
    const cid = w.videos?.class_id;
    if (cid) watchedByClass[cid] = (watchedByClass[cid] ?? 0) + 1;
  }
  const emailConfirmed = !(await unconfirmedUserIds(service)).has(id);
  const [myRank, targetRank] = await Promise.all([userRank(service, me.id, me.email), userRank(service, id)]);
  const canChangeRole = perms.has("roles") && me.id !== id && !isAdminEmail(user.data.email) && canManage(myRank, targetRank);
  return ok({
    user: user.data,
    purchases: check(purchases),
    watchedByClass,
    emailConfirmed,
    isOwner: isAdminEmail(user.data.email),
    canChangeRole,
    myRank,
    videoLogs: videoLogs.data ?? [],
    extraRoles: (extraRoles.data ?? []).map((r) => r.role_id),
    notes,
    memberLogs: memberLogs.data ?? [],
    mentors,
    presence,
  });
});

export const PUT = adminRoute<P>("members", async (req, { service, email, user: me, perms }, { id }) => {
  const body = await readJson(req);
  const myRank = await userRank(service, me.id, me.email);
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
  if ("discord_id" in body) {
    // Discord ID = กดอนุมัติใน Discord ในนามบัญชีนี้ → ให้เฉพาะคนที่จัดการ Role ได้
    if (!perms.has("roles")) return jsonError("ไม่มีสิทธิ์แก้ Discord ID", 403);
    const discordId = str(body, "discord_id", { max: 20 });
    if (discordId && !/^\d{17,20}$/.test(discordId)) return jsonError("Discord ID ต้องเป็นตัวเลข 17–20 หลัก");
    if (discordId) {
      const { data: taken } = await service.from("users").select("email").eq("discord_id", discordId).neq("id", id).maybeSingle();
      if (taken) return jsonError(`Discord ID นี้ผูกกับ ${taken.email} อยู่แล้ว`);
    }
    update.discord_id = discordId;
  }
  // ปลดล็อกอุปกรณ์: เครื่องเดิมถูกออกจากระบบเมื่อเปิดหน้าถัดไป → ล็อกอินเครื่องใหม่ได้ทันที
  if (body.unlock_device === true) {
    update.active_session = null;
    update.active_session_seen = null;
  }
  if ("membership_end" in body) update.membership_end = str(body, "membership_end");
  if ("role" in body) {
    if (!perms.has("roles")) return jsonError("ไม่มีสิทธิ์เปลี่ยน Role", 403);
    if (id === me.id) return jsonError("เปลี่ยน Role ของตัวเองไม่ได้");
    const role = str(body, "role", { required: true })!;
    const { data: exists } = await service.from("roles").select("id").eq("id", role).maybeSingle();
    if (!exists) return jsonError("ไม่พบ Role นี้");
    if (!canAssign(myRank, role)) return jsonError("ให้ Role ที่เท่ากับหรือสูงกว่าตัวเองไม่ได้", 403);
    update.role = role;
  }
  // Role เพิ่มเติม (1 คนหลาย Role)
  let extraRoles: string[] | null = null;
  if ("extra_roles" in body) {
    if (!perms.has("roles")) return jsonError("ไม่มีสิทธิ์เปลี่ยน Role", 403);
    if (id === me.id) return jsonError("เปลี่ยน Role ของตัวเองไม่ได้");
    const list = Array.isArray(body.extra_roles) ? body.extra_roles.filter((r): r is string => typeof r === "string") : [];
    const { data: valid } = await service.from("roles").select("id").in("id", list.length ? list : ["-"]);
    extraRoles = (valid ?? []).map((r) => r.id).filter((r) => r !== "member");
    // Role เดิมที่ให้ไม่ได้ (สูงกว่า/เท่าตัวเอง) ห้ามเพิ่มหรือถอด
    const { data: before } = await service.from("user_roles").select("role_id").eq("user_id", id);
    const old = (before ?? []).map((r) => r.role_id);
    const touched = [...extraRoles.filter((r) => !old.includes(r)), ...old.filter((r) => !extraRoles!.includes(r))];
    if (touched.some((r) => !canAssign(myRank, r))) return jsonError("ให้/ถอด Role ที่เท่ากับหรือสูงกว่าตัวเองไม่ได้", 403);
  }
  if (!Object.keys(update).length && !extraRoles) return jsonError("ไม่มีข้อมูลที่จะแก้ไข");
  // บัญชีเจ้าของระบบแก้จากหน้านี้ไม่ได้ ยกเว้น Discord ID (เจ้าของต้องผูกเพื่อกดอนุมัติใน Discord)
  const onlyDiscord = Object.keys(update).every((k) => k === "discord_id");
  const guard = await guardTarget(service, id, myRank);
  if (guard.error && !onlyDiscord) return guard.error;
  if (("role" in update || extraRoles) && !canManage(myRank, guard.rank)) return jsonError("เปลี่ยน Role ของคนที่ระดับเท่ากันหรือสูงกว่าไม่ได้", 403);

  if (extraRoles) {
    must(await service.from("user_roles").delete().eq("user_id", id));
    if (extraRoles.length) must(await service.from("user_roles").insert(extraRoles.map((role_id) => ({ user_id: id, role_id }))));
    await logAdmin(service, email, "update", "user_roles", id, { extra_roles: extraRoles });
  }
  if (!Object.keys(update).length) return ok();
  const user = check(await service.from("users").update(update).eq("id", id).select().single());
  await logAdmin(service, email, "update", "users", id, update);
  return ok({ user });
});

export const DELETE = adminRoute<P>("members", async (_req, { service, email, user }, { id }) => {
  if (id === user.id) return jsonError("ลบบัญชีตัวเองไม่ได้");
  const { target, error: denied } = await guardTarget(service, id, await userRank(service, user.id, user.email));
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
