import type { ThemeLayoutPreview } from "./store-themes";

type PreviewProps = {
  layout: Exclude<ThemeLayoutPreview, "default">;
  primary: string;
  secondary: string;
  background: string;
  /** Larger mock for the detail sidebar */
  size?: "card" | "detail";
};

function Nav({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div
      className="absolute left-[6%] right-[6%] top-[4%] flex items-center justify-between gap-1"
      style={{ height: "5%" }}
    >
      <span className="rounded-[1px]" style={{ width: "18%", height: "55%", background: primary }} />
      <span className="flex-1 rounded-[1px] opacity-25" style={{ height: "40%", background: primary }} />
      <span className="flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{ width: 5, height: 5, background: i === 0 ? secondary : `${primary}55` }}
          />
        ))}
      </span>
    </div>
  );
}

function ProductRow({
  top,
  cols,
  primary,
  secondary,
  tall,
}: {
  top: string;
  cols: number;
  primary: string;
  secondary: string;
  tall?: boolean;
}) {
  return (
    <div
      className="absolute left-[6%] right-[6%] grid gap-[3px]"
      style={{
        top,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        height: tall ? "22%" : "16%",
      }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-[2px]"
          style={{ background: i % 2 === 0 ? "#e4e4e7" : "#d4d4d8" }}
        >
          <div
            className="w-full flex-1"
            style={{
              background:
                i === 0
                  ? `linear-gradient(145deg, ${primary}99, ${secondary}66)`
                  : i === 1
                    ? `linear-gradient(160deg, ${secondary}88, ${primary}44)`
                    : `linear-gradient(120deg, #d4d4d8, ${secondary}33)`,
            }}
          />
          <div className="bg-white/90 px-[2px] py-[2px]">
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

/** Mini homepage mock — Shopify Theme Store–style card thumbnails */
export function ThemeGalleryPreview({
  layout,
  primary,
  secondary,
  background,
  size = "card",
}: PreviewProps) {
  const heroH = size === "detail" ? "38%" : "36%";

  if (layout === "editorial") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <Nav primary={primary} secondary={secondary} />
        <div
          className="absolute left-0 right-0"
          style={{
            top: "11%",
            height: heroH,
            background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 40%, ${secondary}88 100%)`,
          }}
        >
          <div
            className="absolute bottom-[18%] left-[8%]"
            style={{ width: "42%", height: "12%", background: "#fff", borderRadius: 2, opacity: 0.95 }}
          />
          <div
            className="absolute bottom-[8%] left-[8%]"
            style={{ width: "28%", height: "7%", background: secondary, borderRadius: 2 }}
          />
        </div>
        <ProductRow top="52%" cols={4} primary={primary} secondary={secondary} />
        <div
          className="absolute left-[6%] right-[6%] bottom-[4%] rounded-[2px]"
          style={{
            height: "12%",
            background: `linear-gradient(90deg, ${secondary}44, ${primary}22)`,
          }}
        />
      </div>
    );
  }

  if (layout === "jewelry" || layout === "luxury") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <Nav primary={primary} secondary={secondary} />
        <div
          className="absolute left-[6%] right-[6%] overflow-hidden rounded-[2px]"
          style={{
            top: "12%",
            height: "30%",
            background: `linear-gradient(160deg, ${secondary}aa, ${primary}55)`,
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "22%",
              aspectRatio: "1",
              background: `radial-gradient(circle, ${secondary}, ${primary})`,
              boxShadow: `0 0 0 2px ${background}`,
            }}
          />
        </div>
        <ProductRow top="48%" cols={3} primary={primary} secondary={secondary} tall />
        <div
          className="absolute bottom-[5%] left-[20%] right-[20%] text-center"
          style={{ height: "8%" }}
        >
          <div
            className="mx-auto rounded-[1px]"
            style={{ width: "50%", height: "35%", background: primary, opacity: 0.7 }}
          />
        </div>
      </div>
    );
  }

  if (layout === "electronics") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <div
          className="absolute left-0 right-0 top-0 flex items-center gap-[3px] px-[4%]"
          style={{ height: "8%", background: primary }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="rounded-[1px] opacity-80"
              style={{ width: "12%", height: "28%", background: "#fff" }}
            />
          ))}
        </div>
        <div
          className="absolute left-[4%] right-[4%] grid grid-cols-2 gap-[3px]"
          style={{ top: "12%", height: "36%" }}
        >
          <div
            className="rounded-[2px]"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            }}
          />
          <div className="flex flex-col gap-[3px]">
            <div className="flex-1 rounded-[2px]" style={{ background: "#fef08a" }} />
            <div className="flex-1 rounded-[2px]" style={{ background: "#fecaca" }} />
          </div>
        </div>
        <ProductRow top="54%" cols={4} primary={primary} secondary={secondary} />
        <div
          className="absolute bottom-[4%] left-[6%] right-[6%] flex justify-between"
          style={{ height: "12%" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-[2px]">
              <div
                className="rounded-full"
                style={{
                  width: 11,
                  height: 11,
                  background: i === 0 ? primary : "#d4d4d8",
                }}
              />
              <span
                className="rounded-[1px]"
                style={{ width: "60%", height: 2, background: "#e4e4e7" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "beauty") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <Nav primary={primary} secondary={secondary} />
        <div
          className="absolute left-0 right-0"
          style={{
            top: "11%",
            height: "40%",
            background: `linear-gradient(180deg, ${secondary}cc 0%, ${primary}66 55%, ${background} 100%)`,
          }}
        >
          <div
            className="absolute bottom-[20%] left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: "36%", height: "10%", background: primary }}
          />
        </div>
        <div
          className="absolute left-[6%] right-[6%] grid grid-cols-2 gap-[4px]"
          style={{ top: "56%", height: "28%" }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{
                background:
                  i === 0
                    ? `linear-gradient(145deg, ${primary}88, #fff)`
                    : `linear-gradient(145deg, ${secondary}, #fff)`,
              }}
            />
          ))}
        </div>
        <div
          className="absolute bottom-[4%] left-[6%] right-[6%] rounded-[2px]"
          style={{ height: "8%", background: `${primary}18` }}
        />
      </div>
    );
  }

  if (layout === "food") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <Nav primary={primary} secondary={secondary} />
        <div
          className="absolute left-[6%] right-[6%] overflow-hidden rounded-[3px]"
          style={{
            top: "12%",
            height: "34%",
            background: `linear-gradient(145deg, ${primary}dd, ${secondary}99)`,
          }}
        >
          <div
            className="absolute bottom-[14%] left-[8%] rounded-[2px]"
            style={{ width: "40%", height: "14%", background: "#fff" }}
          />
        </div>
        <div
          className="absolute left-[6%] right-[6%] grid grid-cols-3 gap-[3px]"
          style={{ top: "52%", height: "20%" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{
                background:
                  i === 1
                    ? `linear-gradient(160deg, ${secondary}, ${primary}88)`
                    : "#e7e5e4",
              }}
            />
          ))}
        </div>
        <div
          className="absolute bottom-[5%] left-[6%] right-[6%] flex gap-[3px]"
          style={{ height: "14%" }}
        >
          <div className="flex-1 rounded-[2px]" style={{ background: `${primary}22` }} />
          <div className="flex-1 rounded-[2px]" style={{ background: `${secondary}33` }} />
        </div>
      </div>
    );
  }

  if (layout === "sports") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "48%",
            background: `linear-gradient(160deg, ${primary} 0%, ${primary}ee 50%, ${secondary}99 100%)`,
          }}
        >
          <Nav primary="#ffffff" secondary={secondary} />
          <div
            className="absolute bottom-[16%] left-[8%] rounded-[2px]"
            style={{ width: "48%", height: "12%", background: "#fff" }}
          />
          <div
            className="absolute bottom-[6%] left-[8%] rounded-[2px]"
            style={{ width: "24%", height: "8%", background: secondary }}
          />
        </div>
        <ProductRow top="54%" cols={3} primary={primary} secondary={secondary} tall />
        <div
          className="absolute bottom-[4%] left-0 right-0"
          style={{ height: "8%", background: primary, opacity: 0.9 }}
        />
      </div>
    );
  }

  if (layout === "digital") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <Nav primary={primary} secondary={secondary} />
        <div
          className="absolute left-[6%] right-[6%] rounded-[3px]"
          style={{
            top: "12%",
            height: "28%",
            background: `linear-gradient(120deg, ${primary}, ${secondary})`,
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[18%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "#fff", opacity: 0.95 }}
          />
        </div>
        <div
          className="absolute left-[6%] right-[6%] grid grid-cols-3 gap-[3px]"
          style={{ top: "46%", height: "26%" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[2px] border border-zinc-200 bg-white p-[3px]"
            >
              <div
                className="mb-[3px] rounded-[1px]"
                style={{
                  height: "55%",
                  background: i === 1 ? primary : `${secondary}55`,
                }}
              />
              <div className="rounded-[1px]" style={{ height: 2, background: "#d4d4d8" }} />
              <div
                className="mt-[2px] rounded-[1px]"
                style={{ height: 2, width: "50%", background: primary }}
              />
            </div>
          ))}
        </div>
        <div
          className="absolute bottom-[5%] left-[18%] right-[18%] rounded-full"
          style={{ height: "8%", background: primary }}
        />
      </div>
    );
  }

  if (layout === "bold") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background }}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${primary} 0%, ${primary} 45%, ${secondary} 45%, ${secondary} 100%)`,
          }}
        />
        <div
          className="absolute left-[8%] top-[14%] rounded-[2px]"
          style={{ width: "50%", height: "8%", background: "#fff" }}
        />
        <div
          className="absolute left-[8%] top-[26%] rounded-[2px]"
          style={{ width: "32%", height: "6%", background: "#fff", opacity: 0.7 }}
        />
        <div
          className="absolute bottom-[8%] left-[6%] right-[6%] grid grid-cols-2 gap-[4px]"
          style={{ height: "38%" }}
        >
          <div className="rounded-[2px]" style={{ background: "#fff" }} />
          <div className="rounded-[2px]" style={{ background: `${background}` }} />
        </div>
      </div>
    );
  }

  /* catalog (default Shopify Dawn–like) */
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background }}>
      <Nav primary={primary} secondary={secondary} />
      <div
        className="absolute left-0 right-0"
        style={{
          top: "11%",
          height: "34%",
          background: `linear-gradient(135deg, ${primary}ee, ${secondary}77)`,
        }}
      >
        <div
          className="absolute bottom-[18%] left-[8%] rounded-[2px]"
          style={{ width: "38%", height: "12%", background: "#fff" }}
        />
        <div
          className="absolute bottom-[8%] left-[8%] rounded-[2px]"
          style={{ width: "22%", height: "8%", background: secondary }}
        />
      </div>
      <ProductRow top="50%" cols={4} primary={primary} secondary={secondary} />
      <div
        className="absolute left-[6%] right-[6%] bottom-[5%] grid grid-cols-2 gap-[3px]"
        style={{ height: "16%" }}
      >
        <div
          className="rounded-[2px]"
          style={{ background: `linear-gradient(120deg, ${secondary}66, #e4e4e7)` }}
        />
        <div
          className="rounded-[2px]"
          style={{ background: `linear-gradient(120deg, #e4e4e7, ${primary}33)` }}
        />
      </div>
    </div>
  );
}
