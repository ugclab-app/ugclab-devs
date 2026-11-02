import { useState, type CSSProperties, type ReactNode } from "react";
import type { ThemeLayoutPreview } from "./store-themes";

type PreviewProps = {
  layout: Exclude<ThemeLayoutPreview, "default">;
  primary: string;
  secondary: string;
  background: string;
  /** Larger mock for the detail sidebar */
  size?: "card" | "detail";
  /** Stable seed so two themes with the same layout still look different. */
  themeId?: string;
};

export type ThemePreviewImages = {
  hero: string;
  products: string[];
  accent?: string;
  /** Visual composition for the hero region */
  style?: "full" | "split" | "wordmark" | "moody" | "soft";
  headline?: string;
  darkText?: boolean;
};

const U = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

/** Curated Unsplash sets keyed by premium / known theme ids */
const THEME_IMAGE_MAP: Record<string, ThemePreviewImages> = {
  verdant: {
    hero: U("photo-1463320726281-696a485928f7"),
    products: [
      U("photo-1485955900006-10f4d324d411", 400),
      U("photo-1416879595882-3373a0480b5b", 400),
      U("photo-1459411552884-841db9b3cc2a", 400),
      U("photo-1466781783364-36c955e42a7f", 400),
    ],
    style: "split",
    headline: "Bring the outside in",
    darkText: true,
  },
  bloom: {
    hero: U("photo-1556228720-195a672e8a03"),
    products: [
      U("photo-1570194065650-d99fb4b38b17", 400),
      U("photo-1598440947619-2c35fc9aa908", 400),
      U("photo-1571781926291-c77df8097c1f", 400),
      U("photo-1608571423902-eed4a5ad8108", 400),
    ],
    accent: U("photo-1515377905703-c4788e51af15", 600),
    style: "soft",
    headline: "Daily ritual",
    darkText: true,
  },
  clay: {
    hero: U("photo-1556910103-1c02745aae4d"),
    products: [
      U("photo-1610701596007-11502861dcfa", 400),
      U("photo-1578500494198-246f612d3b3d", 400),
      U("photo-1495474472287-4d71bcdd2085", 400),
      U("photo-1514228742587-6b1558fccfd3", 400),
    ],
    style: "split",
    headline: "Made for the table",
    darkText: true,
  },
  nightrest: {
    hero: U("photo-1522771739844-6a9f6d5f14af"),
    products: [
      U("photo-1631049307264-da0ec9d70304", 400),
      U("photo-1586075010923-2dd457ba8392", 400),
      U("photo-1505693416388-ac5ce068fe85", 400),
      U("photo-1616594039964-ae9021a400a0", 400),
    ],
    style: "full",
    headline: "Rest well",
    darkText: false,
  },
  crunch: {
    hero: U("photo-1599490659213-e2b9527bd087"),
    products: [
      U("photo-1621939514649-280e2ee25f60", 400),
      U("photo-1566478989037-eec170784d0b", 400),
      U("photo-1551024506-0bccd828d307", 400),
      U("photo-1587132137056-bfbf0166836e", 400),
    ],
    style: "wordmark",
    headline: "CRUNCH",
    darkText: false,
  },
  playkit: {
    hero: U("photo-1519238263530-99bdd11df2ea"),
    products: [
      U("photo-1503919545881-bde2740bd6e0", 400),
      U("photo-1515488042361-ee00e0ddd4e4", 400),
      U("photo-1566576912321-d58ddd7a6088", 400),
      U("photo-1471286174890-9c112ffca5b4", 400),
    ],
    style: "soft",
    headline: "Little adventures",
    darkText: true,
  },
  sprint: {
    hero: U("photo-1542291026-7eec264c27ff"),
    products: [
      U("photo-1460353581641-37baddab0fa2", 400),
      U("photo-1606107557195-0e29a4b5b4aa", 400),
      U("photo-1595950653106-6c9ebd614d3a", 400),
      U("photo-1552346154-21d32810aba3", 400),
    ],
    style: "wordmark",
    headline: "SPRINT",
    darkText: false,
  },
  ridge: {
    hero: U("photo-1551632811-561732d1e306"),
    products: [
      U("photo-1547949003-9792a18a2601", 400),
      U("photo-1620799140408-edc6dcb6d633", 400),
      U("photo-1504280390367-361c6d9f38f4", 400),
      U("photo-1601924994987-69e26d50dc26", 400),
    ],
    style: "moody",
    headline: "Take the ridge",
    darkText: false,
  },
};

