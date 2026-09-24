import "server-only";
import { createServerSupabase } from "./supabase-server";
import { supabaseConfigured } from "./admin";
import type { Class } from "@/types/database";

// คอร์สตัวอย่าง (จาก prototype) — แสดงบนหน้าแรกเมื่อยังไม่ได้เชื่อม Supabase หรือยังไม่มีคอร์สในระบบ
export const SAMPLE_CLASSES: Class[] = [
  { id: "sample-1", name: "Trading Foundation", category: "TRADING", instructor: "Thushouse", price: 2900, videos_count: 24, duration_hours: 8, thumbnail_url: null, access_days: null, created_at: "", description: "ปูพื้นฐานตั้งแต่ Market Structure, Trend, Risk Management ไปจนถึงการสร้าง Trading Process" },
  { id: "sample-2", name: "Fundamental Investing", category: "INVESTING", instructor: "Thushouse", price: 2500, videos_count: 18, duration_hours: 6, thumbnail_url: null, access_days: null, created_at: "", description: "เรียนรู้การอ่านธุรกิจ งบการเงิน Valuation และการสร้าง Thesis ก่อนตัดสินใจลงทุน" },
  { id: "sample-3", name: "Trading Psychology", category: "PSYCHOLOGY", instructor: "Thushouse", price: 1900, videos_count: 12, duration_hours: 4, thumbnail_url: null, access_days: null, created_at: "", description: "เข้าใจตัวเอง จัดการความเสี่ยง และสร้างระบบที่ทำให้ตัดสินใจได้อย่างมีวินัย" },
];

export async function getPublicClasses(): Promise<Class[]> {
  if (!supabaseConfigured()) return SAMPLE_CLASSES;
  const { data } = await createServerSupabase().from("classes").select("*").order("created_at");
  return data?.length ? (data as Class[]) : SAMPLE_CLASSES;
}
