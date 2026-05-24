import type { HomeBlock } from "@ugclab/tenant/store-theme";

export function BlockStyleFields({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-zinc-100 p-3">
      <legend className="px-1 text-xs font-semibold text-zinc-500">Typography & visibility</legend>
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
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={block.hiddenOnMobile === true}
          onChange={(e) => onChange({ hiddenOnMobile: e.target.checked })}
        />
        Hide on mobile
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={block.hiddenOnDesktop === true}
          onChange={(e) => onChange({ hiddenOnDesktop: e.target.checked })}
        />
        Hide on desktop
      </label>
      <label className="block text-xs">
        Corner radius (px)
        <input
          type="number"
          min={0}
          max={48}
          className="ugclab-input mt-1 w-24"
          value={block.borderRadius ?? ""}
          onChange={(e) =>
            onChange({
              borderRadius: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
        />
      </label>
      <label className="block text-xs">
        Side margin (px)
        <input
          type="number"
          min={0}
          max={120}
          className="ugclab-input mt-1 w-24"
          value={block.marginX ?? ""}
          onChange={(e) =>
            onChange({ marginX: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
        />
      </label>
      <label className="block text-xs">
        Background gradient (CSS)
        <input
          className="ugclab-input mt-1 font-mono text-xs"
          value={block.bgGradient ?? ""}
          onChange={(e) => onChange({ bgGradient: e.target.value || undefined })}
          placeholder="linear-gradient(135deg, #7c3aed, #2563eb)"
        />
      </label>
      {(block.type === "products" ||
        block.type === "featured_collection" ||
        block.type === "new_arrivals" ||
        block.type === "sale") && (
        <>
          <label className="block text-xs">
            Max products
            <input
              type="number"
              min={1}
              max={48}
              className="ugclab-input mt-1 w-24"
              value={block.productLimit ?? ""}
              onChange={(e) =>
                onChange({
                  productLimit: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
            />
          </label>
          <label className="block text-xs">
            Columns
            <select
              className="ugclab-select mt-1 text-sm"
              value={block.productColumns ?? 4}
              onChange={(e) =>
                onChange({
                  productColumns: parseInt(e.target.value, 10) as 2 | 3 | 4,
                })
              }
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
        </>
      )}
    </fieldset>
  );
}
