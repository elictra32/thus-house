"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";

function EditableRow({ label, field, value }: { label: string; field: "name" | "nickname" | "phone"; value: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setError("");
    try {
      await api.put("/api/user/profile", { [field]: draft });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        {editing ? (
          <Input name={field} value={draft} onChange={(e) => setDraft(e.target.value)} error={error} className="mt-1 max-w-sm" autoFocus />
        ) : (
          <p className="mt-0.5">{value || <span className="text-subtle">ยังไม่ได้ระบุ</span>}</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(value); setError(""); }}>ยกเลิก</Button>
          <Button size="sm" loading={loading} onClick={save}>บันทึก</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>แก้ไข</Button>
      )}
    </div>
  );
}

export default function ProfileFields({
  name,
  nickname,
  phone,
  email,
  memberCode,
}: {
  name: string;
  nickname: string;
  phone: string;
  email: string;
  memberCode: string;
}) {
  return (
    <section className="card divide-y divide-line">
      {memberCode && (
        <div className="px-5 py-4">
          <p className="text-xs text-muted">รหัสสมาชิก</p>
          <p className="mt-0.5 font-bold tracking-wide text-brand-light">{memberCode}</p>
        </div>
      )}
      <EditableRow label="ชื่อ–นามสกุล" field="name" value={name} />
      <EditableRow label="ชื่อเล่น" field="nickname" value={nickname} />
      <div className="px-5 py-4">
        <p className="text-xs text-muted">อีเมล</p>
        <p className="mt-0.5">{email}</p>
      </div>
      <EditableRow label="เบอร์โทร" field="phone" value={phone} />
    </section>
  );
}
