"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";
import Avatar from "@/components/Avatar";
import { squareAvatar } from "@/lib/shrink-image";

// รูปโปรไฟล์: เลือกรูป → ย่อในเครื่องเหลือ 256px (~20KB) → อัปโหลด
function AvatarRow({ avatar, name }: { avatar: string; name: string }) {
  const router = useRouter();
  const [src, setSrc] = useState(avatar);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const small = await squareAvatar(file);
      const form = new FormData();
      form.append("file", small);
      const { url } = await api.post<{ url: string }>("/api/user/avatar", form);
      setSrc(url);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }
  async function remove() {
    setLoading(true);
    try {
      await api.del("/api/user/avatar");
      setSrc("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <Avatar src={src} name={name || "?"} size={72} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">รูปโปรไฟล์</p>
        <p className="mt-0.5 text-xs text-subtle">แสดงในคอมเมนต์ใต้บทเรียน · ระบบย่อรูปให้อัตโนมัติ</p>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
        <div className="mt-2 flex gap-2">
          <label className={`inline-flex cursor-pointer items-center justify-center rounded-[10px] bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark ${loading ? "pointer-events-none opacity-50" : ""}`}>
            {loading ? "กำลังอัปโหลด..." : src ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
            <input type="file" accept="image/*" className="hidden" onChange={pick} />
          </label>
          {src && <Button size="sm" variant="ghost" disabled={loading} onClick={remove}>ลบรูป</Button>}
        </div>
      </div>
    </div>
  );
}

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
  avatar,
}: {
  name: string;
  nickname: string;
  phone: string;
  email: string;
  memberCode: string;
  avatar: string;
}) {
  return (
    <section className="card divide-y divide-line">
      <AvatarRow avatar={avatar} name={nickname || name} />
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
