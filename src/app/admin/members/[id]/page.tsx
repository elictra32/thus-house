"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import { Select } from "@/components/Input";
import { ConfirmModal } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { baht, formatDate, isActivePurchase, toBangkokDate } from "@/lib/utils";
import type { Purchase, Role, User } from "@/types/database";
import { ActivityList, MemberInfo, NotesPanel, type MemberLog, type Note } from "@/components/admin/MemberExtras";

type Detail = {
  user: User & { roles: { name: string } | null };
  purchases: (Purchase & { classes: { id: string; name: string; videos_count: number } | null })[];
  watchedByClass: Record<string, number>;
  emailConfirmed: boolean;
  isOwner: boolean;
  canChangeRole: boolean;
  videoLogs: { id: number; blocked: boolean; ip: string | null; created_at: string; videos: { title: string } | null; classes: { name: string } | null }[];
  extraRoles: string[];
  notes: Note[];
  memberLogs: MemberLog[];
  mentors: { id: string; name: string | null; nickname: string | null; member_code: string | null }[];
  presence: { visits: number; seconds: number; lastSeen: string | null };
};

export default function MemberDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, error, loading, setData, reload } = useApi<Detail>(`/api/admin/users/${params.id}`);
  const { data: me } = useApi<{ user: User | null; permissions: string[] }>("/api/auth/me");
  const canManageRoles = !!me?.permissions.includes("roles");
  const { data: roleList } = useApi<{ roles: (Role & { assignable: boolean })[] }>(canManageRoles ? "/api/admin/roles" : null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function update(body: Record<string, string | boolean | string[]>) {
    setSaving(true);
    setActionError("");
    try {
      await api.put(`/api/admin/users/${params.id}`, body);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmEmail() {
    setSaving(true);
    setActionError("");
    try {
      await api.post(`/api/admin/users/${params.id}/confirm-email`);
      setData((d) => (d ? { ...d, emailConfirmed: true } : d));
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.del(`/api/admin/users/${params.id}`);
      router.push("/admin/members");
    } catch (err) {
      setActionError((err as Error).message);
      setDeleting(false);
      setConfirm(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || "ไม่พบสมาชิก"} />;
  const { user, purchases, watchedByClass } = data;

  return (
    <>
      <Link href="/admin/members" className="text-sm text-muted hover:text-ink">← สมาชิกทั้งหมด</Link>
      <PageHeader
        title={user.name || user.email}
        subtitle={user.email}
        action={<Button variant="danger" size="sm" onClick={() => setConfirm(true)}>ลบสมาชิก</Button>}
      />
      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card h-fit space-y-4 p-5 text-sm">
          <FieldEditor
            label="รหัสสมาชิก"
            value={user.member_code ?? ""}
            placeholder="เช่น THUS-001"
            disabled={data.isOwner}
            onSave={(v) => update({ member_code: v })}
          />
          <Row label="ชื่อ" value={user.name || "-"} />
          <FieldEditor label="ชื่อเล่น" value={user.nickname ?? ""} disabled={data.isOwner} onSave={(v) => update({ nickname: v })} />
          <Row label="อีเมล" value={user.email} />
          <div>
            <p className="text-xs text-muted">การยืนยันอีเมล</p>
            {data.emailConfirmed ? (
              <p className="text-green-300">✓ ยืนยันแล้ว</p>
            ) : (
              <div className="mt-1 space-y-2">
                <p className="text-amber-300">ยังไม่ยืนยัน — เข้าสู่ระบบไม่ได้</p>
                <Button size="sm" loading={saving} onClick={confirmEmail}>ยืนยันอีเมลแทนสมาชิก</Button>
              </div>
            )}
          </div>
          <Row label="เบอร์โทร" value={user.phone || "-"} />
          <Row label="สมัครเมื่อ" value={formatDate(user.created_at)} />
          <Row label="เริ่มเป็นสมาชิก" value={formatDate(user.membership_start)} />
          <Row label="เข้าสู่ระบบล่าสุด" value={formatDate(user.last_login_at, true)} />
          <Row
            label="ใช้งานเว็บ 30 วัน"
            value={data.presence.visits
              ? `${data.presence.visits} ครั้ง · ${Math.floor(data.presence.seconds / 3600)} ชม. ${Math.round((data.presence.seconds % 3600) / 60)} นาที · ล่าสุด ${formatDate(data.presence.lastSeen, true)}`
              : "-"}
          />
          <div>
            <p className="text-xs text-muted">อุปกรณ์ที่ล็อกอิน (ใช้ได้ทีละ 1 เครื่อง)</p>
            {user.active_session ? (
              <div className="mt-1 space-y-2">
                <p>ใช้งานอยู่ · ล่าสุด {formatDate(user.active_session_seen, true)}</p>
                <Button size="sm" variant="ghost" loading={saving} onClick={() => update({ unlock_device: true })}>
                  ปลดล็อกอุปกรณ์
                </Button>
                <p className="text-xs text-subtle">กดเมื่อสมาชิกทำเครื่องเดิมหาย / ลืมออกจากระบบ — เครื่องเดิมจะถูกออกจากระบบ</p>
              </div>
            ) : (
              <p className="text-subtle">ไม่มี</p>
            )}
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs text-muted">สถานะ <StatusBadge status={user.status} /></p>
            <Select name="status" value={user.status} disabled={saving} onChange={(e) => update({ status: e.target.value })}>
              <option value="active">ใช้งาน (active)</option>
              <option value="inactive">ไม่ใช้งาน (inactive)</option>
              <option value="suspended">ระงับ (suspended)</option>
            </Select>
            <p className="mt-2 text-xs text-subtle">inactive / suspended จะเข้าดูวิดีโอไม่ได้ · suspended จะล็อกอินไม่ได้</p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs text-muted">Role</p>
            {data.isOwner ? (
              <p>Head Admin <span className="text-xs text-subtle">· เจ้าของระบบ เปลี่ยนไม่ได้</span></p>
            ) : data.canChangeRole && roleList ? (
              <Select name="role" value={user.role} disabled={saving} onChange={(e) => update({ role: e.target.value })}>
                {roleList.roles.filter((r) => r.assignable || r.id === user.role).map((r) => (
                  <option key={r.id} value={r.id} disabled={!r.assignable}>{r.name}</option>
                ))}
              </Select>
            ) : (
              <p>{user.roles?.name ?? user.role}</p>
            )}
            {/* 1 คนหลาย Role: Role เพิ่มเติม สิทธิ์รวมกับ Role หลัก */}
            {!data.isOwner && (data.canChangeRole || data.extraRoles.length > 0) && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-muted">Role เพิ่มเติม (สิทธิ์รวมกัน)</p>
                {data.canChangeRole && roleList ? (
                  <div className="flex flex-wrap gap-2">
                    {roleList.roles.filter((r) => r.id !== "member" && r.id !== user.role && (r.assignable || data.extraRoles.includes(r.id))).map((r) => {
                      const on = data.extraRoles.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          disabled={saving || !r.assignable}
                          onClick={() => update({ extra_roles: on ? data.extraRoles.filter((x) => x !== r.id) : [...data.extraRoles, r.id] })}
                          className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${on ? "bg-brand/25 font-bold ring-brand" : "text-muted ring-edge hover:text-ink"}`}
                        >
                          {on ? "✓ " : "+ "}{r.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p>{data.extraRoles.join(", ") || "-"}</p>
                )}
              </div>
            )}
            {data.mentors.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                Mentor ที่ดูแล: <span className="text-ink">{data.mentors.map((m) => [m.member_code, m.nickname || m.name].filter(Boolean).join(" ")).join(", ")}</span>
              </p>
            )}
          </div>
          {(canManageRoles || user.discord_id) && (
            <div className="border-t border-line pt-4">
              <FieldEditor
                label="Discord ID (กดอนุมัติใน Discord)"
                value={user.discord_id ?? ""}
                placeholder="เช่น 123456789012345678"
                disabled={!canManageRoles}
                onSave={(v) => update({ discord_id: v })}
              />
              <p className="mt-2 text-xs text-subtle">ใส่เฉพาะทีมงานที่ให้กดปุ่มในห้องอนุมัติ Discord ได้ · กดปุ่มโดยไม่มีสิทธิ์ บอทจะบอก ID ให้</p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-6">
        <div className="card overflow-x-auto">
          <h3 className="p-5 font-bold">การซื้อและความคืบหน้า</h3>
          <table className="w-full min-w-[720px]">
            <thead><tr><th className="th">คอร์ส</th><th className="th">ยอด</th><th className="th">วันที่</th><th className="th">สถานะ</th><th className="th">ดูแล้ว</th><th className="th">เรียนได้ถึง</th></tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="td">{p.classes?.name ?? "-"}</td>
                  <td className="td">{baht(p.amount)}</td>
                  <td className="td text-muted">{formatDate(p.created_at)}</td>
                  <td className="td"><StatusBadge status={p.status} /></td>
                  <td className="td">
                    {p.status === "approved" && p.classes
                      ? `${watchedByClass[p.class_id] ?? 0} / ${p.classes.videos_count}`
                      : "-"}
                  </td>
                  <td className="td">
                    {p.status === "approved" ? <ExpiryEditor key={p.expires_at ?? "none"} purchaseId={p.id} expiresAt={p.expires_at} onSaved={reload} /> : "-"}
                  </td>
                </tr>
              ))}
              {!purchases.length && <tr><td className="td text-muted" colSpan={6}>ยังไม่มีการซื้อ</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
        <MemberInfo
          birthDate={user.birth_date}
          markets={user.trading_markets ?? []}
          years={user.trading_years}
          goal={user.learning_goal}
          address={user.address}
          idCardLast4={user.id_card_last4}
          idCardUrl={`/api/admin/users/${user.id}/id-card`}
        />
        <NotesPanel memberId={user.id} notes={data.notes} me={me?.user?.id} canDeleteAll onChange={reload} />
      </div>
        </div>
      </div>

      <div className="mt-6">
        <ActivityList logs={data.memberLogs} title="กิจกรรมของสมาชิก (200 รายการล่าสุด)" />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 p-5">
          <h3 className="font-bold">ประวัติเปิดบทเรียน (100 ครั้งล่าสุด)</h3>
          {data.videoLogs.some((l) => l.blocked) && (
            <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">
              ⚠️ เคยเปิดบทเรียนถี่ผิดปกติ {data.videoLogs.filter((l) => l.blocked).length} ครั้ง
            </span>
          )}
        </div>
        <table className="w-full min-w-[640px]">
          <thead><tr><th className="th">เวลา</th><th className="th">คอร์ส</th><th className="th">บทเรียน</th><th className="th">IP</th><th className="th">ผล</th></tr></thead>
          <tbody>
            {data.videoLogs.map((l) => (
              <tr key={l.id} className={l.blocked ? "bg-red-500/[0.06]" : undefined}>
                <td className="td whitespace-nowrap text-muted">{formatDate(l.created_at, true)}</td>
                <td className="td">{l.classes?.name ?? "-"}</td>
                <td className="td">{l.videos?.title ?? "(ลบแล้ว)"}</td>
                <td className="td text-muted">{l.ip ?? "-"}</td>
                <td className="td">{l.blocked ? <span className="font-bold text-red-300">ถูกพัก (ถี่เกิน)</span> : "เปิดดู"}</td>
              </tr>
            ))}
            {!data.videoLogs.length && <tr><td className="td text-muted" colSpan={5}>ยังไม่มีประวัติ</td></tr>}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        loading={deleting}
        title="ลบสมาชิก"
        message={`ลบ ${user.email} และข้อมูลการซื้อ/ความคืบหน้าทั้งหมดถาวร ย้อนกลับไม่ได้`}
        confirmLabel="ลบถาวร"
      />
    </>
  );
}

// แก้ค่าช่องเดียวในหน้ารายละเอียดสมาชิก (รหัสสมาชิก / ชื่อเล่น)
function FieldEditor({
  label,
  value,
  placeholder,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave: (v: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const dirty = draft.trim() !== value;
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      {disabled ? (
        <p>{value || "-"}</p>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-edge bg-raised px-2.5 py-1.5 text-sm outline-none focus:border-brand"
          />
          {dirty && (
            <Button
              size="sm"
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(draft.trim());
                } finally {
                  setSaving(false);
                }
              }}
            >
              บันทึก
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="break-words">{value}</p>
    </div>
  );
}

// แก้วันหมดอายุสิทธิ์เรียนของการซื้อแต่ละรายการ (ว่าง = ไม่หมดอายุ)
function ExpiryEditor({ purchaseId, expiresAt, onSaved }: { purchaseId: string; expiresAt: string | null; onSaved: () => void }) {
  const [value, setValue] = useState(toBangkokDate(expiresAt));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const dirty = value !== toBangkokDate(expiresAt);
  const expired = !isActivePurchase({ status: "approved", expires_at: expiresAt });

  async function save() {
    setSaving(true);
    setErr("");
    try {
      await api.put(`/api/admin/purchases/${purchaseId}`, { expires_at: value || null });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-[190px]">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-edge bg-raised px-2 py-1 text-sm [color-scheme:dark]"
        />
        {dirty && <Button size="sm" loading={saving} onClick={save}>บันทึก</Button>}
      </div>
      <p className={`mt-1 text-xs ${expired ? "text-red-300" : "text-subtle"}`}>
        {!expiresAt ? "ไม่หมดอายุ" : expired ? "หมดอายุแล้ว" : "ยังใช้งานได้"}
        {value && " · ลบวันที่ = ไม่หมดอายุ"}
      </p>
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    </div>
  );
}
