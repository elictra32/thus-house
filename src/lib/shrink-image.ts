// ย่อรูปสลิปในเบราว์เซอร์ก่อนอัปโหลด (ด้านยาวสุด 1600px, JPEG 85%) — ไฟล์เล็กลงหลายเท่า อัปโหลดเร็ว ประหยัดพื้นที่
// ถ้าย่อไม่ได้หรือไม่ได้เล็กลง ใช้ไฟล์เดิม
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // PNG พื้นใส → พื้นขาว
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// รูปโปรไฟล์: ครอปกลางเป็นสี่เหลี่ยมจัตุรัส 256px → WebP (ถ้าเบราว์เซอร์ไม่รองรับใช้ JPEG) ไฟล์ราว 10–30KB
export async function squareAvatar(file: File, side = 256): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const crop = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ย่อรูปไม่สำเร็จ");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, side, side);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await toBlob("image/webp", 0.8);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.8);
  if (!blob) throw new Error("ย่อรูปไม่สำเร็จ");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `avatar.${ext}`, { type: blob.type });
}
