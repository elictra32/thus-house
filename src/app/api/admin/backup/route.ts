import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { runBackup } from "@/lib/backup";

export const maxDuration = 60;

// กดสำรองข้อมูลทันที (Head Admin — สิทธิ์ roles เพราะไฟล์มีข้อมูลสมาชิกทั้งหมด)
export const POST = adminRoute("roles", async (_req, { service, email }) => {
  const r = await runBackup("manual");
  if (!r.ok) return jsonError(r.error ?? "สำรองข้อมูลไม่สำเร็จ", 500);
  await logAdmin(service, email, "backup", "all", null, { bytes: r.bytes });
  return ok({ bytes: r.bytes, counts: r.counts });
});
