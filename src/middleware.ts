import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SID_COOKIE, SID_COOKIE_OPTIONS } from "@/lib/device-session";

const PROTECTED = ["/dashboard", "/classes", "/payment", "/profile", "/messages", "/admin"];

// refresh session ของ Supabase ทุก request + กันหน้าที่ต้องล็อกอิน
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response; // ยังไม่ได้ตั้งค่า Supabase — ให้ดูหน้า landing ได้
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = to === "/login" ? `?next=${encodeURIComponent(path)}` : "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const isProtected = PROTECTED.some((p) => path.startsWith(p));
  if (!user && isProtected) return redirectTo("/login");

  // ล็อกอินได้ทีละเครื่อง: เครื่องที่ถูกแทนที่ (เครื่องใหม่ล็อกอินหลังเครื่องนี้ไม่ได้ใช้งาน 24 ชม. / แอดมินปลดล็อก) ถูกออกจากระบบ
  if (user && isProtected) {
    const current = request.cookies.get(SID_COOKIE)?.value;
    const sid = current || crypto.randomUUID();
    const { data: device } = await supabase.rpc("session_check", { sid });
    if (device === "busy") {
      await supabase.auth.signOut({ scope: "local" });
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?kicked=1";
      const res = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => res.cookies.set(c));
      return res;
    }
    if (!current) response.cookies.set(SID_COOKIE, sid, SID_COOKIE_OPTIONS);
  }
  if (user && (path === "/login" || path === "/signup")) return redirectTo("/dashboard");

  return response;
}

export const config = {
  matcher: ["/((?!api/discord|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
