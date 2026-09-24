import Link from "next/link";
import PageHeader, { StatCard } from "@/components/admin/PageHeader";
import { ChartCard, Donut, LineSeries } from "@/components/admin/Charts";
import { requirePageAdmin } from "@/lib/auth";
import { computeAnalytics } from "@/lib/analytics";
import { unconfirmedUserIds } from "@/lib/email-confirm";
import { baht } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const { service, perms } = await requirePageAdmin();
  const unconfirmed = perms.has("members") ? await unconfirmedUserIds(service) : new Set<string>();
  const banner = unconfirmed.size > 0 && (
    <Link
      href="/admin/members?status=unconfirmed"
      className="mb-6 block rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-amber-200"
    >
      มีสมาชิกรอยืนยันอีเมล {unconfirmed.size} คน — คลิกเพื่อยืนยันบัญชี →
    </Link>
  );

  // Role ที่ไม่มีสิทธิ์ดูตัวเลขภาพรวม → แสดงแค่หน้าต้อนรับ ใช้เมนูด้านซ้ายตามสิทธิ์
  if (!perms.has("dashboard")) {
    return (
      <>
        <PageHeader title="Admin" subtitle="เลือกเมนูด้านซ้ายตามสิทธิ์ของคุณ" />
        {banner}
      </>
    );
  }

  const a = await computeAnalytics(service);

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="ภาพรวมของ THUS House" />
      {banner}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="สมาชิกทั้งหมด" value={a.totals.users.toLocaleString()} />
        <StatCard label="รายได้รวม" value={baht(a.totals.revenue)} />
        <StatCard label="การซื้อที่อนุมัติ" value={a.totals.purchases.toLocaleString()} />
        <Link href="/admin/payments" className="block">
          <StatCard
            label="รออนุมัติ"
            value={<span className={a.totals.pending ? "text-amber-300" : ""}>{a.totals.pending}</span>}
            hint={a.totals.pending ? "คลิกเพื่อตรวจสลิป →" : undefined}
          />
        </Link>
        <StatCard label="คอร์สยอดนิยม" value={<span className="text-lg">{a.totals.popularClass}</span>} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ChartCard title="รายได้รายวัน (30 วันล่าสุด)">
          <LineSeries data={a.daily} x="date" y="revenue" money />
        </ChartCard>
        <ChartCard title="สัดส่วนผู้เรียนแต่ละคอร์ส">
          <Donut data={a.classStats.map((c) => ({ name: c.name, value: c.students }))} />
        </ChartCard>
      </div>
    </>
  );
}
