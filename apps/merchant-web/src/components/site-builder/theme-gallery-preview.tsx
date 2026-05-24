import type { ThemeLayoutPreview } from "./store-themes";

/** Mini wireframe on theme cards — mimics Shopify Theme Store screenshots */
export function ThemeGalleryPreview({
  layout,
  primary,
  secondary,
  background,
}: {
  layout: ThemeLayoutPreview;
  primary: string;
  secondary: string;
  background: string;
}) {
  const nav = (
    <div
      className="absolute left-1.5 right-1.5 top-1 flex items-center justify-between gap-1"
      style={{ height: 6 }}
    >
      <span className="rounded-sm" style={{ width: 14, height: 4, background: primary }} />
      <span className="flex-1 rounded-sm opacity-40" style={{ height: 3, background: primary }} />
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{ width: 4, height: 4, background: secondary }}
          />
        ))}
      </span>
    </div>
  );

  if (layout === "editorial") {
    return (
      <div className="relative h-full w-full" style={{ background }}>
        {nav}
        <div
          className="absolute left-1.5 right-1.5 top-2.5 rounded-sm"
          style={{ height: "42%", background: `linear-gradient(135deg, ${primary}88, ${secondary}55)` }}
        />
        <div className="absolute bottom-1.5 left-1.5 right-1.5 grid grid-cols-4 gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ height: 14, background: i === 0 ? primary : "#e4e4e7" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "jewelry") {
    return (
      <div className="relative h-full w-full" style={{ background }}>
        {nav}
        <div
          className="absolute left-1.5 right-1.5 top-2.5 rounded-sm"
          style={{ height: "32%", background: `linear-gradient(160deg, ${secondary}66, ${primary}33)` }}
        />
        <div className="absolute bottom-1.5 left-1.5 right-1.5 grid grid-cols-3 gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-sm" style={{ height: 18, background: "#e4e4e7" }}>
              <div
                className="mx-auto mt-1 rounded-full"
                style={{ width: 8, height: 8, background: i === 1 ? primary : secondary }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "electronics") {
    return (
      <div className="relative h-full w-full" style={{ background }}>
        <div
          className="absolute left-0 right-0 top-0 flex gap-0.5 px-1 py-0.5"
          style={{ background: primary }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="rounded-sm opacity-70"
              style={{ width: 10, height: 3, background: "#fff" }}
            />
          ))}
        </div>
        <div className="absolute left-1.5 right-1.5 top-2 grid grid-cols-2 gap-0.5">
          <div
            className="col-span-1 rounded-sm"
            style={{ height: 22, background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          />
          <div className="flex flex-col gap-0.5">
            <div className="rounded-sm flex-1" style={{ background: "#fef08a" }} />
            <div className="rounded-sm flex-1" style={{ background: "#fecaca" }} />
          </div>
        </div>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className="rounded-full"
                style={{ width: 10, height: 10, background: i === 0 ? primary : "#d4d4d8" }}
              />
              <span className="rounded-sm" style={{ width: 12, height: 2, background: "#e4e4e7" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
