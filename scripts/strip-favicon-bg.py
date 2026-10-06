"""Build transparent favicon PNG from source: solid T, no gradient plate."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


def make_favicon_png(out: Path, size: int = 512) -> None:
    """Purple italic T on transparent canvas (matches brand icon)."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    purple = (124, 58, 237, 255)
    shadow = (91, 33, 182, 255)

    # Slanted bar + stem (hand-tuned for ~512 canvas)
    s = size / 512
    bar = [
        (118 * s, 118 * s),
        (394 * s, 118 * s),
        (376 * s, 176 * s),
        (302 * s, 176 * s),
        (294 * s, 394 * s),
        (226 * s, 394 * s),
        (234 * s, 176 * s),
        (160 * s, 176 * s),
    ]
    draw.polygon(bar, fill=purple)
    notch = [
        (234 * s, 394 * s),
        (262 * s, 382 * s),
        (276 * s, 418 * s),
        (248 * s, 430 * s),
    ]
    draw.polygon(notch, fill=shadow)
    im.save(out, "PNG")
    print(f"OK {out}")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    apps = ["platform", "platform-admin", "merchant-web", "storefront"]
    svg_src = root / "apps" / "platform" / "public" / "favicon.svg"
    for app in apps:
        pub = root / "apps" / app / "public"
        pub.mkdir(parents=True, exist_ok=True)
        if app != "platform" and svg_src.exists():
            (pub / "favicon.svg").write_text(
                svg_src.read_text(encoding="utf-8"), encoding="utf-8"
            )
        for name in ("favicon.png", "apple-touch-icon.png"):
            make_favicon_png(pub / name)


if __name__ == "__main__":
    main()
