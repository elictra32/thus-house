"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { Select } from "@/components/Input";
import { api } from "@/lib/api-client";
import { BANK, SLIP_MAX_BYTES, SLIP_TYPES, baht } from "@/lib/utils";
import type { Class } from "@/types/database";

export default function PaymentForm({ classes, initialClassId }: { classes: Class[]; initialClassId?: string }) {
  const [classId, setClassId] = useState(
    classes.some((c) => c.id === initialClassId) ? initialClassId! : classes[0]?.id ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const selected = classes.find((c) => c.id === classId);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const f = e.target.files?.[0] ?? null;
    if (f && !SLIP_TYPES.includes(f.type)) {
      e.target.value = "";
      return setError("รองรับเฉพาะไฟล์ PNG, JPG, JPEG");
    }
    if (f && f.size > SLIP_MAX_BYTES) {
      e.target.value = "";
      return setError("ไฟล์ใหญ่เกิน 4MB");
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!classId) return setError("กรุณาเลือกคอร์ส");
    if (!file) return setError("กรุณาแนบสลิป");
    const form = new FormData();
    form.append("class_id", classId);
    form.append("slip", file);
    setLoading(true);
    try {
      await api.post("/api/purchases/upload-slip", form);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return (
      <div className="card p-10 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="mt-4 text-2xl font-bold">ส่งสลิปเรียบร้อย</h2>
        <p className="mt-2 text-muted">ทีมงานจะตรวจสอบและเปิดสิทธิ์ให้ภายในเวลาทำการ คุณจะได้รับการแจ้งเตือนเมื่ออนุมัติ</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/dashboard" className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold">กลับ Dashboard</Link>
          <Link href="/profile" className="rounded-[10px] border border-edge px-4 py-2.5 text-sm font-bold">ดูสถานะ</Link>
        </div>
      </div>
    );

  if (!classes.length)
    return (
      <div className="card p-10 text-center text-muted">
        ไม่มีคอร์สที่รอชำระเงิน —{" "}
        <Link href="/dashboard" className="text-brand-light underline">กลับ Dashboard</Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="card space-y-6 p-6">
        <Select label="1. เลือกคอร์ส" name="class" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {baht(c.price)}
            </option>
          ))}
        </Select>

        <div>
          <p className="label">2. โอนเงินเข้าบัญชี</p>
          <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4 text-sm leading-7">
            <div>{BANK.name}</div>
            <div>
              เลขที่บัญชี <b className="text-lg tracking-wide">{BANK.account}</b>
            </div>
            <div>ชื่อบัญชี <b>{BANK.owner}</b></div>
            {selected && <div className="mt-1">ยอดโอน <b className="text-brand-light">{baht(selected.price)}</b></div>}
          </div>
        </div>

        <div>
          <label htmlFor="slip" className="label">3. แนบสลิป (PNG, JPG ไม่เกิน 4MB)</label>
          <input
            id="slip"
            type="file"
            accept="image/png,image/jpeg"
            onChange={onFile}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-raised file:px-4 file:py-2 file:font-semibold file:text-ink"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="ตัวอย่างสลิป" className="mt-4 max-h-80 rounded-xl border border-edge" />
          )}
        </div>

        {error && <p className="rounded-lg bg-danger/15 p-3 text-sm text-red-300">{error}</p>}
      </div>

      <aside className="card h-fit p-6">
        <h3 className="font-bold">สรุปคำสั่งซื้อ</h3>
        {selected && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted">{selected.name}</span>
              <span>{baht(selected.price)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
              <span>ยอดชำระ</span>
              <span>{baht(selected.price)}</span>
            </div>
          </div>
        )}
        <Button type="submit" loading={loading} className="mt-6 w-full">
          ยืนยันการชำระเงิน
        </Button>
        <p className="mt-3 text-xs text-subtle">หลังอนุมัติ เรียนได้ตลอดชีพ</p>
      </aside>
    </form>
  );
}
