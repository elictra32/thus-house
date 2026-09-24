import { requirePageUser } from "@/lib/auth";
import MessagesClient from "./MessagesClient";

export const metadata = { title: "ถามผู้สอน" };

export default async function MessagesPage() {
  const { supabase, user } = await requirePageUser();
  // คอร์สที่เคยซื้อ ใช้ให้เลือกว่าข้อความเกี่ยวกับคอร์สไหน
  const { data } = await supabase
    .from("purchases").select("classes(id, name)").eq("user_id", user.id).eq("status", "approved");
  const map = new Map<string, string>();
  for (const p of (data ?? []) as unknown as { classes: { id: string; name: string } | null }[]) {
    if (p.classes) map.set(p.classes.id, p.classes.name);
  }
  const classes = Array.from(map, ([id, name]) => ({ id, name }));
  return <MessagesClient classes={classes} />;
}
