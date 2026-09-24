"use client";
import { useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { Textarea } from "@/components/Input";
import StatusBadge from "@/components/StatusBadge";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { baht, cn, formatDate } from "@/lib/utils";
import type { PurchaseWithRelations } from "@/types/database";

type Row = PurchaseWithRelations & { slip_url: string | null };
const TABS = [
  { key: "pending", label: "รอตรวจสอบ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "rejected", label: "ถูกปฏิเสธ" },
  { key: "all", label: "ทั้งหมด" },
];

export default function PaymentsPage() {
  const [tab, setTab] = useState("pending");
  const { data, error, loading, reload } = useApi<{ purchases: Row[] }>(`/api/admin/purchases?status=${tab}`);
  const [selected, setSelected] = useState<Row | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  function open(row: Row) {
    setSelected(row);
    setRejecting(false);
    setReason("");
    setActionError("");
  }

  async function act(kind: "approve" | "reject") {
    if (!selected) return;
    if (kind === "reject" && !reason.trim()) return setActionError("กรุณาระบุเหตุผล");
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/purchases/${selected.id}/${kind}`, kind === "reject" ? { reason } : undefined);
      setSelected(null);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows = data?.purchases ?? [];

  return (
    <>
      <PageHeader title="อนุมัติการชำระเงิน" subtitle="ตรวจสลิปและเปิดสิทธิ์เข้าเรียน" />
      <div className="mb-5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm",
              tab === t.key ? "bg-brand font-semibold text-white" : "bg-raised text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-muted">ไม่มีรายการ</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <button key={p.id} onClick={() => open(p)} className="card overflow-hidden text-left transition hover:border-brand/50">
              <div className="h-44 bg-raised">
                {p.slip_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.slip_url} alt="สลิป" className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-subtle">ไม่มีสลิป</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.users?.name || p.users?.email}</p>
                    <p className="truncate text-xs text-muted">{p.classes?.name}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="font-bold">{baht(p.amount)}</span>
                  <span className="text-xs text-subtle">{formatDate(p.created_at, true)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="ตรวจสอบสลิป" wide>
        {selected && (
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <div className="rounded-xl bg-bg">
              {selected.slip_url ? (
                <a href={selected.slip_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.slip_url} alt="สลิป" className="mx-auto max-h-[70vh] rounded-xl" />
                </a>
              ) : (
                <p className="p-10 text-center text-muted">ไม่มีสลิป</p>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <Info label="สมาชิก" value={selected.users?.name || "-"} />
              <Info label="อีเมล" value={selected.users?.email || "-"} />
              <Info label="คอร์ส" value={selected.classes?.name || "-"} />
              <Info label="ยอดที่ต้องชำระ" value={baht(selected.amount)} />
              <Info label="วันที่อัปโหลด" value={formatDate(selected.created_at, true)} />
              <div><p className="text-xs text-muted">สถานะ</p><StatusBadge status={selected.status} /></div>
              {selected.approved_by && (
                <Info label="ดำเนินการโดย" value={`${selected.approved_by} · ${formatDate(selected.approved_at, true)}`} />
              )}
              {selected.rejection_reason && <Info label="เหตุผลที่ปฏิเสธ" value={selected.rejection_reason} />}

              {selected.status === "pending" && (
                <div className="space-y-2 border-t border-line pt-4">
                  {rejecting ? (
                    <>
                      <Textarea label="เหตุผลที่ปฏิเสธ" name="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ยอดโอนไม่ครบ / สลิปไม่ชัด" />
                      <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={() => setRejecting(false)}>ยกเลิก</Button>
                        <Button variant="danger" className="flex-1" loading={busy} onClick={() => act("reject")}>ยืนยันปฏิเสธ</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button className="w-full !bg-success hover:!bg-green-600" loading={busy} onClick={() => act("approve")}>✓ อนุมัติ</Button>
                      <Button variant="ghost" className="w-full" onClick={() => setRejecting(true)}>✕ ปฏิเสธ</Button>
                    </>
                  )}
                </div>
              )}
              {selected.status === "rejected" && (
                <Button variant="outline" className="w-full" loading={busy} onClick={() => act("approve")}>อนุมัติรายการนี้</Button>
              )}
              {actionError && <ErrorBox message={actionError} />}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="break-words">{value}</p>
    </div>
  );
}
