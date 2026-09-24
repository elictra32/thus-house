import PageHeader, { StatCard } from "@/components/admin/PageHeader";
import { BarSeries, ChartCard, Donut, LineSeries } from "@/components/admin/Charts";
import { requirePageAdmin } from "@/lib/auth";
import { computeAnalytics } from "@/lib/analytics";
import { baht, formatDate } from "@/lib/utils";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { service } = await requirePageAdmin();
  const a = await computeAnalytics(service);

  return (
    <>
      <PageHeader title="Analytics" subtitle="การเติบโตและพฤติกรรมสมาชิก" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="เข้าใช้ใน 30 วัน" value={a.activity.activeLast30d} hint={`จากทั้งหมด ${a.totals.users} คน`} />
        <StatCard label="ไม่ได้เข้าใช้ใน 30 วัน" value={a.activity.inactiveLast30d} />
        <StatCard label="Churn rate" value={`${a.activity.churnRate}%`} hint="สมาชิกสถานะ inactive / suspended" />
        <StatCard label="รายได้เดือนนี้" value={baht(a.monthly.at(-1)?.revenue ?? 0)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="จำนวนสมาชิกสะสม (12 เดือน)">
          <LineSeries data={a.monthly} x="month" y="users" />
        </ChartCard>
        <ChartCard title="รายได้รายเดือน">
          <BarSeries data={a.monthly} x="month" y="revenue" money />
        </ChartCard>
        <ChartCard title="ความนิยมของคอร์ส (จำนวนผู้เรียน)">
          <BarSeries data={a.classStats} x="name" y="students" />
        </ChartCard>
        <ChartCard title="สถานะการชำระเงิน (โอนผ่านธนาคาร)">
          <Donut data={a.paymentStatus} />
        </ChartCard>
      </div>
      <div className="card mt-6 overflow-hidden">
        <h3 className="p-5 font-bold">เข้าสู่ระบบล่าสุด</h3>
        <table className="w-full">
          <thead><tr><th className="th">สมาชิก</th><th className="th">อีเมล</th><th className="th">เข้าสู่ระบบล่าสุด</th></tr></thead>
          <tbody>
            {a.activity.recentLogins.map((u) => (
              <tr key={u.email}>
                <td className="td">{u.name}</td>
                <td className="td text-muted">{u.email}</td>
                <td className="td">{formatDate(u.last_login_at, true)}</td>
              </tr>
            ))}
            {!a.activity.recentLogins.length && <tr><td className="td text-muted" colSpan={3}>ยังไม่มีข้อมูล</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
