import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import AdminNav from "@/components/admin/AdminNav";
import { requirePageAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · Thushouse" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, perms } = await requirePageAdmin();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <div className="border-b border-line bg-panel lg:border-b-0 lg:border-r">
        <aside className="relative lg:sticky lg:top-0 lg:h-screen">
          <div className="p-5">
            <Logo href="/admin" />
            <p className="mt-1 text-xs font-bold tracking-[2px] text-brand-light">ADMIN</p>
          </div>
          <AdminNav permissions={[...perms]} />
          <div className="hidden p-5 text-xs text-subtle lg:absolute lg:bottom-0 lg:block">
            <p className="mb-3 truncate">{user.email}</p>
            <LogoutButton />
          </div>
        </aside>
      </div>
      <main className="min-w-0 p-5 md:p-8">{children}</main>
    </div>
  );
}
