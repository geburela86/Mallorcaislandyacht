#!/usr/bin/env python3
"""
Generate a clean transparent version of the Mallorca Island Yacht logo
suitable for use over the LIGHT website background.

Source : src/assets/mallorca-island-yacht-logo.png  (white-bg, navy + gold)
Output : src/assets/mallorca-island-yacht-logo-clean.png  (transparent + crisp edges)

Strategy
--------
1. Open the source RGBA.
2. For every pixel, derive an "ink" weight = 1 - whiteness, where
   whiteness = min(R, G, B) / 255  (white pixels have whiteness 1.0).
3. Map that weight to alpha through a soft threshold so:
     - pure white         -> alpha 0   (vanishes completely)
     - faint shadow gray  -> low alpha (preserves the soft drop shadow halo)
     - colored ink/text   -> alpha 255 (fully opaque)
4. For partially transparent edge pixels, "un-mix" the original color from
   the white background so anti-aliased edges do not show a white halo.
5. Write the result as a 32-bit PNG with a real alpha channel.

Designed to run on a stock Python 3 install (PIL only, no NumPy required).
"""

from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parent.parent / "src" / "assets" / "mallorca-island-yacht-logo.png"
DST = Path(__file__).resolve().parent.parent / "src" / "assets" / "mallorca-island-yacht-logo-clean.png"

# Threshold tuning (in "distance from white", 0..255)
HARD_OPAQUE   = 60   # any pixel this far from white is fully opaque
SOFT_TRANSP   = 4    # any pixel within this of pure white is fully transparent

def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source logo not found: {SRC}")

    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # Distance from pure white in the channel that is closest to white.
            # Using min(255-r, 255-g, 255-b) keeps coloured ink (e.g. gold) opaque
            # while letting near-white background fade out.
            diff = min(255 - r, 255 - g, 255 - b)

            if diff <= SOFT_TRANSP:
                px[x, y] = (255, 255, 255, 0)
                continue

            if diff >= HARD_OPAQUE:
                px[x, y] = (r, g, b, 255)
                continue

            # Soft edge: alpha proportional to "ink-ness"
            alpha = int(round(255 * (diff - SOFT_TRANSP) / (HARD_OPAQUE - SOFT_TRANSP)))
            a_norm = alpha / 255.0
            # Recover original (un-premultiplied) color so the edge is not whitewashed
            inv = 1.0 - a_norm
            nr = int(max(0, min(255, (r - 255 * inv) / a_norm)))
            ng = int(max(0, min(255, (g - 255 * inv) / a_norm)))
            nb = int(max(0, min(255, (b - 255 * inv) / a_norm)))
            px[x, y] = (nr, ng, nb, alpha)

    # Auto-crop fully-transparent borders so the artwork fills its container
    bbox = img.getbbox()
    if bbox:
        # Add a tiny breathing margin (in pixels) so edge anti-aliasing isn't clipped
        pad = 4
        left  = max(0, bbox[0] - pad)
        top   = max(0, bbox[1] - pad)
        right = min(img.width,  bbox[2] + pad)
        bot   = min(img.height, bbox[3] + pad)
        img = img.crop((left, top, right, bot))
        print(f"Cropped to {img.size} (was bbox {bbox})")

    DST.parent.mkdir(parents=True, exist_ok=True)
    img.save(DST, format="PNG", optimize=True)
    print(f"Wrote {DST.relative_to(Path.cwd())} ({DST.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
