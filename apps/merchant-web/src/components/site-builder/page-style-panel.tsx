import type { BlockPadding, ScrollAnimation, StoreTheme } from "@ugclab/tenant/store-theme";
import { MediaPicker } from "@/components/media-picker";

export type PageStyleState = Pick<
  StoreTheme,
  "pageBgColor" | "pageBgImage" | "blockGap" | "scrollAnimation"
>;

export function PageStylePanel({
  style,
  onChange,
}: {
  style: PageStyleState;
  onChange: (patch: Partial<PageStyleState>) => void;
}) {
  return (
    <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Page style</p>
      <input type="hidden" name="pageBgColor" value={style.pageBgColor ?? ""} />
      <input type="hidden" name="pageBgImage" value={style.pageBgImage ?? ""} />
      <input type="hidden" name="blockGap" value={style.blockGap ?? "md"} />
      <input type="hidden" name="scrollAnimation" value={style.scrollAnimation ?? "none"} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          Page background
          <input
            type="color"
            className="mt-1 h-8 w-full"
            value={style.pageBgColor ?? "#ffffff"}
            onChange={(e) => onChange({ pageBgColor: e.target.value })}
          />
        </label>
        <label className="text-xs">
          Block spacing
          <select
            className="ugclab-select mt-1 text-sm"
            value={style.blockGap ?? "md"}
            onChange={(e) => onChange({ blockGap: e.target.value as BlockPadding })}
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </label>
        <label className="text-xs sm:col-span-2">
          Scroll animation
          <select
            className="ugclab-select mt-1 text-sm"
            value={style.scrollAnimation ?? "none"}
            onChange={(e) => onChange({ scrollAnimation: e.target.value as ScrollAnimation })}
          >
            <option value="none">None</option>
            <option value="fade">Fade in</option>
            <option value="slide">Slide up</option>
          </select>
        </label>
      </div>
      <label className="block text-xs">
        Background image URL
        <div className="mt-1 flex gap-2">
          <input
            className="ugclab-input flex-1 font-mono text-xs"
            value={style.pageBgImage ?? ""}
            onChange={(e) => onChange({ pageBgImage: e.target.value })}
            placeholder="https://…"
          />
          <MediaPicker onUploaded={(url) => onChange({ pageBgImage: url })} />
        </div>
      </label>
    </div>
  );
}
