import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { oneOf, str } from "@/lib/validate";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// body: { target: "self" | "all" | "class" | "role" | "status" | "users", classId?, roleId?, status?, userIds?, subject, message, notify? }
export const POST = adminRoute("email", async (req, { service, email, user }) => {
  const body = await readJson(req);
  const target = oneOf(body, "target", ["self", "all", "class", "role", "status", "users"] as const) ?? "all";
  const subject = str(body, "subject", { required: true, max: 200 })!;
  const message = str(body, "message", { required: true, max: 20000 })!;
  const alsoNotify = body.notify === true;

  let recipients: { id: string; email: string; name: string | null }[] = [];
  if (target === "class") {
    const classId = str(body, "classId", { required: true });
    const rows = check(
      await service.from("purchases").select("users(id, email, name)").eq("class_id", classId).eq("status", "approved"),
    ) as unknown as { users: { id: string; email: string; name: string | null } | null }[];
    const map = new Map(rows.filter((r) => r.users).map((r) => [r.users!.id, r.users!]));
    recipients = Array.from(map.values());
  } else if (target === "self") {
    recipients = check(await service.from("users").select("id, email, name").eq("id", user.id));
  } else if (target === "role") {
    const roleId = str(body, "roleId", { required: true })!;
    recipients = check(await service.from("users").select("id, email, name").eq("role", roleId));
  } else if (target === "users") {
    const ids = Array.isArray(body.userIds) ? body.userIds.filter((v): v is string => typeof v === "string").slice(0, 1000) : [];
    if (!ids.length) return jsonError("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");
    recipients = check(await service.from("users").select("id, email, name").in("id", ids));
  } else {
    let q = service.from("users").select("id, email, name");
    if (target === "status") q = q.eq("status", oneOf(body, "status", ["active", "inactive", "suspended"] as const) ?? "active");
    recipients = check(await q);
  }
  if (!recipients.length) return jsonError("ไม่พบผู้รับตามเงื่อนไขนี้");

  const apiKey = process.env.BREVO_API_KEY;
  let emailed = 0;
  if (apiKey) {
    const html = `<div style="font-family:sans-serif;line-height:1.7">${escapeHtml(message).replace(/\n/g, "<br>")}</div>`;
    // ส่งแยกทีละคน (messageVersions) ผู้รับจะไม่เห็นอีเมลกันเอง — Brevo รับได้ 1000 ต่อครั้ง
    for (let i = 0; i < recipients.length; i += 1000) {
      const batch = recipients.slice(i, i + 1000);
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: {
            email: process.env.BREVO_SENDER_EMAIL ?? "no-reply@thushouse.com",
            name: process.env.BREVO_SENDER_NAME ?? "THUS House",
          },
          subject,
          htmlContent: html,
          messageVersions: batch.map((r) => ({ to: [{ email: r.email, name: r.name ?? undefined }] })),
        }),
      });
      if (!res.ok) return jsonError(`ส่งอีเมลไม่สำเร็จ (Brevo ${res.status}): ${await res.text()}`, 502);
      emailed += batch.length;
    }
  } else if (!alsoNotify) {
    return jsonError("ยังไม่ได้ตั้งค่า BREVO_API_KEY — เลือก 'ส่งเป็นการแจ้งเตือนในเว็บ' แทนได้");
  }

  if (alsoNotify) {
    must(
      await service.from("notifications").insert(
        recipients.map((r) => ({ user_id: r.id, type: "broadcast", title: subject, message: message.slice(0, 500) })),
      ),
    );
  }

  await logAdmin(service, email, "email", "users", null, {
    target, subject, recipients: recipients.length, emailed, notified: alsoNotify,
  });
  return ok({ recipients: recipients.length, emailed, notified: alsoNotify });
});
