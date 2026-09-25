import { requirePageUser } from "@/lib/auth";
import { isActivePurchase } from "@/lib/utils";
import PaymentForm from "./PaymentForm";
import ProfileGate from "./ProfileGate";
import { missingProfile } from "@/lib/member-profile";
import type { Class } from "@/types/database";

export const metadata = { title: "ชำระเงิน" };

export default async function PaymentPage({ searchParams }: { searchParams: { class?: string } }) {
  const { supabase, user, profile } = await requirePageUser();
  const [{ data: classes }, { data: purchases }] = await Promise.all([
    supabase.from("classes").select("*").order("created_at"),
    supabase.from("purchases").select("class_id, status, expires_at").eq("user_id", user.id).in("status", ["pending", "approved"]),
  ]);
  // ซ่อนคอร์สที่ยังมีสิทธิ์เรียนอยู่ หรือมีสลิปรอตรวจอยู่ (หมดอายุแล้วซื้อต่อได้)
  const taken = new Set((purchases ?? []).filter((p) => p.status === "pending" || isActivePurchase(p)).map((p) => p.class_id));
  // ข้อมูลโปรไฟล์ต้องครบก่อนซื้อคลาส
  const missing = missingProfile(profile);
  const payable = ((classes ?? []) as Class[]).filter((c) => !taken.has(c.id));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="kicker">PAYMENT</div>
      <h1 className="mb-8 mt-2 text-3xl font-bold">ชำระเงินและแนบสลิป</h1>
      {missing.length ? (
        <ProfileGate missing={missing.map((f) => f.key)} next={`/payment${searchParams.class ? `?class=${encodeURIComponent(searchParams.class)}` : ""}`} />
      ) : (
        <PaymentForm classes={payable} initialClassId={searchParams.class} />
      )}
    </div>
  );
}
