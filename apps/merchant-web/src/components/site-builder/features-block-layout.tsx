import type { ReactNode } from "react";
import type { FeatureItem, HomeBlock } from "@ugclab/tenant/store-theme";
import { resolveDesignVariantId } from "./block-variants";

const FEATURE_ICONS = ["⚡", "🔒", "↩", "★", "✓", "◎"];

export function FeaturesBlockLayout({
  block,
  renderTitle,
  renderItem,
}: {
  block: HomeBlock;
  renderTitle?: ReactNode;
  renderItem?: (item: FeatureItem, index: number) => ReactNode;
}) {
  const items =
    block.features && block.features.length > 0
      ? block.features
      : renderItem || renderTitle
        ? [{ title: "—", text: "—" }]
        : [];
  if (items.length === 0) return null;

  const variant = resolveDesignVariantId(block);
  const title = renderTitle ?? (
    block.title ? (
      <h2
        className={`mb-8 text-2xl font-bold text-zinc-900 ${
          block.align === "center" ? "text-center" : ""
        }`}
      >
        {block.title}
      </h2>
    ) : null
  );

  if (variant === "features-icons") {
    return (
      <>
        {title}
        <ul className="grid gap-8 sm:grid-cols-3">
          {items.map((f, i) => (
            <li key={i} className="flex flex-col items-center text-center">
              {renderItem ? (
                renderItem(f, i)
              ) : (
                <>
                  <span
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-lg"
                    style={{
                      background: "color-mix(in srgb, var(--store-primary, #7c3aed) 12%, white)",
                      color: "var(--store-primary, #7c3aed)",
                    }}
                    aria-hidden
                  >
                    {FEATURE_ICONS[i % FEATURE_ICONS.length]}
                  </span>
                  <p className="font-semibold text-zinc-900">{f.title}</p>
                  <p className="mt-2 text-sm text-zinc-600">{f.text}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (variant === "features-4") {
    return (
      <>
        {title}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              {renderItem ? (
                renderItem(f, i)
              ) : (
                <>
                  <p className="text-sm font-semibold text-zinc-900">{f.title}</p>
                  <p className="mt-1.5 text-xs text-zinc-600">{f.text}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      {title}
      <ul className="grid gap-6 sm:grid-cols-3">
        {items.map((f, i) => (
          <li
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            {renderItem ? (
              renderItem(f, i)
            ) : (
              <>
                <p className="font-semibold text-zinc-900">{f.title}</p>
                <p className="mt-2 text-sm text-zinc-600">{f.text}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
