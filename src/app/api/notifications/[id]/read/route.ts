import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { error } = await auth.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", params.id)
    .eq("user_id", auth.user.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
