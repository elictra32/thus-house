import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { jsonError } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await createServerSupabase().from("classes").select("*").eq("id", params.id).maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("ไม่พบคอร์ส", 404);
  return NextResponse.json({ class: data });
}
