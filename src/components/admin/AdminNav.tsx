"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";

// perm = สิทธิ์ที่ต้องมีจึงจะเห็นเมนู (ไม่ระบุ = ทุกคนที่เข้า /admin ได้)
const items: { href: string; label: string; icon: string; perm?: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/payments", label: "อนุมัติการชำระเงิน", icon: "✓", perm: "payments" },
  { href: "/admin/members", label: "สมาชิก", icon: "👥", perm: "members" },
  { href: "/admin/classes", label: "คอร์ส & วิดีโอ", icon: "▶", perm: "classes" },
  { href: "/admin/live-classes", label: "Live Classes", icon: "●", perm: "live" },
  { href: "/admin/email", label: "ส่งอีเมล", icon: "✉", perm: "email" },
  { href: "/admin/gallery", label: "รูปหน้าเว็บ", icon: "▣", perm: "content" },
  { href: "/admin/analytics", label: "Analytics", icon: "↗", perm: "dashboard" },
  { href: "/admin/logs", label: "Audit Log", icon: "≡", perm: "logs" },
  { href: "/admin/roles", label: "Role & สิทธิ์", icon: "🔑", perm: "roles" },
  { href: "/dashboard", label: "กลับหน้าเว็บ", icon: "←" },
];

export default function AdminNav({ permissions }: { permissions: Permission[] }) {
  const path = usePathname();
  const visible = items.filter((i) => !i.perm || permissions.includes(i.perm));
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {visible.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition",
              active ? "bg-brand/15 font-semibold text-brand-light" : "text-muted hover:bg-raised hover:text-ink",
            )}
          >
            <span className="w-4 text-center">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
