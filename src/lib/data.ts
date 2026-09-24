import "server-only";
import { createServerSupabase } from "./supabase-server";
import { supabaseConfigured } from "./admin";
import type { Class, GalleryItem, GalleryKind } from "@/types/database";

// คอร์สที่แสดงบนหน้าแรก (ยังไม่เชื่อม Supabase = ไม่แสดง)
export async function getPublicClasses(): Promise<Class[]> {
  if (!supabaseConfigured()) return [];
  const { data } = await createServerSupabase().from("classes").select("*").order("created_at");
  return (data ?? []) as Class[];
}

// รูป Feedback / Meetup ที่แสดงบนหน้าเว็บ (Admin จัดการได้ที่ /admin/gallery)
export async function getGallery(kind: GalleryKind): Promise<GalleryItem[]> {
  if (!supabaseConfigured()) return [];
  const { data } = await createServerSupabase().from("gallery_items").select("*").eq("kind", kind).order("order_index");
  return (data ?? []) as GalleryItem[];
}
