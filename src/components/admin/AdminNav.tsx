"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/payments", label: "อนุมัติการชำระเงิน", icon: "✓" },
  { href: "/admin/members", label: "สมาชิก", icon: "👥" },
  { href: "/admin/classes", label: "คอร์ส & วิดีโอ", icon: "▶" },
  { href: "/admin/live-classes", label: "Live Classes", icon: "●" },
  { href: "/admin/email", label: "ส่งอีเมล", icon: "✉" },
  { href: "/admin/analytics", label: "Analytics", icon: "↗" },
  { href: "/admin/logs", label: "Audit Log", icon: "≡" },
  { href: "/dashboard", label: "กลับหน้าเว็บ", icon: "←" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {items.map((i) => {
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
