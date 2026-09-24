import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfigured } from "./admin";
import type { Class, GalleryItem, GalleryKind } from "@/types/database";

// ข้อมูลสาธารณะ (คอร์ส / รูปหน้าเว็บ) เหมือนกันทุกคน → แคชไว้ 5 นาที ไม่ต้องถามฐานข้อมูลทุกครั้งที่มีคนเปิดหน้าแรก
// Admin แก้คอร์ส/รูปเมื่อไร adminRoute จะล้างแคช (revalidateTag) ให้ทันที
export const PUBLIC_DATA_TAG = "public-data";

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

const cachedClasses = unstable_cache(
  async () => {
    const { data } = await anon().from("classes").select("*").order("created_at");
    return (data ?? []) as Class[];
  },
  ["public-classes"],
  { revalidate: 300, tags: [PUBLIC_DATA_TAG] },
);

const cachedGallery = unstable_cache(
  async (kind: GalleryKind) => {
    const { data } = await anon().from("gallery_items").select("*").eq("kind", kind).order("order_index");
    return (data ?? []) as GalleryItem[];
  },
  ["public-gallery"],
  { revalidate: 300, tags: [PUBLIC_DATA_TAG] },
);

// คอร์สที่แสดงบนหน้าแรก (ยังไม่เชื่อม Supabase = ไม่แสดง)
export async function getPublicClasses(): Promise<Class[]> {
  if (!supabaseConfigured()) return [];
  return cachedClasses();
}

// รูป Feedback / Meetup ที่แสดงบนหน้าเว็บ (Admin จัดการได้ที่ /admin/gallery)
export async function getGallery(kind: GalleryKind): Promise<GalleryItem[]> {
  if (!supabaseConfigured()) return [];
  return cachedGallery(kind);
}
