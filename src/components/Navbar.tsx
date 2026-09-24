import Link from "next/link";
import Logo from "./Logo";
import { ButtonLink } from "./Button";
import NotificationBell from "./NotificationBell";
import LogoutButton from "./LogoutButton";
import MobileMenu from "./MobileMenu";
import { getAuthUser } from "@/lib/auth";
import { isAdminEmail, supabaseConfigured } from "@/lib/admin";

export default async function Navbar() {
  const user = supabaseConfigured() ? (await getAuthUser()).user : null;
  const admin = isAdminEmail(user?.email);

  const links = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/payment", label: "ชำระเงิน" },
        { href: "/profile", label: "โปรไฟล์" },
        ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/#courses", label: "Courses" },
        { href: "/#why", label: "Why Thushouse" },
        { href: "/#about", label: "About" },
      ];

  return (
    <nav className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-line bg-bg/95 px-[6vw] backdrop-blur">
      <Logo href={user ? "/dashboard" : "/"} />
      <div className="hidden gap-7 text-sm text-[#aeb3c0] md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-white">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <NotificationBell />
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </>
        ) : (
          <ButtonLink href="/login" variant="primary">
            เข้าสู่ระบบ
          </ButtonLink>
        )}
        <MobileMenu links={links} loggedIn={!!user} />
      </div>
    </nav>
  );
}
