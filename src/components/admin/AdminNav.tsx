"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";

// perm = สิทธิ์ที่ต้องมีจึงจะเห็นเมนู (ไม่ระบุ = ทุกคนที่เข้า /admin ได้)
const items: { href: string; label: string; icon: string; perm?: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/payments", label: "อนุมัติการชำระเงิน", icon: "✓", perm: "payments" },
  { href: "/admin/members", label: "สมาชิก", icon: "👥", perm: "members" },
  { href: "/admin/discounts", label: "โค้ดส่วนลด", icon: "🏷", perm: "payments" },
  { href: "/admin/classes", label: "คอร์ส & วิดีโอ", icon: "▶", perm: "classes" },
  { href: "/admin/live-classes", label: "Live Classes", icon: "●", perm: "live" },
  { href: "/admin/messages", label: "ข้อความถึงผู้สอน", icon: "💬", perm: "community" },
  { href: "/admin/email", label: "ส่งอีเมล", icon: "✉", perm: "email" },
  { href: "/admin/gallery", label: "รูปหน้าเว็บ", icon: "▣", perm: "content" },
  { href: "/admin/analytics", label: "Analytics", icon: "↗", perm: "dashboard" },
  { href: "/admin/usage", label: "Usage & ค่าใช้จ่าย", icon: "◔", perm: "dashboard" },
  { href: "/admin/logs", label: "Log สมาชิก / Admin", icon: "≡", perm: "logs" },
  { href: "/admin/mentor", label: "สมาชิกที่ฉันดูแล", icon: "🧭", perm: "mentor" },
  { href: "/admin/roles", label: "Role & สิทธิ์", icon: "🔑", perm: "roles" },
  { href: "/dashboard", label: "กลับหน้าเว็บ", icon: "←" },
];

export default function AdminNav({ permissions }: { permissions: Permission[] }) {
  const path = usePathname();
  // ตัวเลขสีส้ม = งานที่รออยู่ (สลิปรอตรวจ / ข้อความใหม่ / รอยืนยันอีเมล) — โหลดใหม่ทุกครั้งที่เปลี่ยนหน้า และทุก 60 วินาที
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/admin/badges", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .then((b) => alive && setBadges(b))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("admin-badges", load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("admin-badges", load);
    };
  }, [path]);
  const visible = items.filter((i) => !i.perm || permissions.includes(i.perm));
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const current = visible.find((i) => isActive(i.href));
  const totalBadges = Object.values(badges).reduce((a, b) => a + (b || 0), 0);

  const links = (onPick?: () => void) =>
    visible.map((i) => {
      const active = isActive(i.href);
      return (
        <Link
          key={i.href}
          href={i.href}
          onClick={onPick}
          className={cn(
            "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-3 text-sm transition lg:py-2.5",
            active ? "bg-brand/15 font-semibold text-brand-light" : "text-muted hover:bg-raised hover:text-ink",
          )}
        >
          <span className="w-4 text-center">{i.icon}</span>
          {i.label}
          {!!badges[i.href] && (
            <span className="ml-auto min-w-[20px] rounded-full bg-[#ec9e56] px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-[#2d183c] shadow-[0_0_12px_#ec9e5680]">
              {badges[i.href] > 99 ? "99+" : badges[i.href]}
            </span>
          )}
        </Link>
      );
    });

  return (
    <>
      {/* มือถือ: ปุ่มเมนู → รายการแนวตั้ง (ไม่ต้องเลื่อนข้าง) */}
      <div className="px-3 pb-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-raised px-3 py-3 text-sm text-ink"
        >
          <span className="text-base leading-none">{open ? "✕" : "☰"}</span>
          <span className="font-semibold">{current?.label ?? "เมนู"}</span>
          {!open && totalBadges > 0 && (
            <span className="min-w-[20px] rounded-full bg-[#ec9e56] px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-[#2d183c]">
              {totalBadges > 99 ? "99+" : totalBadges}
            </span>
          )}
          <span className="ml-auto text-xs text-muted">{open ? "ปิด" : "เมนูทั้งหมด"}</span>
        </button>
        {open && <nav className="mt-2 flex flex-col gap-0.5">{links(() => setOpen(false))}</nav>}
      </div>
      {/* จอคอม: เมนูด้านซ้ายแบบเดิม */}
      <nav className="hidden flex-col gap-1 px-3 lg:flex">{links()}</nav>
    </>
  );
}
