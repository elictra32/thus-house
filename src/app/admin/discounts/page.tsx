"use client";
import { useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal, { ConfirmModal } from "@/components/Modal";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { baht, formatDate, toBangkokDate } from "@/lib/utils";
import type { DiscountCode } from "@/types/database";

type Row = DiscountCode & { uses: number; saved: number };
type Cls = { id: string; name: string; price: number };
type Form = {
  code: string; description: string; kind: "percent" | "amount"; value: string; class_ids: string[];
  max_uses: string; once_per_user: boolean; expires_at: string; active: boolean;
};
const empty: Form = { code: "", description: "", kind: "percent", value: "", class_ids: [], max_uses: "", once_per_user: true, expires_at: "", active: true };

const valueText = (c: { kind: string; value: number }) => (c.kind === "percent" ? `${Number(c.value)}%` : baht(Number(c.value)));

// Admin → โค้ดส่วนลด: สร้าง / เปิด-ปิด / ดูจำนวนที่ใช้
export default function DiscountsPage() {
  const { data, error, loading, reload } = useApi<{ codes: Row[]; classes: Cls[] }>("/api/admin/discounts");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Row | null>(null);

  function open(r: Row | "new") {
    setEditing(r);
    setFormError("");
    setForm(r === "new" ? empty : {
      code: r.code, description: r.description ?? "", kind: r.kind, value: String(r.value), class_ids: r.class_ids,
      max_uses: r.max_uses ? String(r.max_uses) : "", once_per_user: r.once_per_user,
      expires_at: toBangkokDate(r.expires_at), active: r.active,
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      ...form,
      max_uses: form.max_uses || null,
      // หมดอายุสิ้นวันที่เลือก (เวลาไทย)
      expires_at: form.expires_at ? `${form.expires_at}T23:59:59+07:00` : null,
    };
    try {
      if (editing === "new") await api.post("/api/admin/discounts", body);
      else if (editing) await api.put(`/api/admin/discounts/${encodeURIComponent(editing.code)}`, body);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function toggle(r: Row) {
    await api.put(`/api/admin/discounts/${encodeURIComponent(r.code)}`, { active: !r.active });
    reload();
  }
  async function remove() {
    if (!toDelete) return;
    await api.del(`/api/admin/discounts/${encodeURIComponent(toDelete.code)}`);
    setToDelete(null);
    reload();
  }
  const className = (id: string) => data?.classes.find((c) => c.id === id)?.name ?? "(ลบแล้ว)";
  const expired = (r: Row) => !!r.expires_at && Date.parse(r.expires_at) < Date.now();

  return (
    <>
      <PageHeader
        title="โค้ดส่วนลด"
        subtitle="สมาชิกกรอกโค้ดตอนชำระเงิน → เห็นราคาสุดท้าย + รหัสยืนยัน · ทีมงานเห็นโค้ดและรหัสยืนยันตอนตรวจสลิป"
        action={<Button onClick={() => open("new")}>+ สร้างโค้ด</Button>}
      />
      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoading />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr><th className="th">โค้ด</th><th className="th">ส่วนลด</th><th className="th">ใช้กับ</th><th className="th">ใช้แล้ว</th><th className="th">หมดอายุ</th><th className="th">สถานะ</th><th className="th" /></tr>
            </thead>
            <tbody>
              {data?.codes.map((r) => (
                <tr key={r.code} className={!r.active || expired(r) ? "opacity-60" : undefined}>
                  <td className="td">
                    <p className="font-mono font-bold tracking-wide text-brand-light">{r.code}</p>
                    {r.description && <p className="text-xs text-muted">{r.description}</p>}
                  </td>
                  <td className="td font-bold">{valueText(r)}</td>
                  <td className="td text-sm">{r.class_ids.length ? r.class_ids.map(className).join(", ") : "ทุกคลาส"}</td>
                  <td className="td text-sm">
                    {r.uses}{r.max_uses ? ` / ${r.max_uses}` : ""} ครั้ง
                    {r.saved > 0 && <p className="text-xs text-muted">ลดไปรวม {baht(r.saved)}</p>}
                  </td>
                  <td className="td text-sm text-muted">{r.expires_at ? formatDate(r.expires_at) : "ไม่หมดอายุ"}</td>
                  <td className="td">
                    <button
                      onClick={() => toggle(r)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${r.active && !expired(r) ? "bg-green-500/20 text-green-300" : "bg-raised text-muted"}`}
                    >
                      {expired(r) ? "หมดอายุ" : r.active ? "● เปิดใช้" : "○ ปิดอยู่"}
                    </button>
                  </td>
                  <td className="td whitespace-nowrap text-right">
                    <Button size="sm" variant="ghost" onClick={() => open(r)}>แก้ไข</Button>{" "}
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(r)}>ลบ</Button>
                  </td>
                </tr>
              ))}
              {data?.codes.length === 0 && <tr><td className="td text-center text-muted" colSpan={7}>ยังไม่มีโค้ด — กด “+ สร้างโค้ด”</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "สร้างโค้ดส่วนลด" : `แก้ไขโค้ด ${form.code}`}>
        <form onSubmit={save} className="space-y-4">
          <Input
            label="โค้ด (A–Z, 0–9, -, _)"
            name="code"
            value={form.code}
            disabled={editing !== "new"}
            placeholder="เช่น EARLYBIRD"
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
          <Input label="คำอธิบาย (เห็นเฉพาะทีมงาน)" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <p className="label">ส่วนลด</p>
            <div className="flex gap-2">
              <div className="inline-flex shrink-0 rounded-[10px] bg-raised p-1 text-sm">
                {([["percent", "%"], ["amount", "บาท"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })} className={`rounded-lg px-3 py-1.5 ${form.kind === k ? "bg-brand font-bold text-white" : "text-muted"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <Input name="value" type="number" min={1} max={form.kind === "percent" ? 100 : undefined} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="flex-1" placeholder={form.kind === "percent" ? "เช่น 10" : "เช่น 5000"} />
            </div>
          </div>
          <div>
            <p className="label">ใช้กับคลาส (ไม่เลือก = ทุกคลาส)</p>
            <div className="flex flex-wrap gap-2">
              {data?.classes.map((c) => {
                const on = form.class_ids.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, class_ids: on ? form.class_ids.filter((x) => x !== c.id) : [...form.class_ids, c.id] })}
                    className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset ${on ? "bg-brand/25 font-bold ring-brand" : "text-muted ring-edge"}`}
                  >
                    {on ? "✓ " : ""}{c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="ใช้ได้กี่ครั้ง (ว่าง = ไม่จำกัด)" name="max_uses" type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            <Input label="หมดอายุวันที่ (ว่าง = ไม่หมด)" name="expires_at" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="[&_input]:[color-scheme:dark]" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.once_per_user} onChange={(e) => setForm({ ...form, once_per_user: e.target.checked })} />
            1 คนใช้ได้ครั้งเดียว
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            เปิดใช้งาน
          </label>
          {formError && <p className="rounded-lg bg-danger/15 p-3 text-sm text-red-300">{formError}</p>}
          <Button type="submit" loading={saving} className="w-full">บันทึก</Button>
        </form>
      </Modal>
      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="ลบโค้ดส่วนลด"
        message={`ลบโค้ด ${toDelete?.code}? (การซื้อที่เคยใช้โค้ดนี้ยังเก็บยอดส่วนลดไว้) · ถ้าแค่อยากหยุดใช้ กด “ปิดอยู่” แทนได้`}
        confirmLabel="ลบ"
      />
    </>
  );
}
