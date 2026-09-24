"use client";
import { useState } from "react";
import Link from "next/link";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Input, { Textarea } from "@/components/Input";
import Modal, { ConfirmModal } from "@/components/Modal";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { baht } from "@/lib/utils";
import type { Class } from "@/types/database";

type Form = { name: string; description: string; instructor: string; category: string; price: string; thumbnail_url: string; access_days: string };
const empty: Form = { name: "", description: "", instructor: "", category: "", price: "", thumbnail_url: "", access_days: "" };

export default function ClassesAdmin() {
  const { data, error, loading, reload } = useApi<{ classes: Class[] }>("/api/admin/classes");
  const [editing, setEditing] = useState<Class | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);

  function open(c: Class | "new") {
    setEditing(c);
    setFormError("");
    setForm(
      c === "new"
        ? empty
        : {
            name: c.name, description: c.description ?? "", instructor: c.instructor ?? "",
            category: c.category ?? "", price: String(c.price), thumbnail_url: c.thumbnail_url ?? "",
            access_days: c.access_days ? String(c.access_days) : "",
          },
    );
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    setFormError("");
    try {
      const { url } = await api.post<{ url: string }>("/api/admin/upload-thumbnail", fd);
      setForm((f) => ({ ...f, thumbnail_url: url }));
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setFormError("กรุณากรอกชื่อคอร์ส");
    if (form.price === "" || Number(form.price) < 0) return setFormError("กรุณากรอกราคาให้ถูกต้อง");
    if (form.access_days !== "" && !(Number(form.access_days) >= 1)) return setFormError("อายุสมาชิกต้องเป็นจำนวนวันตั้งแต่ 1 ขึ้นไป");
    setSaving(true);
    setFormError("");
    const body = { ...form, price: Number(form.price), access_days: form.access_days === "" ? null : Number(form.access_days) };
    try {
      if (editing === "new") await api.post("/api/admin/classes", body);
      else if (editing) await api.put(`/api/admin/classes/${editing.id}`, body);
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
      await api.del(`/api/admin/classes/${toDelete.id}`);
      setToDelete(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="คอร์ส & วิดีโอ" subtitle="จัดการคอร์สและบทเรียน" action={<Button onClick={() => open("new")}>+ สร้างคอร์สใหม่</Button>} />
      {error && <ErrorBox message={error} />}
      {loading ? (
        <PageLoading />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr><th className="th">คอร์ส</th><th className="th">ผู้สอน</th><th className="th">ราคา</th><th className="th">อายุสมาชิก</th><th className="th">วิดีโอ</th><th className="th">ชั่วโมง</th><th className="th" /></tr></thead>
            <tbody>
              {data?.classes.map((c) => (
                <tr key={c.id}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-16 shrink-0 rounded-md bg-gradient-to-br from-[#21163a] to-[#151820] bg-cover bg-center"
                        style={c.thumbnail_url ? { backgroundImage: `url(${c.thumbnail_url})` } : undefined}
                      />
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        {c.category && <p className="text-xs text-muted">{c.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="td text-muted">{c.instructor || "-"}</td>
                  <td className="td">{baht(c.price)}</td>
                  <td className="td text-muted">{c.access_days ? `${c.access_days} วัน` : "ไม่หมดอายุ"}</td>
                  <td className="td">{c.videos_count}</td>
                  <td className="td">{c.duration_hours}</td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/classes/${c.id}/videos`} className="rounded-lg bg-brand/15 px-3 py-1.5 text-xs font-bold text-brand-light">วิดีโอ</Link>
                      <Button size="sm" variant="ghost" onClick={() => open(c)}>แก้ไข</Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(c)}>ลบ</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.classes.length === 0 && <tr><td className="td text-center text-muted" colSpan={7}>ยังไม่มีคอร์ส</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "สร้างคอร์สใหม่" : "แก้ไขคอร์ส"}>
        <form onSubmit={save} className="space-y-4">
          <Input label="ชื่อคอร์ส *" name="name" value={form.name} onChange={set("name")} />
          <Textarea label="คำอธิบาย" name="description" rows={4} value={form.description} onChange={set("description")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="ผู้สอน" name="instructor" value={form.instructor} onChange={set("instructor")} />
            <Input label="หมวด (เช่น TRADING)" name="category" value={form.category} onChange={set("category")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="ราคา (บาท) *" name="price" type="number" min={0} value={form.price} onChange={set("price")} />
            <Input label="อายุสมาชิก (วัน)" name="access_days" type="number" min={1} placeholder="ว่าง = ไม่หมดอายุ" value={form.access_days} onChange={set("access_days")} />
          </div>
          <p className="-mt-2 text-xs text-subtle">อายุสมาชิกเริ่มนับตอนอนุมัติสลิป · ปรับรายคนได้ตอนอนุมัติ หรือที่หน้าสมาชิก</p>
          <div>
            <label className="label" htmlFor="thumb">รูปปก</label>
            {form.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.thumbnail_url} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
            )}
            <input id="thumb" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="text-sm text-muted" />
            {uploading && <p className="mt-1 text-xs text-muted">กำลังอัปโหลด...</p>}
          </div>
          <p className="text-xs text-subtle">จำนวนวิดีโอและชั่วโมงคำนวณอัตโนมัติจากวิดีโอในคอร์ส</p>
          {formError && <ErrorBox message={formError} />}
          <Button type="submit" loading={saving} disabled={uploading} className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="ลบคอร์ส"
        message={`ลบ "${toDelete?.name}" พร้อมวิดีโอและประวัติการซื้อของคอร์สนี้ทั้งหมด ย้อนกลับไม่ได้`}
        confirmLabel="ลบถาวร"
      />
    </>
  );
}
