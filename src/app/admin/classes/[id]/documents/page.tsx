"use client";
import { useState } from "react";
import Link from "next/link";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal, { ConfirmModal } from "@/components/Modal";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { docKind, isGoogleLink } from "@/lib/class-docs";
import type { Class, ClassDocument } from "@/types/database";

type Form = { title: string; url: string };
const empty: Form = { title: "", url: "" };

// เอกสารประกอบคลาส = ลิงก์ Google Drive / Docs / Sheets / Slides · สมาชิกที่มีสิทธิ์เรียนคลาสนี้เปิดได้
export default function ClassDocumentsAdmin({ params }: { params: { id: string } }) {
  const classRes = useApi<{ class: Class }>(`/api/classes/${params.id}`);
  const { data, error, loading, reload, setData } = useApi<{ docs: ClassDocument[] }>(`/api/admin/class-docs?classId=${params.id}`);
  const [editing, setEditing] = useState<ClassDocument | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<ClassDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderError, setOrderError] = useState("");

  const docs = data?.docs ?? [];

  function open(d: ClassDocument | "new") {
    setEditing(d);
    setFormError("");
    setForm(d === "new" ? empty : { title: d.title, url: d.url });
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setFormError("กรุณากรอกชื่อเอกสาร");
    if (!/^https?:\/\//.test(form.url.trim())) return setFormError("กรุณาวางลิงก์ Google Drive ให้ถูกต้อง");
    setSaving(true);
    setFormError("");
    try {
      const body = { title: form.title, url: form.url.trim() };
      if (editing === "new") await api.post("/api/admin/class-docs", { ...body, class_id: params.id });
      else if (editing) await api.put(`/api/admin/class-docs/${editing.id}`, body);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/api/admin/class-docs/${toDelete.id}`);
      setToDelete(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...docs];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setData({ docs: next });
    setOrderError("");
    api.put("/api/admin/class-docs/reorder", { classId: params.id, ids: next.map((d) => d.id) })
      .catch((err) => { setOrderError((err as Error).message); reload(); });
  }

  return (
    <>
      <Link href="/admin/classes" className="text-sm text-muted hover:text-ink">← คอร์สทั้งหมด</Link>
      <PageHeader
        title={classRes.data?.class.name ?? "เอกสารประกอบคลาส"}
        subtitle={`เอกสารประกอบคลาส ${docs.length} รายการ · สมาชิกที่มีสิทธิ์เรียนคลาสนี้เปิดได้`}
        action={<Button onClick={() => open("new")}>+ เพิ่มเอกสาร</Button>}
      />
      {(error || orderError) && <div className="mb-4"><ErrorBox message={error || orderError} /></div>}
      {loading ? (
        <PageLoading />
      ) : (
        <ol className="card divide-y divide-line">
          {docs.map((d, i) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-sm text-muted">{i + 1}</span>
              <span className="w-16 shrink-0 rounded-md bg-brand/15 py-1 text-center text-[11px] font-bold text-brand-light">{docKind(d.url)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.title}</p>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-subtle hover:text-brand-light">{d.url}</a>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-muted hover:bg-raised disabled:opacity-30" aria-label="เลื่อนขึ้น">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === docs.length - 1} className="rounded px-2 py-1 text-muted hover:bg-raised disabled:opacity-30" aria-label="เลื่อนลง">↓</button>
                <Button size="sm" variant="ghost" onClick={() => open(d)}>แก้ไข</Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(d)}>ลบ</Button>
              </div>
            </li>
          ))}
          {!docs.length && <li className="p-10 text-center text-muted">ยังไม่มีเอกสาร — กด “+ เพิ่มเอกสาร” แล้ววางลิงก์ Google Drive</li>}
        </ol>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "เพิ่มเอกสาร" : "แก้ไขเอกสาร"}>
        <form onSubmit={save} className="space-y-4">
          <Input
            label="ลิงก์ Google Drive / Docs / Sheets / Slides *"
            name="url"
            placeholder="https://drive.google.com/file/d/.../view"
            value={form.url}
            onChange={set("url")}
          />
          {form.url.trim() && /^https?:\/\//.test(form.url.trim()) && !isGoogleLink(form.url.trim()) && (
            <p className="-mt-2 text-xs text-amber-300">ไม่ใช่ลิงก์ Google Drive — ใช้ได้ แต่ตรวจให้แน่ใจว่าสมาชิกเปิดได้</p>
          )}
          <Input label="ชื่อเอกสาร *" name="title" placeholder="เช่น Trade Record Template" value={form.title} onChange={set("title")} />
          <p className="text-xs leading-relaxed text-subtle">
            ใน Google Drive กด <b>แชร์</b> → ตั้งเป็น <b>&quot;ทุกคนที่มีลิงก์&quot;</b> (ผู้มีสิทธิ์อ่าน) แล้วคัดลอกลิงก์มาวาง
            <br />
            ลิงก์จริงไม่แสดงในหน้าเว็บ สมาชิกเปิดผ่านปุ่มที่ตรวจสิทธิ์เรียนก่อนทุกครั้ง
          </p>
          {formError && <ErrorBox message={formError} />}
          <Button type="submit" loading={saving} className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="ลบเอกสาร"
        message={`ลบ "${toDelete?.title}" ออกจากคลาส (ไฟล์ใน Google Drive ไม่ถูกลบ)`}
        confirmLabel="ลบ"
      />
    </>
  );
}
