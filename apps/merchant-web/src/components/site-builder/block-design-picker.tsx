import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { BlockPickerThumb } from "./block-picker-thumb";
import {
  applyBlockDesignVariant,
  getBlockVariants,
  resolveDesignVariantId,
} from "./block-variants";

export function BlockDesignPicker({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  const variants = getBlockVariants(block.type);
  if (variants.length < 2) return null;

  const activeId = resolveDesignVariantId(block);

  return (
    <fieldset className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
      <legend className="px-1 text-xs font-semibold text-violet-700">Design</legend>
      <p className="text-[11px] leading-snug text-zinc-500">
        Switch layout preset. Your text and images are kept.
      </p>
      <div className="block-inspector-design-grid">
        {variants.map((variant) => {
          const isActive = variant.id === activeId;
          return (
            <button
              key={variant.id}
              type="button"
              className={`block-inspector-design-option${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => onChange(applyBlockDesignVariant(block, variant.id))}
            >
              <span className="block-inspector-design-preview">
                <BlockPickerThumb layout={variant.thumb} />
              </span>
              <span className="block-inspector-design-label">{variant.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
