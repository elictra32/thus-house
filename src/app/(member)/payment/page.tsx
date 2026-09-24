import { requirePageUser } from "@/lib/auth";
import PaymentForm from "./PaymentForm";
import type { Class } from "@/types/database";

export const metadata = { title: "ชำระเงิน" };

export default async function PaymentPage({ searchParams }: { searchParams: { class?: string } }) {
  const { supabase, user } = await requirePageUser();
  const [{ data: classes }, { data: purchases }] = await Promise.all([
    supabase.from("classes").select("*").order("created_at"),
    supabase.from("purchases").select("class_id, status").eq("user_id", user.id).in("status", ["pending", "approved"]),
  ]);
  // ซ่อนคอร์สที่ซื้อแล้ว หรือมีสลิปรอตรวจอยู่
  const taken = new Set((purchases ?? []).map((p) => p.class_id));
  const payable = ((classes ?? []) as Class[]).filter((c) => !taken.has(c.id));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="kicker">PAYMENT</div>
      <h1 className="mb-8 mt-2 text-3xl font-bold">ชำระเงินและแนบสลิป</h1>
      <PaymentForm classes={payable} initialClassId={searchParams.class} />
    </div>
  );
}
