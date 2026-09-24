import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { jsonError } from "@/lib/auth";

export async function GET() {
  const { data, error } = await createServerSupabase().from("classes").select("*").order("created_at");
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ classes: data });
}
