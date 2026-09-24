import { NextResponse } from "next/server";
import { getPermissions, requireApiUser } from "@/lib/auth";
import { unconfirmedUserIds } from "@/lib/email-confirm";
import { createServiceSupabase } from "@/lib/supabase-server";

// ตัวเลขแจ้งเตือนสีส้มบนเมนู Admin — นับเฉพาะเมนูที่ผู้ใช้มีสิทธิ์
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const perms = await getPermissions(auth.user.id, auth.user.email);
  if (!perms.size) return NextResponse.json({}, { status: 403 });
  const service = createServiceSupabase();

  const [payments, messages, members] = await Promise.all([
    perms.has("payments")
      ? service.from("purchases").select("id", { count: "exact", head: true }).eq("status", "pending").then((r) => r.count ?? 0)
      : 0,
    perms.has("community")
      ? service.from("instructor_messages").select("id", { count: "exact", head: true }).eq("status", "new").then((r) => r.count ?? 0)
      : 0,
    perms.has("members") ? unconfirmedUserIds(service).then((s) => s.size).catch(() => 0) : 0,
  ]);
  return NextResponse.json(
    { "/admin/payments": payments, "/admin/messages": messages, "/admin/members": members },
    { headers: { "Cache-Control": "no-store" } },
  );
}
