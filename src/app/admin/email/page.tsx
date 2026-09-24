import PageHeader from "@/components/admin/PageHeader";
import { requirePageAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import EmailForm from "./EmailForm";
import type { AdminLog } from "@/types/database";

export const metadata = { title: "ส่งอีเมล" };

export default async function EmailPage() {
  const { service } = await requirePageAdmin("email");
  const [{ data: classes }, { data: logs }] = await Promise.all([
    service.from("classes").select("id, name").order("created_at"),
    service.from("admin_logs").select("*").eq("action", "email").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <>
      <PageHeader title="ส่งอีเมลถึงสมาชิก" subtitle="ส่งผ่าน Brevo และ/หรือแจ้งเตือนในเว็บ" />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <EmailForm classes={classes ?? []} brevoReady={!!process.env.BREVO_API_KEY} />
        <div className="card h-fit overflow-hidden">
          <h3 className="p-5 font-bold">ประวัติการส่ง</h3>
          {(logs as AdminLog[] | null)?.map((l) => {
            const d = (l.details ?? {}) as Record<string, unknown>;
            return (
              <div key={l.id} className="border-t border-line px-5 py-3 text-sm">
                <p className="font-medium">{String(d.subject ?? "-")}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(l.created_at, true)} · {String(d.recipients ?? 0)} คน · โดย {l.admin_email}
                </p>
              </div>
            );
          })}
          {!logs?.length && <p className="td text-muted">ยังไม่เคยส่ง</p>}
        </div>
      </div>
    </>
  );
}
