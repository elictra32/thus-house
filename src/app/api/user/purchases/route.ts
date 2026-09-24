import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { data, error } = await auth.supabase
    .from("purchases")
    .select("*, classes(id, name)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ purchases: data });
}
