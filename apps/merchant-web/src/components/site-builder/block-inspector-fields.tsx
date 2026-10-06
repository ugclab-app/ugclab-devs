import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { RichTextEdit } from "./rich-text-edit";

export function TitleSizeField({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  if (!block.title && block.type !== "hero" && block.type !== "features") return null;
  return (
    <label className="block text-xs">
      Title size
      <select
        className="ugclab-select mt-1 text-sm"
        value={block.titleSize ?? "md"}
        onChange={(e) =>
          onChange({ titleSize: e.target.value as HomeBlock["titleSize"] })
        }
      >
        <option value="sm">Small</option>
        <option value="md">Medium</option>
        <option value="lg">Large</option>
        <option value="xl">Extra large</option>
      </select>
    </label>
  );
}

export function VisibilityScopeField({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  return (
    <label className="block text-xs">
      Show on
      <select
        className="ugclab-select mt-1 text-sm"
        value={block.visibilityScope ?? "all"}
        onChange={(e) =>
          onChange({
            visibilityScope: e.target.value as HomeBlock["visibilityScope"],
          })
        }
      >
        <option value="all">All pages</option>
        <option value="home">Homepage only</option>
        <option value="product">Product pages only</option>
        <option value="pages">Custom pages only</option>
      </select>
    </label>
  );
}

export function InteractiveBlockFields({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  if (block.type === "tabs") {
    return (
      <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
        <legend className="px-1 text-xs font-semibold text-zinc-500">Tabs style</legend>
        <label className="block text-xs">
          Tab look
          <select
            className="ugclab-select mt-1 text-sm"
            value={block.tabStyle ?? "underline"}
            onChange={(e) =>
              onChange({ tabStyle: e.target.value as HomeBlock["tabStyle"] })
            }
          >
            <option value="underline">Underline</option>
            <option value="pills">Pills</option>
            <option value="boxed">Boxed</option>
          </select>
        </label>
      </fieldset>
    );
  }

  if (block.type === "carousel") {
    return (
      <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
        <legend className="px-1 text-xs font-semibold text-zinc-500">Carousel</legend>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={block.carouselAutoplay === true}
            onChange={(e) => onChange({ carouselAutoplay: e.target.checked })}
          />
          Auto-scroll
        </label>
        {block.carouselAutoplay ? (
          <label className="block text-xs">
            Interval (seconds)
            <input
              type="number"
              min={2}
              max={30}
              className="ugclab-input mt-1 w-full text-sm"
              value={block.carouselIntervalSec ?? 5}
              onChange={(e) =>
                onChange({
                  carouselIntervalSec: Math.max(2, parseInt(e.target.value, 10) || 5),
                })
              }
            />
          </label>
        ) : null}
      </fieldset>
    );
  }

  if (block.type === "discount_popup") {
    return (
      <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
        <legend className="px-1 text-xs font-semibold text-zinc-500">Popup</legend>
        <label className="block text-xs">
          Delay (seconds)
          <input
            type="number"
            min={0}
            max={60}
            className="ugclab-input mt-1 w-full text-sm"
            value={block.popupDelaySec ?? 3}
            onChange={(e) =>
              onChange({ popupDelaySec: parseInt(e.target.value, 10) || 0 })
            }
          />
        </label>
      </fieldset>
    );
  }

  return null;
}

export function BodyRichTextField({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  const richTypes = new Set([
    "text_banner",
    "image_text",
    "cta",
    "columns",
    "features",
    "contact_form",
  ]);
  if (!richTypes.has(block.type)) return null;
  return (
    <label className="block text-xs">
      Body (rich text)
      <div className="mt-1">
        <RichTextEdit
          value={block.body}
          placeholder="Optional formatted text"
          onChange={(body) => onChange({ body })}
        />
      </div>
    </label>
  );
}
