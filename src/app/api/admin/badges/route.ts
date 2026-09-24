import { NextResponse } from "next/server";
import { getPermissions, requireApiUser } from "@/lib/auth";
import { unconfirmedUserIds } from "@/lib/email-confirm";
import { createServiceSupabase } from "@/lib/supabase-server";
import { supabasePlan } from "@/lib/usage-plans";

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
  // Usage: นับรายการที่ใช้เกิน 60% ของแพ็กเกจ Supabase
  let usage = 0;
  if (perms.has("dashboard")) {
    const { data } = await service.rpc("admin_usage");
    const u = data as { db_bytes: number; storage_bytes: number; mau: number } | null;
    const p = supabasePlan();
    if (u) usage = [u.db_bytes / p.dbBytes, u.storage_bytes / p.storageBytes, u.mau / p.mau].filter((r) => r >= 0.6).length;
  }
  return NextResponse.json(
    { "/admin/payments": payments, "/admin/messages": messages, "/admin/members": members, "/admin/usage": usage },
    { headers: { "Cache-Control": "no-store" } },
  );
}
