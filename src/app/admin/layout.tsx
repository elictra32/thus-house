import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import AdminNav from "@/components/admin/AdminNav";
import PresencePing from "@/components/PresencePing";
import { ViewAsBanner, ViewAsSwitcher } from "@/components/ViewAsBar";
import { getRealPermissions, getViewAs, requirePageAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · THUS House" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, perms } = await requirePageAdmin();
  const [{ head }, view] = await Promise.all([getRealPermissions(user.id, user.email), getViewAs(user.id, user.email)]);
  return (
    <>
    <PresencePing />
    {view && <ViewAsBanner view={view} />}
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <div className="border-b border-line bg-panel lg:border-b-0 lg:border-r">
        <aside className="relative lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="p-5">
            <Logo href="/admin" />
            <p className="mt-1 text-xs font-bold tracking-[2px] text-brand-light">ADMIN</p>
          </div>
          {head && <ViewAsSwitcher current={view ?? ""} />}
          {/* จอเตี้ย: เมนูเลื่อนได้ในตัว อีเมล/ออกจากระบบอยู่ใต้เมนูเสมอ ไม่ทับกัน */}
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <AdminNav permissions={[...perms]} />
          </div>
          <div className="hidden shrink-0 p-5 text-xs text-subtle lg:block">
            <p className="mb-3 truncate">{user.email}</p>
            <LogoutButton />
          </div>
        </aside>
      </div>
      <main className="min-w-0 p-5 md:p-8">{children}</main>
    </div>
    </>
  );
}
