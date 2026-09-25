"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Input, { Textarea } from "@/components/Input";
import BirthDateSelect from "@/components/BirthDateSelect";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";
import Avatar from "@/components/Avatar";
import { squareAvatar } from "@/lib/shrink-image";
import { TRADING_MARKETS, TRADING_YEARS, formatBirthDate, formatThaiId, isBirthDate, isThaiId, maskedThaiId } from "@/lib/member-profile";

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

type Kind = "text" | "textarea" | "date" | "code";

// แถวข้อมูล: กด "แก้ไข" → กรอก → บันทึก
function EditableRow({
  label, field, value, kind = "text", display, hint,
}: { label: string; field: string; value: string; kind?: Kind; display?: string; hint?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (kind === "date" && draft && !isBirthDate(draft)) return setError("กรุณาเลือกวัน เดือน ปีให้ครบ");
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
          <div className="mt-1 max-w-md">
            {kind === "textarea" ? (
              <Textarea name={field} rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            ) : kind === "date" ? (
              <BirthDateSelect value={draft} onChange={setDraft} />
            ) : (
              <Input name={field} value={draft} onChange={(e) => setDraft(kind === "code" ? e.target.value.toUpperCase() : e.target.value)} autoFocus />
            )}
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            {hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
          </div>
        ) : (
          <p className={`mt-0.5 whitespace-pre-line ${kind === "code" ? "font-bold tracking-wide text-brand-light" : ""}`}>
            {(display ?? value) || <span className="font-normal text-subtle">ยังไม่ได้ระบุ</span>}
          </p>
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

// เลขบัตรประชาชน: เก็บแบบเข้ารหัส · แสดงแบบซ่อน กด "แสดง" ถึงเห็น (เฉพาะเจ้าของบัญชีและ Admin)
function IdCardRow({ last4 }: { last4: string }) {
  const router = useRouter();
  const [shown, setShown] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reveal() {
    if (shown) return setShown("");
    setLoading(true);
    try {
      const r = await api.get<{ idCard: string | null }>("/api/user/id-card");
      setShown(r.idCard ? formatThaiId(r.idCard) : "");
    } finally {
      setLoading(false);
    }
  }
  async function save() {
    const id = draft.replace(/[\s-]/g, "");
    if (!isThaiId(id)) return setError("เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
    setLoading(true);
    setError("");
    try {
      await api.put("/api/user/profile", { id_card: id });
      setEditing(false);
      setDraft("");
      setShown("");
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
        <p className="flex items-center gap-1.5 text-xs text-muted">
          เลขบัตรประชาชน
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-subtle">🔒 เข้ารหัส</span>
        </p>
        {editing ? (
          <div className="mt-1 max-w-md">
            <Input name="id_card" inputMode="numeric" maxLength={17} placeholder="13 หลัก" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            <p className="mt-1.5 text-xs text-subtle">ใช้ออกใบกำกับภาษี · เห็นได้เฉพาะคุณและ Admin (ทุกครั้งที่เปิดดูจะถูกบันทึก)</p>
          </div>
        ) : (
          <p className="mt-0.5 font-mono tracking-wide">
            {shown || maskedThaiId(last4) || <span className="font-sans text-subtle">ยังไม่ได้ระบุ</span>}
          </p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(""); setError(""); }}>ยกเลิก</Button>
          <Button size="sm" loading={loading} onClick={save}>บันทึก</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          {last4 && <Button size="sm" variant="ghost" loading={loading} onClick={reveal}>{shown ? "ซ่อน" : "แสดง"}</Button>}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>แก้ไข</Button>
        </div>
      )}
    </div>
  );
}

// ประสบการณ์เทรด + เป้าหมาย (บันทึกทีเดียว)
function TradingSection({ markets, years, goal }: { markets: string[]; years: string; goal: string }) {
  const router = useRouter();
  const [m, setM] = useState(markets);
  const [y, setY] = useState(years);
  const [g, setG] = useState(goal);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const dirty = m.join() !== markets.join() || y !== years || g !== goal;

  async function save() {
    setLoading(true);
    setMsg("");
    try {
      await api.put("/api/user/profile", { trading_markets: m, trading_years: y, learning_goal: g });
      setMsg("บันทึกแล้ว");
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const chip = (on: boolean) =>
    `rounded-full px-3.5 py-2 text-sm ring-1 ring-inset transition ${on ? "bg-brand/25 font-semibold text-ink ring-brand" : "text-muted ring-edge hover:text-ink"}`;

  return (
    <section className="card space-y-5 p-5">
      <h2 className="text-lg font-bold">ประสบการณ์ & เป้าหมาย</h2>
      <div>
        <p className="label">เคยเทรดอะไรมาบ้าง (เลือกได้หลายอย่าง)</p>
        <div className="flex flex-wrap gap-2">
          {TRADING_MARKETS.map((k) => (
            <button key={k} type="button" className={chip(m.includes(k))} onClick={() => setM(m.includes(k) ? m.filter((x) => x !== k) : [...m, k])}>
              {m.includes(k) && "✓ "}{k}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">ประสบการณ์เทรด</p>
        <div className="flex flex-wrap gap-2">
          {TRADING_YEARS.map((k) => (
            <button key={k} type="button" className={chip(y === k)} onClick={() => setY(y === k ? "" : k)}>{k}</button>
          ))}
        </div>
      </div>
      <Textarea label="เป้าหมายในการเรียน" name="learning_goal" rows={3} maxLength={1000} placeholder="เช่น อยากมีระบบเทรดของตัวเอง คุมความเสี่ยงได้ ..." value={g} onChange={(e) => setG(e.target.value)} />
      <div className="flex items-center justify-end gap-3">
        {msg && <span className={`text-sm ${msg === "บันทึกแล้ว" ? "text-green-300" : "text-red-300"}`}>{msg}</span>}
        <Button size="sm" loading={loading} disabled={!dirty} onClick={save}>บันทึก</Button>
      </div>
    </section>
  );
}

export type ProfileData = {
  name: string; nickname: string; phone: string; email: string; memberCode: string; avatar: string;
  birthDate: string; address: string; idCardLast4: string; markets: string[]; years: string; goal: string;
};

export default function ProfileFields({ p }: { p: ProfileData }) {
  return (
    <>
      <section className="card divide-y divide-line">
        <AvatarRow avatar={p.avatar} name={p.nickname || p.name} />
        <EditableRow label="รหัสสมาชิก" field="member_code" kind="code" value={p.memberCode} hint="ใช้ได้ A–Z, 0–9, - และ _ · ห้ามซ้ำกับคนอื่น" />
        <EditableRow label="ชื่อ–นามสกุล" field="name" value={p.name} />
        <EditableRow label="ชื่อเล่น" field="nickname" value={p.nickname} />
        <div className="px-5 py-4">
          <p className="text-xs text-muted">อีเมล</p>
          <p className="mt-0.5">{p.email}</p>
        </div>
        <EditableRow label="เบอร์โทร" field="phone" value={p.phone} />
        <EditableRow label="วันเดือนปีเกิด" field="birth_date" kind="date" value={p.birthDate} display={formatBirthDate(p.birthDate)} />
        <IdCardRow last4={p.idCardLast4} />
        <EditableRow label="ที่อยู่ (สำหรับออกใบกำกับภาษี)" field="address" kind="textarea" value={p.address} />
      </section>
      <TradingSection markets={p.markets} years={p.years} goal={p.goal} />
    </>
  );
}