/** Layout / category fallbacks when themeId is unknown */
const LAYOUT_IMAGE_MAP: Record<string, ThemePreviewImages> = {
  editorial: {
    hero: U("photo-1483985988355-763728e1935b"),
    products: [
      U("photo-1515886657613-9f3515b0c78f", 400),
      U("photo-1496747611176-843222e1e57c", 400),
      U("photo-1469334031218-e382a71b716b", 400),
      U("photo-1509631179647-0177331693cd", 400),
    ],
    style: "full",
    headline: "New season",
  },
  jewelry: {
    hero: U("photo-1515562141207-7a88fb7ce338"),
    products: [
      U("photo-1605100804763-247f67b3557e", 400),
      U("photo-1599643478518-a784e5dc4c8f", 400),
      U("photo-1611591437281-460bfbe1220a", 400),
    ],
    style: "soft",
    headline: "Fine pieces",
    darkText: true,
  },
  luxury: {
    hero: U("photo-1441984904996-e0b692e3092e"),
    products: [
      U("photo-1490481651871-ab68de25d43d", 400),
      U("photo-1483985988355-763728e1935b", 400),
      U("photo-1469334031218-e382a71b716b", 400),
    ],
    style: "soft",
    headline: "Quiet luxury",
    darkText: true,
  },
  electronics: {
    hero: U("photo-1518770660439-4636190af475"),
    products: [
      U("photo-1505740420928-5e560c06d30e", 400),
      U("photo-1523275335684-37898b6baf30", 400),
      U("photo-1572569511254-d8f925fe2cbb", 400),
      U("photo-1546868871-7041f2a55e12", 400),
    ],
    style: "full",
    headline: "Tech that fits",
  },
  beauty: {
    hero: U("photo-1596462502278-27bfdc403348"),
    products: [
      U("photo-1571781926291-c77df8097c1f", 400),
      U("photo-1522335789203-aabd1fc54bc9", 400),
      U("photo-1512496015851-a90fb38ba796", 400),
    ],
    style: "soft",
    headline: "Glow up",
    darkText: true,
  },
  food: {
    hero: U("photo-1495474472287-4d71bcdd2085"),
    products: [
      U("photo-1509042239860-f550ce710b93", 400),
      U("photo-1563805042-7684c019e1cb", 400),
      U("photo-1551024506-0bccd828d307", 400),
      U("photo-1482049016688-2d3e1b311543", 400),
    ],
    style: "split",
    headline: "Fresh daily",
    darkText: true,
  },
  sports: {
    hero: U("photo-1571019614242-c5c5dee9f50b"),
    products: [
      U("photo-1517836357463-d25dfeac3438", 400),
      U("photo-1576678927484-cc907957088c", 400),
      U("photo-1460353581641-37baddab0fa2", 400),
    ],
    style: "full",
    headline: "Train harder",
  },
  digital: {
    hero: U("photo-1498050108123-0750a4d5b0c2"),
    products: [
      U("photo-1523275335684-37898b6baf30", 400),
      U("photo-1505740420928-5e560c06d30e", 400),
      U("photo-1511707171634-5f897ff02aa9", 400),
    ],
    style: "full",
    headline: "Ship today",
  },
  bold: {
    hero: U("photo-1445205170230-053b83016050"),
    products: [
      U("photo-1523381210434-271e8be1f52b", 400),
      U("photo-1556821840-3a63f95609a7", 400),
      U("photo-1552374196-1ab2a1c593e8", 400),
      U("photo-1434389677669-e08b4cac3105", 400),
    ],
    style: "wordmark",
    headline: "DROP",
  },
  catalog: {
    hero: U("photo-1441986300917-64674bd600d8"),
    products: [
      U("photo-1523381210434-271e8be1f52b", 400),
      U("photo-1434389677669-e08b4cac3105", 400),
      U("photo-1556821840-3a63f95609a7", 400),
      U("photo-1552374196-1ab2a1c593e8", 400),
    ],
    style: "split",
    headline: "Shop the edit",
    darkText: true,
  },
};

