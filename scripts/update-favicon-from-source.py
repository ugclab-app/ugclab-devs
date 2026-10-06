"""Copy brand favicon: teal squircle + white T; transparent outer padding only."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
ASSET_NAME = (
    "c__Users_Mustafa_AppData_Roaming_Cursor_User_workspaceStorage_2c99691bb8b8edf5ffe6d489b56fd50e_images_image-d8bf185e-ee07-444b-95a8-ed132078d491.png"
)


def resolve_source() -> Path:
    candidates = [
        REPO / "assets" / ASSET_NAME,
        Path(
            r"C:\Users\Mustafa\.cursor\projects\c-Users-Mustafa-Documents-ugclab-devs\assets"
        )
        / ASSET_NAME,
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError("Source favicon PNG not found")


def is_outer_white(r: int, g: int, b: int) -> bool:
    return r > 242 and g > 242 and b > 242


def process(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    # Square crop to center
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))
    im = im.resize((512, 512), Image.Resampling.LANCZOS)
    px = im.load()
    for y in range(512):
        for x in range(512):
            r, g, b, a = px[x, y]
            if is_outer_white(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return im


def sample_teal(im: Image.Image) -> str:
    """Dominant non-white, non-transparent hue for theme-color / SVG."""
    px = im.load()
    rs, gs, bs = [], [], []
    for y in range(0, 512, 4):
        for x in range(0, 512, 4):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if r > 200 and g > 200 and b > 200:
                continue
            if g > r and b > r:
                rs.append(r)
                gs.append(g)
                bs.append(b)
    if not rs:
        return "#0d9488"
    r = sum(rs) // len(rs)
    g = sum(gs) // len(gs)
    b = sum(bs) // len(bs)
    return f"#{r:02x}{g:02x}{b:02x}"


def write_svg(path: Path, teal: str) -> None:
    path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Tescommerce">
  <rect width="512" height="512" rx="112" fill="{teal}"/>
  <path fill="#FFFFFF" d="M148 128h216l-14 52H286l-6 204h-60l6-204h-72l14-52z"/>
</svg>
''',
        encoding="utf-8",
    )


def main() -> None:
    src = resolve_source()
    im = process(Image.open(src))
    teal = sample_teal(im)
    root = Path(__file__).resolve().parents[1]
    apps = ["platform", "platform-admin", "merchant-web", "storefront"]
    for app in apps:
        pub = root / "apps" / app / "public"
        pub.mkdir(parents=True, exist_ok=True)
        for name in ("favicon.png", "apple-touch-icon.png"):
            out = pub / name
            im.save(out, "PNG")
            print(f"OK {out}")
        write_svg(pub / "favicon.svg", teal)
        print(f"OK {pub / 'favicon.svg'} ({teal})")

    # theme-color hint
    print(f"THEME_COLOR={teal}")


if __name__ == "__main__":
    main()
