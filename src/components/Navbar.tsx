import Link from "next/link";
import Logo from "./Logo";
import { ButtonLink } from "./Button";
import NotificationBell from "./NotificationBell";
import LogoutButton from "./LogoutButton";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "./ThemeToggle";
import { getAuthUser, getPermissions } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/admin";

// light = ใช้บนหน้า Landing พื้นสีอ่อน
export default async function Navbar({ light = false }: { light?: boolean }) {
  const user = supabaseConfigured() ? (await getAuthUser()).user : null;
  const admin = user ? (await getPermissions(user.id, user.email)).size > 0 : false;

  const links = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/payment", label: "ชำระเงิน" },
        { href: "/profile", label: "โปรไฟล์" },
        ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/#highlights", label: "Highlights" },
        { href: "/#benefits", label: "Member Benefits" },
        { href: "/#curriculum", label: "หลักสูตร" },
        { href: "/feedback", label: "Feedback" },
      ];

  return (
    <nav
      className={
        light
          ? "sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-charcoal/10 bg-paper/85 px-[6vw] text-charcoal backdrop-blur"
          : "sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-line bg-bg/95 px-[6vw] backdrop-blur"
      }
    >
      <Logo href={user ? "/dashboard" : "/"} tone={light ? "light" : "dark"} height={34} />
      <div className={`hidden gap-7 text-sm md:flex ${light ? "font-semibold text-accent-muted" : "text-muted"}`}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={light ? "hover:text-accent" : "hover:text-white"}>
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {light && <ThemeToggle />}
        {user ? (
          <>
            <NotificationBell />
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </>
        ) : (
          <ButtonLink href="/login" variant={light ? "plum" : "primary"}>
            เข้าสู่ระบบ
          </ButtonLink>
        )}
        <MobileMenu links={links} loggedIn={!!user} />
      </div>
    </nav>
  );
}
