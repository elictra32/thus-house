import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { logMember } from "@/lib/member-log";

// Admin เปิดดูเลขบัตรประชาชนของสมาชิก — บันทึกทั้ง Audit Log และ Log ของสมาชิกคนนั้น
export const GET = adminRoute<{ id: string }>("members", async (_req, { service, email }, { id }) => {
  const { data } = await service.rpc("get_id_card", { uid: id });
  await logAdmin(service, email, "view_id_card", "users", id);
  await logMember(service, id, "view_id_card", { by: email });
  return NextResponse.json({ idCard: (data as string | null) ?? null }, { headers: { "Cache-Control": "no-store" } });
});