const CATEGORY_FALLBACKS: ThemePreviewImages[] = [
  LAYOUT_IMAGE_MAP.catalog!,
  LAYOUT_IMAGE_MAP.beauty!,
  LAYOUT_IMAGE_MAP.food!,
  LAYOUT_IMAGE_MAP.sports!,
  LAYOUT_IMAGE_MAP.editorial!,
  LAYOUT_IMAGE_MAP.bold!,
];

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Resolve hero + product image URLs for a theme gallery card. */
export function themePreviewImages(
  themeId: string | undefined,
  layout: Exclude<ThemeLayoutPreview, "default">
): ThemePreviewImages {
  const id = (themeId ?? "").toLowerCase();
  const byTheme = id ? THEME_IMAGE_MAP[id] : undefined;
  if (byTheme) return byTheme;
  const base = LAYOUT_IMAGE_MAP[layout] ?? CATEGORY_FALLBACKS[hashId(id || layout) % CATEGORY_FALLBACKS.length]!;
  if (!id) return base;
  // Slight product shuffle by themeId so same-layout themes differ
  const seed = hashId(id);
  const products = [...base.products];
  for (let i = products.length - 1; i > 0; i--) {
    const j = (seed + i * 17) % (i + 1);
    const a = products[i]!;
    const b = products[j]!;
    products[i] = b;
    products[j] = a;
  }
  return { ...base, products };
}

function CoverImg({
  src,
  alt = "",
  className = "",
  style,
  onError,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  onError?: () => void;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      style={style}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      draggable={false}
    />
  );
}

function MiniNav({
  primary,
  dark,
}: {
  primary: string;
  dark?: boolean;
}) {
  const fg = dark ? "#fff" : primary;
  return (
    <div className="relative z-20 flex items-center justify-between px-[5%] py-[3%]">
      <span
        className="rounded-[1px] font-semibold"
        style={{
          width: "14%",
          height: 6,
          background: fg,
          opacity: 0.95,
        }}
      />
      <span className="flex flex-1 justify-center gap-[6%]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-[1px]"
            style={{ width: "8%", height: 3, background: fg, opacity: 0.35 }}
          />
        ))}
      </span>
      <span className="flex gap-[3px]">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{ width: 5, height: 5, background: fg, opacity: 0.55 }}
          />
        ))}
      </span>
    </div>
  );
}

