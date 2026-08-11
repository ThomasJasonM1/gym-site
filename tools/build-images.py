#!/usr/bin/env python3
"""
Country Fit — image build tool.

LOCAL AUTHORING TOOL. Never uploaded, never referenced by the site. The site
itself has no build step and no runtime dependencies; this just turns camera
originals into the committed, web-ready set in assets/img/.

Setup (one time):
    pip install Pillow pillow-heif

Usage:
    python tools/build-images.py --list
    python tools/build-images.py --contact-sheet
    python tools/build-images.py --all
    python tools/build-images.py IMG_2650.HEIC --name hero-group-outside --preset hero

What it does to every image:
  * Applies the EXIF orientation flag, then discards it. Phone photos record
    rotation as metadata rather than rotating pixels; skip this and half the
    portraits come out sideways.
  * Strips ALL metadata on save — EXIF, GPS, ICC, XMP. Verified 2026-08-10:
    the current Drive set carries no GPS (Google strips it on download), but
    photos added straight off a phone will, so this stays unconditional.
  * Converts to sRGB / RGB so wide-gamut captures don't shift in the browser.
  * Emits WebP + JPEG at the preset's widths, stepping quality down until each
    file lands under the byte budget.
  * Prints a ready-to-paste <picture> block with real width/height attributes,
    so the markup can never disagree with the files on disk.

Filenames are lowercase-kebab and semantic. Never ship IMG_2650.
"""

import argparse
import io
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is not installed.  Run:  pip install Pillow pillow-heif")

# HEIC support is a separate package. Only required if the sources are .HEIC,
# which the current Drive set is.
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_OK = True
except ImportError:
    HEIC_OK = False


REPO = Path(__file__).resolve().parent.parent
SRC_DEFAULT = REPO / "assets" / "images" / "new_images"
OUT_DEFAULT = REPO / "assets" / "img"

# Widths are chosen from how large the image actually renders, not from an
# arbitrary cap. A gallery tile is ~380 CSS px in a 4-column 1440 layout, so
# 1600px tiles would be ~4x the pixels needed and would blow the 2 MB budget.
PRESETS = {
    # name:        (widths,            aspect,   max_kb, fit)
    "hero":        ([1600, 1000, 640], None,     180,   "contain"),
    # The hero photo fills the right half of a two-column layout, so at a 1440
    # viewport it renders ~700 CSS px; 1400 covers that at 2x.
    "hero-tall":   ([1400, 1000, 640], (4, 5),   170,   "cover"),
    "gallery":     ([960, 480],        (4, 5),   110,   "cover"),
    "feature":     ([1200, 640],       (4, 5),   150,   "cover"),
    "og":          ([1200],            (40, 21), 120,   "cover"),  # 1200x630
}

JPEG_QUALITY_STEPS = [88, 84, 80, 76, 72, 68, 64, 60]
WEBP_QUALITY_STEPS = [86, 82, 78, 74, 70, 66, 62, 58]


def load(path: Path) -> Image.Image:
    """Open, apply EXIF rotation, drop all metadata, normalise to RGB."""
    if path.suffix.lower() in (".heic", ".heif") and not HEIC_OK:
        sys.exit(
            f"{path.name} is HEIC but pillow-heif is not installed.\n"
            "  pip install pillow-heif\n"
            "Fallback if pip is blocked: Windows' HEIF codec is installed, so you\n"
            "can batch-convert HEIC to PNG in Explorer/Photos first, then re-run."
        )

    img = Image.open(path)
    img = ImageOps.exif_transpose(img)      # rotate pixels per EXIF tag 274

    if img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Re-wrap the raw pixel buffer in a brand-new Image. Nothing in .info
    # survives the round trip: no EXIF, no GPS, no ICC, no XMP.
    return Image.frombytes("RGB", img.size, img.tobytes())


def crop_to_aspect(img: Image.Image, aspect, focus=0.5) -> Image.Image:
    """Crop to a target aspect ratio.

    focus is where the kept band sits along the axis being trimmed, 0..1.
    0.5 is a plain centre crop. A centre crop is wrong surprisingly often:
    squeezing a 3:4 portrait into a 1.9:1 share card takes a band about a
    quarter of the height, and on these photos that lands on somebody's chin.
    """
    if aspect is None:
        return img
    tw, th = aspect
    target = tw / th
    w, h = img.size
    current = w / h
    focus = min(max(focus, 0.0), 1.0)

    if abs(current - target) < 0.001:
        return img
    if current > target:                     # too wide, trim the sides
        new_w = int(round(h * target))
        left = int(round((w - new_w) * focus))
        return img.crop((left, 0, left + new_w, h))
    new_h = int(round(w / target))           # too tall, trim top/bottom
    top = int(round((h - new_h) * focus))
    return img.crop((0, top, w, top + new_h))


