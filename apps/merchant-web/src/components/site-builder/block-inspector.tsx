import type { ColumnItem, FaqItem, FeatureItem, HomeBlock, PricingItem } from "@ugclab/tenant/store-theme";
import { MediaPicker } from "@/components/media-picker";
import { BLOCK_CATALOG } from "./block-catalog";

export function BlockInspector({
  block,
  onChange,
}: {
  block: HomeBlock | null;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  if (!block) {
    return (
      <div className="p-5 text-sm text-zinc-500">
        Select a block on the canvas to edit its content and style.
      </div>
    );
  }

  const label = BLOCK_CATALOG.find((b) => b.type === block.type)?.label ?? block.type;

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Block</p>
        <h3 className="font-semibold text-zinc-900">{label}</h3>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-zinc-100 p-3">
        <legend className="px-1 text-xs font-semibold text-zinc-500">Layout</legend>
        <label className="block text-xs">
          Vertical padding
          <select
            className="ugclab-select mt-1 text-sm"
            value={block.paddingY ?? "md"}
            onChange={(e) =>
              onChange({ paddingY: e.target.value as HomeBlock["paddingY"] })
            }
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </label>
        <label className="block text-xs">
          Width
          <select
            className="ugclab-select mt-1 text-sm"
            value={block.contentWidth ?? "boxed"}
            onChange={(e) =>
              onChange({ contentWidth: e.target.value as "full" | "boxed" })
            }
          >
            <option value="boxed">Boxed</option>
            <option value="full">Full width</option>
          </select>
        </label>
        <label className="block text-xs">
          Text align
          <select
            className="ugclab-select mt-1 text-sm"
            value={block.align ?? "left"}
            onChange={(e) => onChange({ align: e.target.value as HomeBlock["align"] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Background
            <input
              type="color"
              className="mt-1 h-8 w-full"
              value={block.bgColor ?? "#ffffff"}
              onChange={(e) => onChange({ bgColor: e.target.value })}
            />
          </label>
          <label className="text-xs">
            Text color
            <input
              type="color"
              className="mt-1 h-8 w-full"
              value={block.textColor ?? "#18181b"}
              onChange={(e) => onChange({ textColor: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      {hasTextFields(block) ? (
        <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
          <legend className="px-1 text-xs font-semibold text-zinc-500">Content</legend>
          <TextField label="Title" value={block.title ?? ""} onChange={(title) => onChange({ title })} />
          <TextField
            label="Subtitle"
            value={block.subtitle ?? ""}
            onChange={(subtitle) => onChange({ subtitle })}
          />
          {block.type === "text_banner" ||
          block.type === "image_text" ||
          block.type === "discount_popup" ? (
            <label className="block text-xs">
              Body
              <textarea
                className="ugclab-input mt-1 text-sm"
                rows={2}
                value={block.body ?? ""}
                onChange={(e) => onChange({ body: e.target.value })}
              />
            </label>
          ) : null}
        </fieldset>
      ) : null}

      {(block.type === "hero" || block.type === "text_banner" || block.type === "image_text") && (
        <label className="block text-xs">
          Image URL
          <div className="mt-1 flex gap-2">
            <input
              className="ugclab-input flex-1 font-mono text-xs"
              value={block.imageUrl ?? ""}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
            />
            <MediaPicker onUploaded={(url) => onChange({ imageUrl: url })} />
          </div>
        </label>
      )}

      {block.type === "image_text" && (
        <label className="block text-xs">
          Image side
          <select
            className="ugclab-select mt-1 text-sm"
            value={block.imagePosition ?? "left"}
            onChange={(e) =>
              onChange({ imagePosition: e.target.value as "left" | "right" })
            }
          >
            <option value="left">Image left</option>
            <option value="right">Image right</option>
          </select>
        </label>
      )}

      {hasCta(block) ? (
        <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
          <legend className="px-1 text-xs font-semibold text-zinc-500">Button</legend>
          <TextField
            label="Label"
            value={block.ctaLabel ?? ""}
            onChange={(ctaLabel) => onChange({ ctaLabel })}
          />
          <TextField
            label="Link path"
            value={block.ctaPath ?? ""}
            onChange={(ctaPath) => onChange({ ctaPath })}
            mono
          />
        </fieldset>
      ) : null}

      {block.type === "hero" || block.type === "featured_collection" ? (
        <TextField
          label="Collection slug"
          value={block.collectionSlug ?? ""}
          onChange={(collectionSlug) => onChange({ collectionSlug })}
          mono
        />
      ) : null}

      {block.type === "video" && (
        <TextField
          label="Video URL"
          value={block.videoUrl ?? ""}
          onChange={(videoUrl) => onChange({ videoUrl })}
          mono
        />
      )}

      {block.type === "html" && (
        <label className="block text-xs">
          HTML
          <textarea
            className="ugclab-input mt-1 font-mono text-xs"
            rows={6}
            value={block.htmlContent ?? block.body ?? ""}
            onChange={(e) => onChange({ htmlContent: e.target.value, body: e.target.value })}
          />
        </label>
      )}

      {block.type === "spacer" && (
        <label className="block text-xs">
          Height (px)
          <input
            type="number"
            min={8}
            max={240}
            className="ugclab-input mt-1"
            value={block.spacerHeight ?? 48}
            onChange={(e) => onChange({ spacerHeight: parseInt(e.target.value, 10) || 48 })}
          />
        </label>
      )}

      {block.type === "faq" && (
        <FaqListEditor items={block.faqItems ?? []} onChange={(faqItems) => onChange({ faqItems })} />
      )}

      {block.type === "features" && (
        <FeaturesListEditor
          items={block.features ?? []}
          onChange={(features) => onChange({ features })}
        />
      )}

      {block.type === "gallery" && (
        <GalleryEditor urls={block.galleryUrls ?? []} onChange={(galleryUrls) => onChange({ galleryUrls })} />
      )}

      {block.type === "logos" && (
        <GalleryEditor label="Logo images" urls={block.logoUrls ?? []} onChange={(logoUrls) => onChange({ logoUrls })} />
      )}

      {block.type === "columns" && (
        <>
          <label className="block text-xs">
            Columns
            <select
              className="ugclab-select mt-1 text-sm"
              value={block.columnCount ?? 3}
              onChange={(e) =>
                onChange({ columnCount: parseInt(e.target.value, 10) as 2 | 3 | 4 })
              }
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <ColumnsEditor columns={block.columns ?? []} onChange={(columns) => onChange({ columns })} />
        </>
      )}

      {block.type === "pricing" && (
        <PricingEditor items={block.pricingItems ?? []} onChange={(pricingItems) => onChange({ pricingItems })} />
      )}

      {block.type === "map" && (
        <TextField
          label="Google Maps embed URL"
          value={block.mapEmbedUrl ?? ""}
          onChange={(mapEmbedUrl) => onChange({ mapEmbedUrl })}
          mono
        />
      )}

      {(block.type === "countdown" || block.type === "discount_popup") && (
        <label className="block text-xs">
          Countdown ends at
          <input
            type="datetime-local"
            className="ugclab-input mt-1 text-sm"
            value={toLocal(block.countdownEndsAt)}
            onChange={(e) =>
              onChange({
                countdownEndsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
          />
        </label>
      )}

      {block.type === "discount_popup" && (
        <>
          <TextField
            label="Promo code"
            value={block.discountCode ?? ""}
            onChange={(discountCode) => onChange({ discountCode })}
            mono
          />
          <label className="block text-xs">
            Show after (seconds)
            <input
              type="number"
              min={0}
              className="ugclab-input mt-1 text-sm"
              value={block.popupDelaySec ?? 3}
              onChange={(e) =>
                onChange({ popupDelaySec: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
          </label>
          <p className="text-xs text-zinc-500">
            Popup appears on all storefront pages after delay. Customers can dismiss with &quot;Don&apos;t show
            again&quot;.
          </p>
        </>
      )}
    </div>
  );
}

function toLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function hasTextFields(block: HomeBlock) {
  return ![
    "products",
    "new_arrivals",
    "sale",
    "reviews",
    "spacer",
    "divider",
    "gallery",
    "logos",
    "map",
  ].includes(block.type);
}

function hasCta(block: HomeBlock) {
  return ["hero", "text_banner", "cta", "image_text", "discount_popup"].includes(block.type);
}

function TextField({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block text-xs">
      {label}
      <input
        className={`ugclab-input mt-1 text-sm ${mono ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FaqListEditor({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  const rows = items.length ? items : [{ question: "", answer: "" }];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-500">FAQ items</p>
      {rows.map((item, i) => (
        <div key={i} className="space-y-1 rounded border border-zinc-100 p-2">
          <input
            className="ugclab-input text-sm"
            placeholder="Question"
            value={item.question}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...item, question: e.target.value };
              onChange(next.filter((x) => x.question.trim() || x.answer.trim()));
            }}
          />
          <textarea
            className="ugclab-input text-sm"
            rows={2}
            placeholder="Answer"
            value={item.answer}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...item, answer: e.target.value };
              onChange(next.filter((x) => x.question.trim() || x.answer.trim()));
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-violet-600"
        onClick={() => onChange([...rows, { question: "", answer: "" }])}
      >
        + Add
      </button>
    </div>
  );
}

function FeaturesListEditor({
  items,
  onChange,
}: {
  items: FeatureItem[];
  onChange: (items: FeatureItem[]) => void;
}) {
  const rows = items.length ? items : [{ title: "", text: "" }];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-500">Feature cards</p>
      {rows.map((item, i) => (
        <div key={i} className="space-y-1 rounded border border-zinc-100 p-2">
          <input
            className="ugclab-input text-sm"
            placeholder="Title"
            value={item.title}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...item, title: e.target.value };
              onChange(next.filter((x) => x.title.trim() || x.text.trim()));
            }}
          />
          <input
            className="ugclab-input text-sm"
            placeholder="Description"
            value={item.text}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...item, text: e.target.value };
              onChange(next.filter((x) => x.title.trim() || x.text.trim()));
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-violet-600"
        onClick={() => onChange([...rows, { title: "", text: "" }])}
      >
        + Add card
      </button>
    </div>
  );
}

function GalleryEditor({
  urls,
  onChange,
  label = "Images",
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}) {
  const list = urls.length ? urls : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500">{label}</p>
        <MediaPicker
          onUploaded={(url) => onChange([...list.filter(Boolean), url])}
        />
      </div>
      {list.map((url, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2">
            <input
              className="ugclab-input flex-1 font-mono text-xs"
              value={url}
              onChange={(e) => {
                const next = [...list];
                next[i] = e.target.value;
                onChange(next.filter(Boolean));
              }}
            />
            <button
              type="button"
              className="text-xs text-red-600"
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
          {url ? <img src={url} alt="" className="h-12 rounded object-cover" /> : null}
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-violet-600"
        onClick={() => onChange([...list, ""])}
      >
        + Add image
      </button>
    </div>
  );
}

function ColumnsEditor({
  columns,
  onChange,
}: {
  columns: ColumnItem[];
  onChange: (columns: ColumnItem[]) => void;
}) {
  const rows = columns.length ? columns : [{ title: "", text: "" }];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-500">Column content</p>
      {rows.map((col, i) => (
        <div key={i} className="space-y-1 rounded border border-zinc-100 p-2">
          <input
            className="ugclab-input text-sm"
            placeholder="Title"
            value={col.title ?? ""}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...col, title: e.target.value };
              onChange(next);
            }}
          />
          <textarea
            className="ugclab-input text-sm"
            rows={2}
            placeholder="Text"
            value={col.text ?? ""}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...col, text: e.target.value };
              onChange(next);
            }}
          />
          <div className="flex gap-2">
            <input
              className="ugclab-input flex-1 font-mono text-xs"
              placeholder="Image URL"
              value={col.imageUrl ?? ""}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...col, imageUrl: e.target.value };
                onChange(next);
              }}
            />
            <MediaPicker onUploaded={(url) => {
              const next = [...rows];
              next[i] = { ...col, imageUrl: url };
              onChange(next);
            }} />
          </div>
        </div>
      ))}
      <button type="button" className="text-xs text-violet-600" onClick={() => onChange([...rows, {}])}>
        + Add column
      </button>
    </div>
  );
}

function PricingEditor({
  items,
  onChange,
}: {
  items: PricingItem[];
  onChange: (items: PricingItem[]) => void;
}) {
  const rows = items.length ? items : [{ name: "", price: "" }];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-500">Plans</p>
      {rows.map((plan, i) => (
        <div key={i} className="space-y-1 rounded border border-zinc-100 p-2">
          <input
            className="ugclab-input text-sm"
            placeholder="Plan name"
            value={plan.name}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...plan, name: e.target.value };
              onChange(next.filter((x) => x.name.trim()));
            }}
          />
          <input
            className="ugclab-input text-sm"
            placeholder="Price ($49)"
            value={plan.price}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...plan, price: e.target.value };
              onChange(next);
            }}
          />
          <textarea
            className="ugclab-input text-xs"
            rows={2}
            placeholder="Features (one per line)"
            value={(plan.features ?? []).join("\n")}
            onChange={(e) => {
              const next = [...rows];
              next[i] = {
                ...plan,
                features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              };
              onChange(next);
            }}
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={plan.highlighted === true}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...plan, highlighted: e.target.checked };
                onChange(next);
              }}
            />
            Highlight plan
          </label>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-violet-600"
        onClick={() => onChange([...rows, { name: "", price: "" }])}
      >
        + Add plan
      </button>
    </div>
  );
}
