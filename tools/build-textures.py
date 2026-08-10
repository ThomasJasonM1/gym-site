#!/usr/bin/env python3
"""
Country Fit — texture tile generator.

LOCAL AUTHORING TOOL. Regenerates the two grain plates in assets/textures/.
Run once; the output is committed. Nothing at runtime depends on this.

    python tools/build-textures.py

Produces two seamlessly tiling grayscale PNGs, layered by css/styles.css at low
opacity to give the near-black page the distressed newsprint feel of the gym's
printed boards:

  grain-128.png    high-frequency speckle, the "ink on rough paper" tooth
  mottle-256.png   low-frequency blotching, breaks up the repeat

Two tiles at different frequencies and different periods disguise the repeat
far better than one tile at double the opacity — their least common multiple is
large enough that the eye never locks onto a grid.

Seamlessness is the whole game here:
  * Per-pixel noise is inherently seamless — adjacent tiles are equally random,
    so there is no edge to see.
  * Blurred noise is NOT. A normal blur samples past the edge and produces a
    visible seam every tile. Fixed by tiling 3x3, blurring the big image, and
    cropping the centre, so every edge pixel was blurred against its true
    wrap-around neighbour.

Both are posterised before saving. Full-range noise is nearly incompressible in
PNG; at 32 levels it stays visually identical under a 0.07 opacity overlay and
costs a fraction of the bytes.
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit("Pillow is not installed.  Run:  pip install Pillow")

import random

OUT = Path(__file__).resolve().parent.parent / "assets" / "textures"

# Fixed seed so re-running produces byte-identical files and doesn't churn git.
SEED = 20260810


def posterize(img, levels):
    """Snap to N gray levels. Cheap, and makes the PNG compress dramatically."""
    step = 256 // levels
    return img.point(lambda v: min(255, (v // step) * step + step // 2))


def make_grain(size=128, spread=42, levels=32):
    """High-frequency speckle centred on mid-gray. Seamless by construction."""
    rnd = random.Random(SEED)
    img = Image.new("L", (size, size))
    img.putdata([
        max(0, min(255, int(rnd.gauss(128, spread))))
        for _ in range(size * size)
    ])
    return posterize(img, levels)


def make_mottle(size=256, radius=9, levels=24):
    """Low-frequency blotching. Blurred with true wrap-around neighbours."""
    rnd = random.Random(SEED + 1)
    base = Image.new("L", (size, size))
    base.putdata([rnd.randrange(256) for _ in range(size * size)])

    # Tile 3x3 so the blur kernel always has real neighbours to sample, then
    # take the centre tile back out. This is what keeps the edges seamless.
    big = Image.new("L", (size * 3, size * 3))
    for x in range(3):
        for y in range(3):
            big.paste(base, (x * size, y * size))
    big = big.filter(ImageFilter.GaussianBlur(radius))
    img = big.crop((size, size, size * 2, size * 2))

    # Blurring collapses the range toward mid-gray; stretch it back out so the
    # blotching is actually visible at 5% opacity.
    lo, hi = img.getextrema()
    if hi > lo:
        img = img.point(lambda v: int((v - lo) * 255 / (hi - lo)))
    return posterize(img, levels)


def check_seam(img, name):
    """Mean absolute difference across the wrap edge vs. a typical interior
    edge. A seamless tile scores about the same as its own interior."""
    px = img.load()
    w, h = img.size
    wrap = sum(abs(px[w - 1, y] - px[0, y]) for y in range(h)) / h
    interior = sum(abs(px[w // 2, y] - px[w // 2 + 1, y]) for y in range(h)) / h
    verdict = "seamless" if wrap <= interior * 1.6 + 1 else "SEAM VISIBLE"
    print(f"    seam check: wrap={wrap:5.2f}  interior={interior:5.2f}  -> {verdict}")


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / name
    # Palette mode + max compression. These are grayscale, so 256 palette
    # entries is lossless here.
    img.convert("P", palette=Image.ADAPTIVE, colors=256).save(
        dest, "PNG", optimize=True, compress_level=9
    )
    kb = dest.stat().st_size / 1024
    print(f"  {dest.name:<18} {img.size[0]}x{img.size[1]}  {kb:6.1f} KB")
    check_seam(img, name)
    return dest.stat().st_size


def main():
    print("Generating texture tiles ->", OUT)
    total = 0
    total += save(make_grain(), "grain-128.png")
    total += save(make_mottle(), "mottle-256.png")
    kb = total / 1024
    budget = 100
    print(f"\n  total {kb:.1f} KB of {budget} KB budget"
          f"  {'OK' if kb <= budget else '** OVER **'}")


if __name__ == "__main__":
    main()
