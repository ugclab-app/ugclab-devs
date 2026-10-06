/** Fixed PDP zones that always render on the live product page (not CMS blocks). */
export function ProductPageFixedChrome() {
  const zones = [
    { id: "reviews", label: "Reviews", hint: "Customer reviews for this product" },
    { id: "questions", label: "Q&A", hint: "Product questions & answers" },
    { id: "trust", label: "Trust strip", hint: "Store trust badges" },
    { id: "recent", label: "Recently viewed", hint: "Other products the shopper saw" },
  ] as const;

  return (
    <div className="site-builder-pdp-fixed" aria-hidden>
      {zones.map((z) => (
        <div key={z.id} className="site-builder-pdp-fixed-zone">
          <span className="site-builder-shell-label">{z.label}</span>
          <p className="site-builder-pdp-fixed-hint">{z.hint}</p>
        </div>
      ))}
    </div>
  );
}