def encode(img: Image.Image, fmt: str, max_kb: int):
    """Step quality down until the encoded bytes fit the budget."""
    steps = WEBP_QUALITY_STEPS if fmt == "WEBP" else JPEG_QUALITY_STEPS
    last = None
    for q in steps:
        buf = io.BytesIO()
        if fmt == "WEBP":
            img.save(buf, "WEBP", quality=q, method=6)
        else:
            img.save(buf, "JPEG", quality=q, optimize=True,
                     progressive=True, subsampling=1)
        last = (buf.getvalue(), q)
        if len(last[0]) <= max_kb * 1024:
            return last
    return last                              # smallest we could manage


def build(path: Path, name: str, preset: str, outdir: Path, focus: float = 0.5):
    widths, aspect, max_kb, _fit = PRESETS[preset]
    base = load(path)
    base = crop_to_aspect(base, aspect, focus)
    outdir.mkdir(parents=True, exist_ok=True)

    made, biggest = [], None
    for w in widths:
        if w > base.width:
            print(f"    skip {w}w — source is only {base.width}px wide")
            continue
        h = int(round(base.height * w / base.width))
        resized = base.resize((w, h), Image.LANCZOS)

        for fmt, ext in (("WEBP", "webp"), ("JPEG", "jpg")):
            data, q = encode(resized, fmt, max_kb)
            dest = outdir / f"{name}-{w}.{ext}"
            dest.write_bytes(data)
            kb = len(data) / 1024
            flag = "" if kb <= max_kb else "  ** OVER BUDGET **"
            print(f"    {dest.name:<38} {w}x{h}  q{q}  {kb:6.1f} KB{flag}")
            made.append(dest)
        if biggest is None:
            biggest = (w, h)

    if biggest:
        emit_picture(name, widths, biggest, base.width)
    return made


def emit_picture(name, widths, biggest, src_w):
    usable = [w for w in widths if w <= src_w]
    webp = ", ".join(f"assets/img/{name}-{w}.webp {w}w" for w in usable)
    jpg = ", ".join(f"assets/img/{name}-{w}.jpg {w}w" for w in usable)
    w, h = biggest
    print(f"""
    ---- paste into index.html ----
    <picture>
      <source type="image/webp" srcset="{webp}" sizes="(min-width: 768px) 33vw, 90vw">
      <img src="assets/img/{name}-{w}.jpg" srcset="{jpg}"
           sizes="(min-width: 768px) 33vw, 90vw"
           width="{w}" height="{h}"
           alt="TODO describe what is actually in this frame"
           loading="lazy" decoding="async">
    </picture>
    -------------------------------
""")


def contact_sheet(src: Path, outdir: Path):
    """One small JPEG per source so the photos can be reviewed and chosen."""
    outdir.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in src.iterdir() if p.is_file())
    print(f"Writing {len(files)} previews to {outdir}")
    for p in files:
        try:
            img = load(p)
            img.thumbnail((900, 900), Image.LANCZOS)
            dest = outdir / (p.stem.lower() + ".jpg")
            img.save(dest, "JPEG", quality=80, optimize=True)
            print(f"  {dest.name:<20} {img.width}x{img.height}")
        except Exception as e:                       # noqa: BLE001
            print(f"  {p.name}: FAILED — {e}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", help="filename inside --src")
    ap.add_argument("--src", type=Path, default=SRC_DEFAULT)
    ap.add_argument("--out", type=Path, default=OUT_DEFAULT)
    ap.add_argument("--name", help="output basename, lowercase-kebab")
    ap.add_argument("--preset", default="gallery", choices=sorted(PRESETS))
    ap.add_argument("--focus", type=float, default=0.5,
                    help="0..1 along the trimmed axis. 0=top/left, 1=bottom/right.")
    ap.add_argument("--list", action="store_true", help="list sources and exit")
    ap.add_argument("--contact-sheet", action="store_true",
                    help="write reviewable previews to tools/preview/")
    args = ap.parse_args()

    if not args.src.exists():
        sys.exit(f"Source folder not found: {args.src}")

    if args.list:
        for p in sorted(args.src.iterdir()):
            if p.is_file():
                try:
                    im = Image.open(p)
                    im = ImageOps.exif_transpose(im)
                    o = ("portrait" if im.height > im.width
                         else "landscape" if im.width > im.height else "square")
                    print(f"  {p.name:<20} {im.width}x{im.height:<6} {o:<10} "
                          f"{p.stat().st_size/1024:7.0f} KB")
                except Exception as e:               # noqa: BLE001
                    print(f"  {p.name:<20} unreadable — {e}")
        return

    if args.contact_sheet:
        contact_sheet(args.src, Path(__file__).parent / "preview")
        return

    if not args.source:
        ap.error("give a source filename, or use --list / --contact-sheet")
    if not args.name:
        ap.error("--name is required (lowercase-kebab, semantic, not IMG_1234)")

    path = args.src / args.source
    if not path.exists():
        sys.exit(f"Not found: {path}")

    print(f"{path.name}  ->  preset '{args.preset}'")
    build(path, args.name, args.preset, args.out, args.focus)


if __name__ == "__main__":
    main()
