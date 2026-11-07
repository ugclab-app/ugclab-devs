function mapQuery(parts: {
  name?: string | null;
  address1?: string | null;
  city?: string | null;
  postal?: string | null;
  country?: string | null;
}): string {
  return [parts.name, parts.address1, parts.city, parts.postal, parts.country]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function PickupMapEmbed({
  location,
  className = "",
}: {
  location: {
    name?: string | null;
    address1?: string | null;
    city?: string | null;
    postal?: string | null;
    country?: string | null;
  };
  className?: string;
}) {
  const q = mapQuery(location);
  if (!q) return null;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`;
  return (
    <div className={`overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 ${className}`}>
      <iframe
        title={`Map: ${location.name ?? q}`}
        src={src}
        className="h-48 w-full border-0 sm:h-56"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`}
        target="_blank"
        rel="noreferrer"
        className="block px-3 py-2 text-xs text-[var(--store-primary)] hover:underline"
      >
        Open in Maps
      </a>
    </div>
  );
}
