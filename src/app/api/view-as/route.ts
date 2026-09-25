import { NextResponse } from "next/server";
import { requireApiUser, jsonError, getRealPermissions } from "@/lib/auth";
import { VIEW_AS_COOKIE, isViewAs } from "@/lib/view-as";

// Head Admin เลือกมุมมอง: { as: "mentor" | "member" | null }
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  if (!(await getRealPermissions(auth.user.id, auth.user.email)).head) return jsonError("เฉพาะ Head Admin", 403);
  const { as } = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });
  if (isViewAs(as)) res.cookies.set(VIEW_AS_COOKIE, as, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12, secure: process.env.NODE_ENV === "production" });
  else res.cookies.delete(VIEW_AS_COOKIE);
  return res;
}