function ProductStrip({
  urls,
  primary,
  tall,
}: {
  urls: string[];
  primary: string;
  tall?: boolean;
}) {
  const cols = urls.slice(0, 4);
  return (
    <div
      className="relative z-10 grid gap-[3px] px-[5%]"
      style={{
        gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
        height: tall ? "28%" : "22%",
        marginTop: "2%",
      }}
    >
      {cols.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="flex flex-col overflow-hidden rounded-[2px] bg-white shadow-sm"
        >
          <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-200">
            <CoverImg src={url} />
          </div>
          <div className="bg-white px-[3px] py-[2px]">
            <div className="rounded-[1px]" style={{ height: 2, width: "70%", background: "#a1a1aa" }} />
            <div
              className="mt-[2px] rounded-[1px]"
              style={{ height: 2, width: "40%", background: primary }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CtaPill({
  label,
  bg,
  color = "#fff",
}: {
  label?: string;
  bg: string;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-[8px] py-[3px] text-[7px] font-semibold leading-none tracking-wide"
      style={{ background: bg, color }}
    >
      {label ?? "Shop now"}
    </span>
  );
}

function PhotoMock({
  images,
  primary,
  secondary,
  background,
  size,
}: {
  images: ThemePreviewImages;
  primary: string;
  secondary: string;
  background: string;
  size: "card" | "detail";
}) {
  const [failed, setFailed] = useState(false);
  const detail = size === "detail";
  const style = images.style ?? "full";
  const darkText = images.darkText ?? false;
  const textColor = darkText ? "#18181b" : "#ffffff";
  const headline = images.headline ?? "Shop now";

  const fallbackBg: CSSProperties = {
    background: `linear-gradient(145deg, ${primary} 0%, ${secondary} 55%, ${background} 100%)`,
  };

  const onHeroError = () => setFailed(true);

  let hero: ReactNode;

  if (failed) {
    hero = (
      <div className="absolute inset-0" style={fallbackBg}>
        <div
          className="absolute bottom-[18%] left-[8%] right-[30%]"
          style={{ color: "#fff" }}
        >
          <p
            className="font-bold leading-tight"
            style={{ fontSize: detail ? 18 : 12 }}
          >
            {headline}
          </p>
          <div className="mt-[6px]">
            <CtaPill bg={secondary} color="#18181b" />
          </div>
        </div>
      </div>
    );
  } else if (style === "split") {
    hero = (
      <div className="absolute inset-0 flex">
        <div
          className="flex w-[42%] flex-col justify-center px-[5%]"
          style={{ background: primary, color: "#fff" }}
        >
          <p
            className="font-bold leading-[1.05] tracking-tight"
            style={{ fontSize: detail ? 16 : 11 }}
          >
            {headline}
          </p>
          <p
            className="mt-[4px] opacity-80"
            style={{ fontSize: detail ? 9 : 6, lineHeight: 1.3 }}
          >
            New arrivals for the home
          </p>
          <div className="mt-[8px]">
            <CtaPill bg={secondary} color="#18181b" />
          </div>
        </div>
        <div className="relative w-[58%] overflow-hidden">
          <CoverImg src={images.hero} onError={onHeroError} />
        </div>
      </div>
    );
  } else if (style === "wordmark") {
    hero = (
      <div className="absolute inset-0 overflow-hidden" style={fallbackBg}>
        <CoverImg src={images.hero} onError={onHeroError} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-[12%] flex flex-col items-center px-[6%] text-center">
          <p
            className="font-black uppercase leading-none tracking-tighter text-white"
            style={{
              fontSize: detail ? 36 : 22,
              textShadow: "0 2px 12px rgba(0,0,0,.35)",
            }}
          >
            {headline}
          </p>
          <div className="mt-[8px]">
            <CtaPill bg={secondary} color="#18181b" label="Shop the drop" />
          </div>
        </div>
      </div>
    );
  } else if (style === "moody") {
    hero = (
      <div className="absolute inset-0 overflow-hidden" style={fallbackBg}>
        <CoverImg
          src={images.hero}
          onError={onHeroError}
          style={{ filter: "brightness(0.85) contrast(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
        <div
          className="absolute bottom-[16%] left-[7%] right-[35%]"
          style={{ color: "#fff" }}
        >
          <p
            className="font-bold leading-tight tracking-tight"
            style={{ fontSize: detail ? 18 : 12 }}
          >
            {headline}
          </p>
          <div className="mt-[8px] flex gap-[4px]">
            <CtaPill bg="#fff" color="#18181b" />
            <CtaPill bg="transparent" color="#fff" label="Explore" />
          </div>
        </div>
      </div>
    );
  } else if (style === "soft") {
    hero = (
      <div className="absolute inset-0 overflow-hidden" style={{ background }}>
        <div className="absolute inset-0 opacity-90">
          <CoverImg src={images.hero} onError={onHeroError} />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${background}cc 0%, transparent 35%, ${background}ee 100%)`,
          }}
        />
        <div
          className="absolute inset-x-0 top-[28%] flex flex-col items-center px-[10%] text-center"
          style={{ color: textColor }}
        >
          <p
            className="font-semibold leading-tight tracking-tight"
            style={{ fontSize: detail ? 16 : 11 }}
          >
            {headline}
          </p>
          <div className="mt-[8px]">
            <CtaPill bg={primary} />
          </div>
        </div>
      </div>
    );
  } else {
    // full bleed
    hero = (
      <div className="absolute inset-0 overflow-hidden" style={fallbackBg}>
        <CoverImg src={images.hero} onError={onHeroError} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
        <div
          className="absolute bottom-[14%] left-[7%] right-[25%]"
          style={{ color: "#fff" }}
        >
          <p
            className="font-bold leading-tight tracking-tight"
            style={{ fontSize: detail ? 18 : 12 }}
          >
            {headline}
          </p>
          <div className="mt-[8px]">
            <CtaPill bg={secondary} color="#18181b" />
          </div>
        </div>
      </div>
    );
  }

  const heroHeight = detail ? "58%" : "62%";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background }}>
      <div className="absolute inset-x-0 top-0 z-30">
        <MiniNav
          primary={style === "split" || style === "soft" ? primary : "#fff"}
          dark={style !== "split" && style !== "soft"}
        />
      </div>
      <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: heroHeight }}>
        {hero}
      </div>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: heroHeight, background }}
      >
        <ProductStrip urls={images.products} primary={primary} tall={detail} />
      </div>
    </div>
  );
}

/** Mini homepage mock — Shopify Theme Store–style photographic cards */
export function ThemeGalleryPreview({
  layout,
  primary,
  secondary,
  background,
  size = "card",
  themeId = "",
}: PreviewProps) {
  const images = themePreviewImages(themeId, layout);
  return (
    <PhotoMock
      images={images}
      primary={primary}
      secondary={secondary}
      background={background}
      size={size}
    />
  );
}

export type ThemePreviewSurface = "home" | "product" | "collection";

/** Homepage, product, or collection mock for the theme detail panel. */
export function ThemeSurfacePreview({
  surface,
  layout,
  primary,
  secondary,
  background,
  themeId,
}: {
  surface: ThemePreviewSurface;
  layout: Exclude<ThemeLayoutPreview, "default">;
  primary: string;
  secondary: string;
  background: string;
  themeId?: string;
}) {
  const images = themePreviewImages(themeId, layout);

  if (surface === "home") {
    return (
      <ThemeGalleryPreview
        layout={layout}
        primary={primary}
        secondary={secondary}
        background={background}
        size="detail"
        themeId={themeId}
      />
    );
  }

  if (surface === "product") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <MiniNav primary={primary} />
        <div
          className="absolute grid gap-[4px]"
          style={{ top: "12%", left: "5%", right: "5%", height: "70%", gridTemplateColumns: "1.1fr 1fr" }}
        >
          <div className="overflow-hidden rounded-[3px] bg-zinc-200">
            <CoverImg src={images.hero} />
          </div>
          <div className="flex flex-col justify-center gap-[5px] px-[4px]">
            <div className="rounded-[1px]" style={{ height: 6, width: "80%", background: primary }} />
            <div className="rounded-[1px]" style={{ height: 4, width: "55%", background: "#a1a1aa" }} />
            <div className="rounded-[1px]" style={{ height: 8, width: "32%", background: primary }} />
            <div className="mt-[4px] rounded-full" style={{ height: 10, width: "70%", background: primary }} />
            <div className="mt-[6px] grid grid-cols-3 gap-[3px]" style={{ height: "28%" }}>
              {images.products.slice(0, 3).map((url) => (
                <div key={url} className="overflow-hidden rounded-[2px] bg-zinc-100">
                  <CoverImg src={url} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background }}>
      <MiniNav primary={primary} />
      <div
        className="absolute left-[5%] right-[5%] overflow-hidden rounded-[2px]"
        style={{ top: "12%", height: "16%" }}
      >
        <CoverImg src={images.hero} />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute bottom-[20%] left-[6%] rounded-[1px]" style={{ width: "36%", height: "18%", background: "#fff" }} />
      </div>
      <div
        className="absolute grid gap-[3px]"
        style={{
          top: "32%",
          left: "5%",
          right: "5%",
          bottom: "5%",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
        {[...images.products, images.hero].slice(0, 6).map((url, i) => (
          <div key={`${url}-${i}`} className="flex flex-col overflow-hidden rounded-[2px] bg-white">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-100">
              <CoverImg src={url} />
            </div>
            <div className="h-[6px] bg-white" />
          </div>
        ))}
      </div>
    </div>
  );
}
