import { requirePageUser } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import LogoutButton from "@/components/LogoutButton";
import { baht, formatDate } from "@/lib/utils";
import ProfileFields from "./ProfileFields";
import Link from "next/link";
import { missingProfile } from "@/lib/member-profile";
import type { Purchase } from "@/types/database";

export const metadata = { title: "โปรไฟล์" };

export default async function ProfilePage({ searchParams }: { searchParams: { complete?: string; next?: string } }) {
  const { supabase, user, profile } = await requirePageUser();
  const { data } = await supabase
    .from("purchases")
    .select("*, classes(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const missing = missingProfile(profile);
  // กันพาไปเว็บอื่น: รับเฉพาะ path ภายใน
  const nextUrl = searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//") ? searchParams.next : "/payment";
  const purchases = (data ?? []) as (Purchase & { classes: { name: string } | null })[];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="kicker">PROFILE</div>
          <h1 className="mt-2 text-3xl font-bold">โปรไฟล์ของฉัน</h1>
        </div>
        <LogoutButton />
      </div>

      {/* มาจากหน้าชำระเงิน: บอกว่าเหลืออะไร / ครบแล้วพากลับไปจ่ายต่อ */}
      {searchParams.complete === "1" && (
        missing.length ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <b>กรอกข้อมูลให้ครบก่อนสมัครคลาส</b> — เหลือ: {missing.map((f) => f.label).join(" · ")}
            <p className="mt-1 text-xs text-amber-200/80">ช่องที่ยังขาดมีป้าย “จำเป็น” สีส้ม</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-400/30 bg-green-500/10 p-4">
            <p className="text-sm text-green-200"><b>✓ ข้อมูลครบแล้ว</b> — สมัครคลาสได้เลย</p>
            <Link href={nextUrl} className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">ไปชำระเงินต่อ →</Link>
          </div>
        )
      )}

      <ProfileFields
        missing={searchParams.complete === "1" ? missing.map((f) => f.key) : []}
        p={{
          name: profile?.name ?? "",
          nickname: profile?.nickname ?? "",
          phone: profile?.phone ?? "",
          email: user.email ?? "",
          memberCode: profile?.member_code ?? "",
          avatar: profile?.avatar_url ?? "",
          birthDate: profile?.birth_date ?? "",
          address: profile?.address ?? "",
          idCardLast4: profile?.id_card_last4 ?? "",
          markets: profile?.trading_markets ?? [],
          years: profile?.trading_years ?? "",
          goal: profile?.learning_goal ?? "",
        }}
      />

      <section className="card overflow-hidden">
        <h2 className="p-5 text-lg font-bold">ประวัติการสั่งซื้อ</h2>
        {purchases.length === 0 ? (
          <p className="td text-muted">ยังไม่มีรายการ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">คอร์ส</th>
                  <th className="th">ยอด</th>
                  <th className="th">วันที่</th>
                  <th className="th">สถานะ</th>
                  <th className="th">เรียนได้ถึง</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="td">{p.classes?.name ?? "-"}</td>
                    <td className="td">{baht(p.amount)}</td>
                    <td className="td">{formatDate(p.created_at)}</td>
                    <td className="td">
                      <StatusBadge status={p.status} />
                      {p.status === "rejected" && p.rejection_reason && (
                        <p className="mt-1 text-xs text-red-300">{p.rejection_reason}</p>
                      )}
                    </td>
                    <td className="td text-muted">
                      {p.status !== "approved" ? "-" : p.expires_at ? formatDate(p.expires_at) : "ไม่หมดอายุ"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
