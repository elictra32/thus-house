"""ดึงสีและตัดโลโก้จากไฟล์ CI

ใช้:
  python extract_brand.py colors <image> [x,y ...]        # พิมพ์สี RGB/HEX ที่จุดที่ระบุ (ไม่ระบุ = จุดตัวอย่าง 9 จุด)
  python extract_brand.py mark <image-on-white> <out.png> # ตัด mark/ไอคอนบนพื้นขาว → พื้นโปร่งใส
  python extract_brand.py wordmark <image> <x0,y0,x1,y1> <out-prefix>
      # ตัวโลโก้สีขาวบนพื้นเข้ม → <prefix>-white.png และ <prefix>-dark.png (สีเข้ม #2d183c) พื้นโปร่งใส
ต้องมี Pillow (pip install pillow)
"""
import sys
from PIL import Image


def hexify(rgb):
    return "#%02x%02x%02x" % rgb[:3]


def colors(path, points):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    pts = [tuple(map(int, p.split(","))) for p in points] or [
        (int(w * fx), int(h * fy)) for fy in (0.1, 0.5, 0.9) for fx in (0.1, 0.5, 0.9)
    ]
    for p in pts:
        c = im.getpixel(p)
        print(p, c, hexify(c))


def mark(path, out):
    im = Image.open(path).convert("RGB")
    rgba = Image.new("RGBA", im.size)
    src, dst = im.load(), rgba.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = src[x, y]
            alpha = max(0, min(255, int((255 - min(r, g, b) - 18) * 255 / 140)))
            dst[x, y] = (r, g, b, alpha)
    rgba = rgba.crop(rgba.getbbox())
    rgba.thumbnail((512, 512))
    rgba.save(out, optimize=True)
    print("saved", out, rgba.size)


def wordmark(path, box, prefix, dark=(45, 24, 60)):
    gray = Image.open(path).convert("L").crop(tuple(map(int, box.split(","))))
    alpha = gray.point(lambda v: 0 if v < 150 else min(255, (v - 150) * 255 // 80))
    for name, color in (("white", (255, 255, 255)), ("dark", dark)):
        img = Image.new("RGBA", gray.size, color + (0,))
        img.putalpha(alpha)
        img = img.crop(img.getbbox())
        img.thumbnail((900, 900))
        img.save(f"{prefix}-{name}.png", optimize=True)
        print("saved", f"{prefix}-{name}.png", img.size)


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["help"]
    if cmd == "colors":
        colors(args[0], args[1:])
    elif cmd == "mark":
        mark(args[0], args[1])
    elif cmd == "wordmark":
        wordmark(args[0], args[1], args[2])
    else:
        print(__doc__)
