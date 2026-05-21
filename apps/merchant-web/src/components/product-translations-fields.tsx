import { useState } from "react";
import { LOCALES } from "@/lib/constants";

export type ProductTranslations = Record<
  string,
  { title?: string; description?: string }
>;

export function ProductTranslationsFields({
  enabledLocales,
  initial,
}: {
  enabledLocales: string[];
  initial: ProductTranslations;
}) {
  const extra = enabledLocales.filter((l) => l !== "en" && !l.startsWith("_"));
  const [data, setData] = useState<ProductTranslations>(initial);

  if (extra.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Enable more languages in Settings → Store languages to add translations.
      </p>
    );
  }

  return (
    <section className="admin-card p-6 space-y-4">
      <h2 className="font-semibold text-zinc-900">Translations</h2>
      <input type="hidden" name="translations" value={JSON.stringify(data)} readOnly />
      {extra.map((locale) => {
        const label = LOCALES.find((l) => l.value === locale)?.label ?? locale;
        return (
          <div key={locale} className="rounded-lg border border-zinc-100 p-4 space-y-3">
            <p className="text-sm font-medium text-violet-700">{label}</p>
            <input
              placeholder="Translated title"
              value={data[locale]?.title ?? ""}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  [locale]: { ...d[locale], title: e.target.value },
                }))
              }
              className="ugclab-input"
            />
            <textarea
              placeholder="Translated description"
              rows={2}
              value={data[locale]?.description ?? ""}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  [locale]: { ...d[locale], description: e.target.value },
                }))
              }
              className="ugclab-input"
            />
          </div>
        );
      })}
    </section>
  );
}
