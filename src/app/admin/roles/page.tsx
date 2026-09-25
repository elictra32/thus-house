"use client";
import { useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal, { ConfirmModal } from "@/components/Modal";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { LOCKED_ROLES, PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Role } from "@/types/database";

type Row = Role & { members: number };
type Form = { name: string; description: string; permissions: Permission[] };
const empty: Form = { name: "", description: "", permissions: [] };

export default function RolesPage() {
  const { data, error, loading, reload } = useApi<{ roles: Row[]; canEdit: boolean }>("/api/admin/roles");
  const canEdit = !!data?.canEdit;
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const locked = editing !== "new" && !!editing && LOCKED_ROLES.includes(editing.id);

  function open(r: Row | "new") {
    setEditing(r);
    setFormError("");
    setForm(r === "new" ? empty : { name: r.name, description: r.description ?? "", permissions: r.permissions as Permission[] });
  }

  function toggle(p: Permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setFormError("กรุณากรอกชื่อ Role");
    setSaving(true);
    setFormError("");
    try {
      const body = locked ? { name: form.name, description: form.description } : form;
      if (editing === "new") await api.post("/api/admin/roles", body);
      else if (editing) await api.put(`/api/admin/roles/${editing.id}`, body);
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
      await api.del(`/api/admin/roles/${toDelete.id}`);
      setToDelete(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Role & สิทธิ์"
        subtitle="ลำดับชั้น: Head Admin > Admin > Mentor > Member · ให้ Role ได้เฉพาะที่ต่ำกว่าตัวเอง · แก้นิยาม Role ได้เฉพาะ Head Admin"
        action={canEdit ? <Button onClick={() => open("new")}>+ สร้าง Role ใหม่</Button> : undefined}
      />
      {error && <ErrorBox message={error} />}
      {loading ? (
        <PageLoading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.roles.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">
                    {r.name}
                    {r.is_system && <span className="ml-2 rounded bg-raised px-2 py-0.5 text-[11px] font-normal text-muted">ระบบ</span>}
                  </h3>
                  {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
                  <p className="mt-1 text-xs text-subtle">{r.members} คน</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => open(r)}>แก้ไข</Button>}
                  {canEdit && !r.is_system && <Button size="sm" variant="ghost" onClick={() => setToDelete(r)}>ลบ</Button>}
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {r.id === "member" && <li className="text-green-300">✓ เรียนคอร์สที่ซื้อ (ทุก Role)</li>}
                {PERMISSIONS.map((p) => (
                  <li key={p.key} className={r.permissions.includes(p.key) ? "text-green-300" : "text-subtle line-through"}>
                    {r.permissions.includes(p.key) ? "✓" : "✕"} {p.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "สร้าง Role ใหม่" : "แก้ไข Role"}>
        <form onSubmit={save} className="space-y-4">
          <Input label="ชื่อ Role *" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น ผู้ช่วยสอน" />
          <Input label="คำอธิบาย" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <p className="label">สิทธิ์</p>
            {locked && <p className="mb-2 text-xs text-amber-300">Role นี้เป็นของระบบ แก้สิทธิ์ไม่ได้ (แก้ได้แค่ชื่อและคำอธิบาย)</p>}
            <div className="space-y-2">
              {PERMISSIONS.map((p) => (
                <label key={p.key} className={`flex items-center gap-3 text-sm ${locked ? "opacity-60" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p.key)}
                    disabled={locked}
                    onChange={() => toggle(p.key)}
                    className="h-4 w-4 accent-[#7a5f96]"
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-subtle">ไม่เลือกสิทธิ์ใดเลย = เหมือนสมาชิกทั่วไป (เข้าหน้า Admin ไม่ได้)</p>
          </div>
          {formError && <ErrorBox message={formError} />}
          <Button type="submit" loading={saving} className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="ลบ Role"
        message={`ลบ Role "${toDelete?.name}" · สมาชิก ${toDelete?.members ?? 0} คนใน Role นี้จะกลับเป็น Member`}
        confirmLabel="ลบ Role"
      />
    </>
  );
}
